import { CONFIG } from '../config.js';
import { BalloonSpawner } from './balloonSpawner.js';
import { CollisionDetector } from './collisionDetector.js';
import { ThrowEngine } from './throwEngine.js';
import { BalloonRenderer } from '../render/balloonRenderer.js';
import { SplatRenderer } from '../render/splatRenderer.js';
import { DripSimulator } from '../render/dripSimulator.js';
import { ParticleEffects } from '../render/particleEffects.js';

export class GameLoop {
  constructor({ poseTracker, handTracker, canvasManager, audioManager, scoreManager, beatDetector, onGameEnd, onEvent }) {
    this.poseTracker = poseTracker;
    this.handTracker = handTracker;
    this.canvasManager = canvasManager;
    this.audioManager = audioManager;
    this.scoreManager = scoreManager;
    this.beatDetector = beatDetector;
    this.onGameEnd = onGameEnd;
    this.onEvent = onEvent;

    this.spawner = new BalloonSpawner(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    this.collisionDetector = new CollisionDetector();
    this.throwEngine = new ThrowEngine();
    this.balloonRenderer = new BalloonRenderer();
    this.splatRenderer = new SplatRenderer();
    this.dripSimulator = new DripSimulator();
    this.particleEffects = new ParticleEffects();

    this.balloons = [];
    this.running = false;
    this.startTime = 0;
  }

  start() {
    this.running = true;
    this.startTime = Date.now();
    this.balloons = [];
    this.throwEngine.reset();
    this.requestFrame();
  }

  stop() {
    this.running = false;
  }

  requestFrame() {
    if (!this.running) return;
    requestAnimationFrame(() => this.tick());
  }

  tick() {
    if (!this.running) return;

    const elapsed = Date.now() - this.startTime;
    const timeLeft = CONFIG.GAME_DURATION_MS - elapsed;

    // Update timer display
    const timerEl = document.getElementById('timer-display');
    if (timerEl) timerEl.textContent = Math.max(0, Math.ceil(timeLeft / 1000));

    // Update score display
    const scoreEl = document.getElementById('score-display');
    if (scoreEl) scoreEl.textContent = `Score: ${this.scoreManager.score}`;

    // Check game end
    if (timeLeft <= 0) {
      this.running = false;
      this.scoreManager.calculateCoverage(this.canvasManager.splatCanvas);
      this.onGameEnd();
      return;
    }

    // Beat detection
    const beat = this.beatDetector.update();

    // Spawn balloons
    const newBalloon = this.spawner.update(elapsed, beat.isBeat);
    if (newBalloon && this.balloons.length < CONFIG.MAX_ACTIVE_BALLOONS) {
      this.balloons.push(newBalloon);
      this.scoreManager.onSpawn();
    }

    // Update balloon positions
    for (const b of this.balloons) {
      b.update();
    }

    // Update caught balloons
    const handStates = this.handTracker.getHandStates();
    this.throwEngine.update(handStates);

    // Get body box
    const bodyBox = this.poseTracker.getBodyBox();

    // Collision detection
    for (const balloon of this.balloons) {
      if (balloon.state !== 'active') continue;

      // Body collision
      const hitPoint = this.collisionDetector.checkBodyCollision(balloon, bodyBox);
      if (hitPoint) {
        balloon.state = 'hit';
        this.scoreManager.onHit();
        this.audioManager.playSFX('splat');

        this.splatRenderer.drawSplat(
          this.canvasManager.splatCtx, hitPoint.x, hitPoint.y,
          balloon.color, beat.intensity
        );
        this.dripSimulator.addDrip(hitPoint.x, hitPoint.y, balloon.color, CONFIG.CANVAS_WIDTH);
        this.particleEffects.spawnBurst(hitPoint.x, hitPoint.y, balloon.color);
        this.onEvent('SPLAT!', balloon.color);
        continue;
      }

      // Hand catch
      for (const side of ['left', 'right']) {
        if (this.collisionDetector.checkHandCatch(balloon, handStates[side])) {
          this.throwEngine.catchBalloon(balloon, side);
          this.audioManager.playSFX('pop');
          this.onEvent('CAUGHT!', '#FFD700');
          break;
        }
      }
    }

    // Check throws
    const throwCount = this.throwEngine.checkFlick(this.handTracker, handStates);
    if (throwCount > 0) {
      this.audioManager.playSFX('whoosh');
      this.scoreManager.onThrow();
      this.onEvent('+25 THROW!', '#00FF00');
    }

    // Remove dead balloons
    this.balloons = this.balloons.filter(b => {
      if (b.state === 'hit') return false;

      if (b.isOffScreen(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)) {
        if (b.state === 'active') this.scoreManager.onDodge();
        if (b.state === 'thrown') {
          this.particleEffects.spawnBurst(
            Math.max(0, Math.min(b.x, CONFIG.CANVAS_WIDTH)),
            Math.max(0, Math.min(b.y, CONFIG.CANVAS_HEIGHT)),
            b.color, 8
          );
        }
        return false;
      }
      return true;
    });

    // Update drips
    this.dripSimulator.update(this.canvasManager.splatCtx);

    // --- RENDER ---
    this.canvasManager.clearGameCanvas();
    const ctx = this.canvasManager.gameCtx;

    this.balloonRenderer.draw(ctx, this.balloons);
    this.particleEffects.update(ctx);

    this.requestFrame();
  }
}
