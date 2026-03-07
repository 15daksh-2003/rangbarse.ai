import { CONFIG } from '../config.js';

export class HandTracker {
  constructor() {
    this.hands = null;
    this.handResults = [];
    this.leftHand = { isOpen: false, palmPos: { x: 0, y: 0 }, prevPalmPos: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
    this.rightHand = { isOpen: false, palmPos: { x: 0, y: 0 }, prevPalmPos: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
    this.ready = false;
    this.processing = false;
  }

  async init(videoElement) {
    if (!window.Hands) {
      await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
    }

    this.hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 0,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults((results) => this.onResults(results));

    try {
      await this.hands.initialize();
      console.log('[HandTracker] Initialized');
    } catch (e) {
      console.warn('[HandTracker] initialize() not available, will init on first send');
    }
    this.ready = true;
  }

  async processFrame(video) {
    if (!this.ready || !this.hands || this.processing) return;
    this.processing = true;
    try {
      await this.hands.send({ image: video });
    } catch (e) {
      // Silently ignore
    }
    this.processing = false;
  }

  onResults(results) {
    this.handResults = results.multiHandLandmarks || [];
    const handedness = results.multiHandedness || [];

    // Reset state
    this.leftHand.prevPalmPos = { ...this.leftHand.palmPos };
    this.rightHand.prevPalmPos = { ...this.rightHand.palmPos };

    let foundLeft = false;
    let foundRight = false;

    for (let i = 0; i < this.handResults.length; i++) {
      const landmarks = this.handResults[i];
      const label = handedness[i]?.label || 'Right';

      const palmPos = this.computePalmCenter(landmarks);
      const isOpen = this.isOpenPalm(landmarks);

      // MediaPipe mirrors labels, so swap
      if (label === 'Left') {
        this.rightHand.palmPos = palmPos;
        this.rightHand.isOpen = isOpen;
        this.rightHand.velocity = {
          x: palmPos.x - this.rightHand.prevPalmPos.x,
          y: palmPos.y - this.rightHand.prevPalmPos.y,
        };
        foundRight = true;
      } else {
        this.leftHand.palmPos = palmPos;
        this.leftHand.isOpen = isOpen;
        this.leftHand.velocity = {
          x: palmPos.x - this.leftHand.prevPalmPos.x,
          y: palmPos.y - this.leftHand.prevPalmPos.y,
        };
        foundLeft = true;
      }
    }

    if (!foundLeft) this.leftHand.isOpen = false;
    if (!foundRight) this.rightHand.isOpen = false;
  }

  computePalmCenter(landmarks) {
    const wrist = landmarks[0];
    const indexMcp = landmarks[5];
    const pinkyMcp = landmarks[17];

    return {
      x: ((wrist.x + indexMcp.x + pinkyMcp.x) / 3) * CONFIG.CANVAS_WIDTH,
      y: ((wrist.y + indexMcp.y + pinkyMcp.y) / 3) * CONFIG.CANVAS_HEIGHT,
    };
  }

  isOpenPalm(landmarks) {
    const wrist = landmarks[0];
    let extended = 0;

    // Check 4 fingers: index(8), middle(12), ring(16), pinky(20)
    for (const tipIdx of [8, 12, 16, 20]) {
      const mcpIdx = tipIdx - 2;
      const tipDist = this.dist(landmarks[tipIdx], wrist);
      const mcpDist = this.dist(landmarks[mcpIdx], wrist);
      if (tipDist > mcpDist * 1.2) extended++;
    }

    return extended >= 3;
  }

  detectFlick(hand) {
    const speed = Math.sqrt(hand.velocity.x ** 2 + hand.velocity.y ** 2);
    if (speed > CONFIG.FLICK_VELOCITY_THRESHOLD) {
      return {
        isFlick: true,
        direction: { x: hand.velocity.x / speed, y: hand.velocity.y / speed },
      };
    }
    return { isFlick: false, direction: { x: 0, y: 0 } };
  }

  getHandStates() {
    return { left: this.leftHand, right: this.rightHand };
  }

  dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}
