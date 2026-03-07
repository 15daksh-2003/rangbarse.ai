import { CONFIG } from '../config.js';

export class PoseTracker {
  constructor() {
    this.pose = null;
    this.landmarks = null;
    this.bodyBox = { x: 0, y: 0, width: 0, height: 0 };
    this.ready = false;
    this.processing = false;
  }

  async init(videoElement) {
    // Load MediaPipe Pose from CDN
    if (!window.Pose) {
      await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');
    }

    this.pose = new window.Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    this.pose.setOptions({
      modelComplexity: 0, // Lite for speed
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.pose.onResults((results) => this.onResults(results));

    // Initialize model by sending a warm-up frame
    try {
      await this.pose.initialize();
      console.log('[PoseTracker] Initialized');
    } catch (e) {
      console.warn('[PoseTracker] initialize() not available, will init on first send');
    }
    this.ready = true;
  }

  async processFrame(video) {
    if (!this.ready || !this.pose || this.processing) return;
    this.processing = true;
    try {
      await this.pose.send({ image: video });
    } catch (e) {
      // Silently ignore frame processing errors
    }
    this.processing = false;
  }

  onResults(results) {
    if (!results.poseLandmarks) {
      this.landmarks = null;
      return;
    }

    this.landmarks = results.poseLandmarks;

    // Compute body bounding box from key landmarks
    const nose = this.landmarks[0];
    const lShoulder = this.landmarks[11];
    const rShoulder = this.landmarks[12];
    const lHip = this.landmarks[23];
    const rHip = this.landmarks[24];

    const w = CONFIG.CANVAS_WIDTH;
    const h = CONFIG.CANVAS_HEIGHT;
    const pad = CONFIG.BODY_HITBOX_PADDING;

    const minX = Math.min(lShoulder.x, rShoulder.x) * w - pad;
    const maxX = Math.max(lShoulder.x, rShoulder.x) * w + pad;
    const minY = nose.y * h - pad;
    const maxY = Math.max(lHip.y, rHip.y) * h + pad;

    this.bodyBox = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  getBodyBox() {
    return this.bodyBox;
  }

  hasDetection() {
    return this.landmarks !== null;
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}
