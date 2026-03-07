import { CONFIG } from '../config.js';

export class CanvasManager {
  constructor(container) {
    this.container = container;
    this.videoElement = null;
    this.splatCanvas = null;
    this.gameCanvas = null;
    this.splatCtx = null;
    this.gameCtx = null;
  }

  init(width, height) {
    this.container.innerHTML = '';

    // Video element
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
    this.videoElement.style.transform = 'scaleX(-1)';
    this.videoElement.style.zIndex = '0';

    // Splatter canvas (persistent)
    this.splatCanvas = this.createCanvas(width, height, 1);
    this.splatCtx = this.splatCanvas.getContext('2d');

    // Game canvas (redrawn each frame)
    this.gameCanvas = this.createCanvas(width, height, 2);
    this.gameCtx = this.gameCanvas.getContext('2d');

    this.container.append(this.videoElement, this.splatCanvas, this.gameCanvas);
  }

  createCanvas(width, height, zIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.zIndex = zIndex;
    canvas.style.pointerEvents = 'none';
    canvas.style.transform = 'scaleX(-1)';
    return canvas;
  }

  setStream(stream) {
    this.videoElement.srcObject = stream;
  }

  clearGameCanvas() {
    this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
  }

  clearSplatCanvas() {
    this.splatCtx.clearRect(0, 0, this.splatCanvas.width, this.splatCanvas.height);
  }

  captureComposite() {
    const w = this.splatCanvas.width;
    const h = this.splatCanvas.height;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const ctx = tempCanvas.getContext('2d');

    // Draw mirrored video
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(this.videoElement, -w, 0, w, h);
    ctx.restore();

    // Draw splatters on top
    ctx.drawImage(this.splatCanvas, 0, 0);

    return tempCanvas.toDataURL('image/png');
  }

  /**
   * Capture raw webcam frame (no splatters). Stays in browser — never sent to server.
   */
  captureWebcamFrame() {
    const w = this.splatCanvas.width;
    const h = this.splatCanvas.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(this.videoElement, -w, 0, w, h);
    ctx.restore();

    return canvas.toDataURL('image/png');
  }

  /**
   * Capture scene canvas: splatters composited over a heavily blurred webcam (ambient map).
   * The blur (50px) makes the person unrecognizable — safe to send to server.
   */
  captureSceneCanvas() {
    const w = this.splatCanvas.width;
    const h = this.splatCanvas.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Draw mirrored video with extreme blur (ambient map)
    ctx.filter = 'blur(50px)';
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(this.videoElement, -w, 0, w, h);
    ctx.restore();
    ctx.filter = 'none';

    // Draw splatters on top of ambient map
    ctx.drawImage(this.splatCanvas, 0, 0);

    return canvas.toDataURL('image/png');
  }

  /**
   * Compose final AI art: overlay transformed canvas onto webcam with
   * style-specific blend mode and lighting.
   *
   * @param {string} webcamDataUrl - raw webcam frame (base64)
   * @param {string} transformedDataUrl - server-returned transformed canvas (object URL or base64)
   * @param {string} style - 'watercolor' | 'bollywood' | 'rangoli'
   * @returns {Promise<string>} - final AI art image as base64 PNG
   */
  async composeAIArt(webcamDataUrl, transformedDataUrl, style) {
    const webcamImg = await this._loadImage(webcamDataUrl);
    const transformedImg = await this._loadImage(transformedDataUrl);

    const w = webcamImg.width;
    const h = webcamImg.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Style-specific blend config (source of truth: CONFIG.BLEND_MODES)
    const blend = CONFIG.BLEND_MODES[style] || CONFIG.BLEND_MODES.watercolor;

    // Layer 0: webcam frame
    ctx.drawImage(webcamImg, 0, 0, w, h);

    // Layer 1: transformed canvas with blend mode
    ctx.globalCompositeOperation = blend.mode;
    ctx.globalAlpha = blend.opacity;
    ctx.drawImage(transformedImg, 0, 0, w, h);
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';

    // Layer 2: style-specific lighting overlay
    this._applyLighting(ctx, w, h, style);

    return canvas.toDataURL('image/png');
  }

  _applyLighting(ctx, w, h, style) {
    switch (style) {
      case 'watercolor': {
        // Warm golden hour: warm center, cool edges
        ctx.globalCompositeOperation = 'overlay';
        const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.15, w / 2, h / 2, w * 0.65);
        grad.addColorStop(0, 'rgba(255, 220, 150, 0.15)');
        grad.addColorStop(1, 'rgba(100, 130, 180, 0.10)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      case 'bollywood': {
        // Cinematic vignette + golden tint
        ctx.globalCompositeOperation = 'multiply';
        const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7);
        vig.addColorStop(0, 'rgba(255, 255, 255, 1)');
        vig.addColorStop(0.7, 'rgba(40, 20, 5, 0.6)');
        vig.addColorStop(1, 'rgba(10, 5, 0, 0.85)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = 'rgba(255, 180, 50, 0.12)';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      case 'rangoli': {
        // Vibrant saturation boost
        ctx.globalCompositeOperation = 'overlay';
        const rgrd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
        rgrd.addColorStop(0, 'rgba(255, 20, 147, 0.08)');
        rgrd.addColorStop(0.5, 'rgba(255, 200, 0, 0.06)');
        rgrd.addColorStop(1, 'rgba(138, 43, 226, 0.08)');
        ctx.fillStyle = rgrd;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
    }
  }

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  flashCapture() {
    const flash = document.createElement('div');
    flash.style.cssText = 'position:absolute;inset:0;background:white;z-index:99;opacity:0.8;pointer-events:none;';
    this.container.appendChild(flash);
    setTimeout(() => {
      flash.style.transition = 'opacity 0.3s';
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 300);
    }, 50);
  }
}
