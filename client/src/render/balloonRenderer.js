export class BalloonRenderer {
  draw(ctx, balloons) {
    for (const b of balloons) {
      if (b.state === 'hit' || b.state === 'missed') continue;

      ctx.save();
      ctx.globalAlpha = b.opacity;

      // Balloon body with gradient
      const gradient = ctx.createRadialGradient(
        b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.1,
        b.x, b.y, b.radius
      );
      gradient.addColorStop(0, this.lighten(b.color, 60));
      gradient.addColorStop(0.7, b.color);
      gradient.addColorStop(1, this.darken(b.color, 30));

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Shine highlight
      ctx.beginPath();
      ctx.arc(b.x - b.radius * 0.25, b.y - b.radius * 0.25, b.radius * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();

      // Caught indicator
      if (b.state === 'caught') {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  lighten(hex, amount) {
    const rgb = this.hexToRgb(hex);
    return `rgb(${Math.min(255, rgb.r + amount)}, ${Math.min(255, rgb.g + amount)}, ${Math.min(255, rgb.b + amount)})`;
  }

  darken(hex, amount) {
    const rgb = this.hexToRgb(hex);
    return `rgb(${Math.max(0, rgb.r - amount)}, ${Math.max(0, rgb.g - amount)}, ${Math.max(0, rgb.b - amount)})`;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 255, g: 0, b: 255 };
  }
}
