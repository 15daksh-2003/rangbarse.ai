import { CONFIG } from './config.js';
import { CanvasManager } from './render/canvasManager.js';
import { PoseTracker } from './vision/poseTracker.js';
import { HandTracker } from './vision/handTracker.js';
import { GameLoop } from './game/gameLoop.js';
import { ScoreManager } from './game/scoreManager.js';
import { AudioManager } from './audio/audioManager.js';
import { BeatDetector } from './audio/beatDetector.js';
import { AIClient } from './ai/aiClient.js';
import { SpeechRecognitionWrapper } from './utils/speechRecognition.js';
import { HoliCardComposer } from './ui/holiCardComposer.js';
import { HealthMonitor } from './utils/healthMonitor.js';
import { Logger } from './utils/logger.js';

const STATES = {
  LANDING: 'LANDING',
  READY: 'READY',
  PLAYING: 'PLAYING',
  CAPTURE: 'CAPTURE',
  PHOTO_PICKER: 'PHOTO_PICKER',
  STYLE_PICKER: 'STYLE_PICKER',
  GENERATING: 'GENERATING',
  RESULT: 'RESULT',
};

const log = new Logger('App');

class App {
  constructor() {
    this.state = STATES.LANDING;
    this.canvasManager = new CanvasManager(document.getElementById('canvas-stack'));
    this.poseTracker = new PoseTracker();
    this.handTracker = new HandTracker();
    this.scoreManager = new ScoreManager();
    this.audioManager = new AudioManager();
    this.aiClient = new AIClient();
    this.speechRecognition = new SpeechRecognitionWrapper();
    this.cardComposer = new HoliCardComposer();

    this.gameLoop = null;
    this.beatDetector = null;
    this.capturedFrame = null;
    this.aiResultUrl = null;
    this.snapshotsRemaining = CONFIG.MAX_MID_GAME_SNAPSHOTS;
    this.snapshots = [];

    // Health monitor — polls GPU status every 15s
    this.healthMonitor = new HealthMonitor((gpuAvailable) => {
      this.updateGPUStatus(gpuAvailable);
    });
    this.healthMonitor.start(15000);

    this.bindUI();
    log.info('App initialized');
  }

  updateGPUStatus(available) {
    const dot = document.getElementById('gpu-dot');
    const label = document.getElementById('gpu-label');
    dot.className = `gpu-dot ${available ? 'online' : 'offline'}`;
    label.textContent = available ? 'AI Ready' : 'AI-Lite';
    this.showToast(available
      ? '✅ GPU server connected — AI art enabled'
      : '⚠️ GPU server offline — using stylized filters');
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  bindUI() {
    document.getElementById('btn-start').addEventListener('click', () => this.requestCamera());
    document.getElementById('btn-play').addEventListener('click', () => this.showRules());
    document.getElementById('btn-start-game').addEventListener('click', () => this.startGame());
    document.getElementById('btn-capture').addEventListener('click', () => this.onCapture());
    document.getElementById('btn-snapshot').addEventListener('click', () => this.onMidGameSnapshot());
    document.getElementById('btn-play-again').addEventListener('click', () => this.playAgain());
    document.getElementById('btn-download').addEventListener('click', () => this.downloadCard());

    document.querySelectorAll('.style-card').forEach(card => {
      card.addEventListener('click', () => this.onStyleSelected(card.dataset.style));
    });
  }

  showRules() {
    document.getElementById('btn-play').style.display = 'none';
    this.showOverlay('rules-overlay');
  }

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
  }

  showOverlay(overlayId) {
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
    if (overlayId) {
      document.getElementById(overlayId).classList.remove('hidden');
    }
  }

