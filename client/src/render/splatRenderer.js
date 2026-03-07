import { CONFIG } from '../config.js';

export class SplatRenderer {
  /**
   * Draw a procedural splatter on the persistent splatter canvas.
   * Size scales proportionally to canvas dimensions for consistent UX
   * across different screen sizes.
   */
  drawSplat(ctx, x, y, color, beatIntensity = 0) {
    // Scale splatter size relative to canvas width (bigger screen = bigger splat)
    const scaleFactor = ctx.canvas.width / 1280; // 1.0 at 1280px, larger on bigger canvases
    const minSize = CONFIG.SPLATTER_SIZE_MIN * scaleFactor;
    const maxSize = CONFIG.SPLATTER_SIZE_MAX * scaleFactor;

    const baseSize = minSize + Math.random() * (maxSize - minSize);
    const size = baseSize * (1 + beatIntensity * 0.5);

    ctx.save();

    // Main splatter blob
    ctx.globalAlpha = CONFIG.SPLATTER_OPACITY;
    ctx.fillStyle = color;

    // Central blob — larger proportion for more visible impact
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Surrounding blobs for organic look
    const blobCount = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < blobCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * size * 0.55;
      const blobR = size * (0.1 + Math.random() * 0.25);

      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        blobR, 0, Math.PI * 2
      );
      ctx.fill();
    }

    // Outer splatter dots radiating outward
    const dotCount = 5 + Math.floor(Math.random() * 6);
    for (let i = 0; i < dotCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = size * (0.5 + Math.random() * 0.6);
      const dotR = (3 + Math.random() * 6) * scaleFactor;

      ctx.globalAlpha = CONFIG.SPLATTER_OPACITY * 0.6;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        dotR, 0, Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
  }
}
