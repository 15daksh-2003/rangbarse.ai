export class AudioManager {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.gainNode = null;
    this.musicSource = null;
    this.sfxBuffers = {};
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.connect(this.audioCtx.destination);

    // Pre-load SFX (with fallback for missing files)
    const sfxFiles = {
      splat: '/assets/audio/splat.wav',
      pop: '/assets/audio/pop.wav',
      whoosh: '/assets/audio/whoosh.wav',
      cheer: '/assets/audio/holi-hai-cheer.wav',
    };

    for (const [name, url] of Object.entries(sfxFiles)) {
      try {
        this.sfxBuffers[name] = await this.loadAudio(url);
      } catch {
        // Generate a simple tone as fallback
        this.sfxBuffers[name] = this.generateTone(name);
      }
    }

    this.initialized = true;
  }

  async loadAudio(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Audio load failed: ${url}`);
    const arrayBuffer = await response.arrayBuffer();
    return this.audioCtx.decodeAudioData(arrayBuffer);
  }

  generateTone(type) {
    // Generate a simple synthesized sound as fallback
    const sampleRate = this.audioCtx.sampleRate;
    const duration = type === 'cheer' ? 1.0 : 0.15;
    const length = sampleRate * duration;
    const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const freq = type === 'splat' ? 150 : type === 'pop' ? 400 : type === 'whoosh' ? 200 : 300;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.max(0, 1 - t / duration);
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
    }

    return buffer;
  }

  async playMusic(url) {
    if (!this.audioCtx) return;

    try {
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const buffer = await this.loadAudio(url);
      this.musicSource = this.audioCtx.createBufferSource();
      this.musicSource.buffer = buffer;
      this.musicSource.loop = true;
      this.musicSource.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.musicSource.start();
    } catch {
      console.warn('Music playback failed — game will work without it');
    }
  }

  stopMusic() {
    if (this.musicSource) {
      try { this.musicSource.stop(); } catch {}
      this.musicSource = null;
    }
  }

  playSFX(name) {
    if (!this.audioCtx || !this.sfxBuffers[name]) return;

    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const source = this.audioCtx.createBufferSource();
      source.buffer = this.sfxBuffers[name];
      source.connect(this.gainNode);
      source.start();
    } catch {}
  }

  getAnalyser() {
    return this.analyser;
  }
}