  async requestCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: CONFIG.CANVAS_WIDTH }, height: { ideal: CONFIG.CANVAS_HEIGHT }, facingMode: 'user' },
        audio: false,
      });

      this.canvasManager.init(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
      this.canvasManager.setStream(stream);

      // Wait for video to actually be ready
      await new Promise((resolve) => {
        const video = this.canvasManager.videoElement;
        if (video.readyState >= 2) { resolve(); return; }
        video.addEventListener('loadeddata', resolve, { once: true });
      });
      console.log('[App] Camera ready');

      // Initialize MediaPipe trackers (loads WASM models)
      console.log('[App] Loading MediaPipe models...');
      await this.poseTracker.init(this.canvasManager.videoElement);
      await this.handTracker.init(this.canvasManager.videoElement);
      console.log('[App] MediaPipe models loaded');

      // Start MediaPipe processing loop
      this.startVisionLoop();

      this.transition(STATES.READY);
    } catch (err) {
      alert('Camera access is required to play! Please allow camera access and refresh.');
      console.error('Camera error:', err);
    }
  }

  startVisionLoop() {
    const video = this.canvasManager.videoElement;
    let frameCount = 0;
    
    const processFrame = async () => {
      if (video.readyState >= 2) {
        // Alternate between pose and hands each frame for performance
        if (frameCount % 2 === 0) {
          await this.poseTracker.processFrame(video);
        } else {
          await this.handTracker.processFrame(video);
        }
        frameCount++;
      }
      requestAnimationFrame(processFrame);
    };
    requestAnimationFrame(processFrame);
  }

  transition(newState) {
    this.state = newState;

    switch (newState) {
      case STATES.READY:
        this.showScreen('game-container');
        this.showOverlay(null);
        document.getElementById('btn-play').classList.remove('hidden');
        document.getElementById('btn-play').style.display = '';
        document.getElementById('snapshot-bar').classList.add('hidden');
        break;

      case STATES.PLAYING:
        document.getElementById('btn-play').style.display = 'none';
        document.getElementById('snapshot-bar').classList.remove('hidden');
        this.showOverlay(null);
        break;

      case STATES.CAPTURE:
        document.getElementById('snapshot-bar').classList.add('hidden');
        this.showOverlay('capture-overlay');
        break;

      case STATES.PHOTO_PICKER:
        this.showOverlay('photo-picker');
        break;

      case STATES.STYLE_PICKER:
        this.showOverlay('style-picker');
        break;

      case STATES.GENERATING:
        this.showOverlay('loading-screen');
        break;

      case STATES.RESULT:
        this.showOverlay(null);
        this.showScreen('result-screen');
        break;
    }
  }

  startGame() {
    this.showOverlay(null); // Hide rules overlay
    this.scoreManager.reset();
    this.canvasManager.clearSplatCanvas();
    this.snapshotsRemaining = CONFIG.MAX_MID_GAME_SNAPSHOTS;
    this.snapshots = [];
    this.capturedFrame = null;
    this.webcamFrame = null;
    this.aiResultUrl = null;

    this.updateSnapshotUI();

    // Init audio
    this.audioManager.init().then(() => {
      this.audioManager.playMusic('/assets/audio/dhol-holi-dj.mp3').catch(() => {
        console.warn('Could not play music (user interaction might be needed)');
      });
      this.beatDetector = new BeatDetector(this.audioManager.getAnalyser());
    }).catch(err => {
      console.warn('Audio init failed:', err);
      this.beatDetector = { update: () => ({ isBeat: false, intensity: 0 }) };
    });

    if (!this.beatDetector) {
      this.beatDetector = { update: () => ({ isBeat: false, intensity: 0 }) };
    }

    this.gameLoop = new GameLoop({
      poseTracker: this.poseTracker,
      handTracker: this.handTracker,
      canvasManager: this.canvasManager,
      audioManager: this.audioManager,
      scoreManager: this.scoreManager,
      beatDetector: this.beatDetector,
      onGameEnd: () => this.endGame(),
      onEvent: (text, color) => this.showEventText(text, color),
    });

    this.transition(STATES.PLAYING);
    this.gameLoop.start();
  }

  endGame() {
    this.audioManager.stopMusic();

    // Auto-capture final frame
    this.capturedFrame = this.canvasManager.captureComposite();
    this.webcamFrame = this.canvasManager.captureWebcamFrame();

    // Try voice recognition for bonus effect
    const supported = this.speechRecognition.init(() => {
      // Voice triggered! Play cheer
      this.audioManager.playSFX('cheer');
      this.showEventText('HOLI HAI! 🎉', '#FFD700');
    });

    if (supported) {
      this.speechRecognition.start();
      document.getElementById('voice-indicator').classList.remove('hidden');
    }

    this.transition(STATES.CAPTURE);

    // Auto-proceed after 8 seconds regardless
    setTimeout(() => {
      if (this.state === STATES.CAPTURE) {
        this.onCapture();
      }
    }, 8000);
  }

  onCapture() {
    this.speechRecognition.stop();
    if (!this.capturedFrame) {
      this.capturedFrame = this.canvasManager.captureComposite();
      this.webcamFrame = this.canvasManager.captureWebcamFrame();
    }

    // If user took mid-game snapshots, show photo picker
    if (this.snapshots.length > 0) {
      this.buildPhotoPicker();
      this.transition(STATES.PHOTO_PICKER);
    } else {
      // No mid-game snapshots, go straight to style picker
      this.transition(STATES.STYLE_PICKER);
    }
  }

  buildPhotoPicker() {
    const grid = document.getElementById('photo-grid');
    grid.innerHTML = '';

    // All candidates: mid-game snapshots + final capture
    const allPhotos = [...this.snapshots, this.capturedFrame];
    const labels = [
      ...this.snapshots.map((_, i) => `Snap ${i + 1}`),
      'Final Frame',
    ];

    allPhotos.forEach((dataUrl, i) => {
      const card = document.createElement('button');
      card.className = 'photo-card';
      card.innerHTML = `
        <img src="${dataUrl}" alt="${labels[i]}" />
        <span class="photo-label">${labels[i]}</span>
      `;
      card.addEventListener('click', () => this.onPhotoSelected(dataUrl));
      grid.appendChild(card);
    });
  }

  onPhotoSelected(dataUrl) {
    this.capturedFrame = dataUrl;
    this.transition(STATES.STYLE_PICKER);
  }

  onMidGameSnapshot() {
    if (this.state !== STATES.PLAYING || this.snapshotsRemaining <= 0) return;

    this.snapshotsRemaining--;
    const snapshot = this.canvasManager.captureComposite();
    this.snapshots.push(snapshot);
    this.updateSnapshotUI();

    // Flash effect
    this.canvasManager.flashCapture();
    this.showEventText('📸 SNAP!', '#FFFFFF');
  }

  updateSnapshotUI() {
    const countEl = document.getElementById('snapshot-count');
    countEl.textContent = `${this.snapshotsRemaining} left`;
    document.getElementById('btn-snapshot').disabled = this.snapshotsRemaining <= 0;
  }

  async onStyleSelected(style) {
    this.transition(STATES.GENERATING);
    this.startEngagement();

    const stats = this.scoreManager.getStats();

    try {
      // Send scene canvas (splatters on ambient map) — webcam stays in browser
      const sceneCanvas = this.canvasManager.captureSceneCanvas();
      const result = await this.aiClient.generate(sceneCanvas, style, stats.coveragePercent);

      // Compose final image: overlay transformed canvas onto webcam with style-specific blend
      this.aiResultUrl = await this.canvasManager.composeAIArt(
        this.webcamFrame, result.imageUrl, style
      );

      if (result.tier === 'AI-Lite (CSS)' && result.reason) {
        this.showToast(`⚠️ ${result.reason}. Using stylized filters instead.`);
      }
    } catch (err) {
      log.error('AI generation failed:', err);
      this.aiResultUrl = this.capturedFrame;
      this.showToast('⚠️ Art generation failed. Showing original photo.');
    }

    this.onAIReady();
  }

  // --- Engagement during AI generation ---

  startEngagement() {
    const stats = this.scoreManager.getStats();
    this.factsInterval = null;
    this.aiReady = false;

    // Reset ready prompt
    document.getElementById('art-ready-prompt').classList.remove('visible');
    document.getElementById('art-ready-prompt').classList.add('hidden');
    document.getElementById('holi-personality').classList.remove('visible');
    document.getElementById('holi-personality').classList.add('hidden');

    // Bind "View Result" button
    const viewBtn = document.getElementById('btn-view-result');
    viewBtn.onclick = () => this.showResult();

    // 1. Animated score reveal (stagger each stat)
    const reveals = [
      { id: 'reveal-dodged', value: stats.dodged },
      { id: 'reveal-hit', value: stats.hit },
      { id: 'reveal-thrown', value: stats.thrown },
      { id: 'reveal-coverage', value: stats.coveragePercent, suffix: '%' },
    ];

    reveals.forEach((item, i) => {
      const el = document.getElementById(item.id);
      el.classList.remove('visible');
      const valueEl = el.querySelector('.reveal-value');
      valueEl.textContent = '0' + (item.suffix || '');

      setTimeout(() => {
        el.classList.add('visible');
        this.countUp(valueEl, item.value, item.suffix || '', 800);
      }, 300 + i * 500);
    });

    // 2. Holi Personality (after stats finish)
    setTimeout(() => {
      const personality = this.getHoliPersonality(stats);
      document.getElementById('personality-emoji').textContent = personality.emoji;
      document.getElementById('personality-title').textContent = personality.title;
      const persEl = document.getElementById('holi-personality');
      persEl.classList.remove('hidden');
      setTimeout(() => persEl.classList.add('visible'), 50);
    }, 2800);

    // 3. Fun facts carousel
    const facts = [
      'Holi is celebrated in over 17 countries worldwide!',
      'The colors used in Holi are called "Gulal" — traditionally made from flowers.',
      'In Mathura, Holi celebrations last for 16 days straight!',
      'Holi marks the arrival of spring and the end of winter.',
      'The bonfire night before Holi is called "Holika Dahan".',
      'In Vrindavan, widows break tradition and play Holi with flowers.',
      'The largest Holi celebration outside India happens in Utah, USA!',
      'Legend says Lord Krishna started the tradition of playing with colors.',
      'In Bengal, Holi is known as "Dol Jatra" or "Dol Purnima".',
      'Traditional Holi colors were made from Neem, Turmeric, and Palash flowers.',
      'Bhang (a cannabis-based drink) is traditionally consumed during Holi.',
      'Lathmar Holi in Barsana features women playfully hitting men with sticks!',
    ];

    let factIndex = 0;
    const factEl = document.getElementById('fun-fact-text');
    factEl.textContent = facts[0];

    setTimeout(() => {
      this.factsInterval = setInterval(() => {
        if (this.aiReady) return; // Stop rotating when ready
        factEl.style.opacity = '0';
        setTimeout(() => {
          factIndex = (factIndex + 1) % facts.length;
          factEl.textContent = facts[factIndex];
          factEl.style.opacity = '0.7';
        }, 400);
      }, 4000);
    }, 3500);
  }

  countUp(el, target, suffix, duration) {
    const start = performance.now();
    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  getHoliPersonality(stats) {
    const total = stats.dodged + stats.hit;
    if (total === 0) return { emoji: '🎭', title: 'The Spectator' };

    const dodgeRate = stats.dodged / Math.max(1, total);
    const throwRate = stats.thrown / Math.max(1, total);

    if (stats.score > 500 && dodgeRate > 0.5)
      return { emoji: '👑', title: 'The Holi Legend' };
    if (dodgeRate > 0.7)
      return { emoji: '⚡', title: 'The Lightning Dodger' };
    if (throwRate > 0.3)
      return { emoji: '🎯', title: 'The Color Warrior' };
    if (stats.coveragePercent > 60)
      return { emoji: '🌈', title: 'The Living Canvas' };
    if (stats.hit > 30)
      return { emoji: '💥', title: 'The Gulal Magnet' };
    return { emoji: '🎨', title: 'The Holi Enthusiast' };
  }

  onAIReady() {
    this.aiReady = true;

    // Stop facts rotation
    if (this.factsInterval) {
      clearInterval(this.factsInterval);
      this.factsInterval = null;
    }

    // Graceful transition: show "ready" prompt
    const prompt = document.getElementById('art-ready-prompt');
    prompt.classList.remove('hidden');
    // Small delay so user notices the transition
    setTimeout(() => prompt.classList.add('visible'), 100);

    // Fade out the loading spinner
    const spinner = document.querySelector('.loading-spinner');
    if (spinner) spinner.style.opacity = '0.3';
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) loadingText.style.opacity = '0';
  }

  showResult() {
    // Clean up engagement
    if (this.factsInterval) { clearInterval(this.factsInterval); this.factsInterval = null; }
    const spinner = document.querySelector('.loading-spinner');
    if (spinner) spinner.style.opacity = '1';
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) loadingText.style.opacity = '0.8';

    const stats = this.scoreManager.getStats();

    // Set images
    document.getElementById('result-original').src = this.capturedFrame;
    document.getElementById('result-ai').src = this.aiResultUrl;

    // Set stats
    document.getElementById('stats-display').textContent =
      `🎯 Score: ${stats.score} | 🏃 Dodged: ${stats.dodged} | 💥 Hit: ${stats.hit} | 🎨 Coverage: ${stats.coveragePercent}%`;

    this.transition(STATES.RESULT);
  }

  async downloadCard() {
    const stats = this.scoreManager.getStats();
    try {
      const cardDataUrl = await this.cardComposer.compose(
        this.capturedFrame, this.aiResultUrl, stats
      );
      const link = document.createElement('a');
      link.href = cardDataUrl;
      link.download = 'rangbarse-holi-card.png';
      link.click();
    } catch (err) {
      console.error('Card generation failed:', err);
      // Fallback: download AI image directly
      const link = document.createElement('a');
      link.href = this.aiResultUrl;
      link.download = 'rangbarse-holi-art.png';
      link.click();
    }
  }

  playAgain() {
    this.transition(STATES.READY);
  }

  showEventText(text, color) {
    const el = document.getElementById('event-text');
    el.textContent = text;
    el.style.color = color;
    el.classList.remove('hidden');
    // Re-trigger animation
    el.style.animation = 'none';
    el.offsetHeight; // force reflow
    el.style.animation = '';
    setTimeout(() => el.classList.add('hidden'), 600);
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
