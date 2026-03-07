import { CONFIG } from '../config.js';

export class DripSimulator {
  constructor() {
    this.drips = [];
  }

  addDrip(x, y, color, canvasWidth = 1280) {
    const scale = canvasWidth / 1280;
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      this.drips.push({
        x: x + (Math.random() - 0.5) * 30 * scale,
        y,
        color,
        speed: (CONFIG.DRIP_SPEED + Math.random() * 0.3) * scale,
        length: 0,
        maxLength: (30 + Math.random() * CONFIG.DRIP_LENGTH_MAX) * scale,
        width: (3 + Math.random() * 4) * scale,
        opacity: 0.3 + Math.random() * 0.3,
      });
    }
  }

  update(ctx) {
    this.drips = this.drips.filter(drip => {
      drip.length += drip.speed;
      if (drip.length >= drip.maxLength) return false;

      ctx.save();
      ctx.globalAlpha = drip.opacity * (1 - drip.length / drip.maxLength);
      ctx.fillStyle = drip.color;
      ctx.fillRect(drip.x - drip.width / 2, drip.y, drip.width, drip.length);
      ctx.restore();

      return true;
    });
  }
}
