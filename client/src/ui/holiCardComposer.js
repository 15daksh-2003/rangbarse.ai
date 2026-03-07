import { CONFIG } from '../config.js';

export class HoliCardComposer {
  /**
   * Compose a downloadable Holi card image.
   * Layout: gradient bg → AI art (hero) → before/after thumbnails → stats → branding
   */
  async compose(originalImage, aiImageUrl, stats) {
    const aiImg = await this.loadImage(aiImageUrl);
    const origImg = await this.loadImage(originalImage);

    const canvas = document.createElement('canvas');
    canvas.width = CONFIG.CARD_WIDTH;
    canvas.height = CONFIG.CARD_HEIGHT;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#FF6B35');
    bgGrad.addColorStop(0.5, '#FF1493');
    bgGrad.addColorStop(1, '#8B00FF');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.font = 'bold 64px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Happy Holi!', canvas.width / 2, 90);

    // AI Art (hero, top section)
    const artY = 140;
    const artW = 940;
    const artH = 730;
    this.drawRoundedImage(ctx, aiImg, (canvas.width - artW) / 2, artY, artW, artH, 20);

    // Before/After side-by-side thumbnails
    const thumbY = artY + artH + 40;
    const thumbW = 440;
    const thumbH = 340;

    ctx.font = 'bold 20px Poppins, sans-serif';
    ctx.fillStyle = '#FFFFFF';

    ctx.fillText('Reality', canvas.width * 0.27, thumbY);
    this.drawRoundedImage(ctx, origImg, 40, thumbY + 10, thumbW, thumbH, 12);

    ctx.fillText('AI Art', canvas.width * 0.73, thumbY);
    this.drawRoundedImage(ctx, aiImg, canvas.width - thumbW - 40, thumbY + 10, thumbW, thumbH, 12);

    // Stats
    const statsY = thumbY + thumbH + 55;
    ctx.font = '20px Poppins, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(
      `Score: ${stats.score}  |  Dodged: ${stats.dodged}  |  Hit: ${stats.hit}  |  Coverage: ${stats.coveragePercent}%`,
      canvas.width / 2, statsY
    );

    // Branding footer
    ctx.font = 'bold 18px Poppins, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('RangBarse.ai', canvas.width / 2, canvas.height - 30);

    return canvas.toDataURL('image/png');
  }

  drawRoundedImage(ctx, img, x, y, w, h, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.clip();
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  }

  loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        const c = document.createElement('canvas');
        c.width = 400; c.height = 400;
        const ctx2 = c.getContext('2d');
        ctx2.fillStyle = '#333';
        ctx2.fillRect(0, 0, 400, 400);
        ctx2.fillStyle = '#fff';
        ctx2.font = '20px sans-serif';
        ctx2.textAlign = 'center';
        ctx2.fillText('Image unavailable', 200, 200);
        const placeholder = new Image();
        placeholder.onload = () => resolve(placeholder);
        placeholder.src = c.toDataURL();
      };
      img.src = src;
    });
  }
}
