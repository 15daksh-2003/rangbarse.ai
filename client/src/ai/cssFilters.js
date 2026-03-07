export class CSSFilters {
  async apply(base64Image, style) {
    const img = await this.loadImage(base64Image);
    const w = img.width;
    const h = img.height;

    // Work canvas
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    switch (style) {
      case 'watercolor':
        await this.watercolor(ctx, img, w, h);
        break;
      case 'bollywood':
        await this.bollywood(ctx, img, w, h);
        break;
      case 'rangoli':
        await this.rangoli(ctx, img, w, h);
        break;
      default:
        ctx.drawImage(img, 0, 0);
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * Watercolor: Multi-pass blur + color bleeding + paper texture + splashy color overlays
   */
  async watercolor(ctx, img, w, h) {
    // Pass 1: Heavily blurred base for "wet paint" feel
    ctx.filter = 'blur(4px) saturate(2.2) brightness(1.1)';
    ctx.drawImage(img, 0, 0);

    // Pass 2: Overlay original with reduced opacity for detail preservation
    ctx.filter = 'blur(1px) saturate(1.5)';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(img, 0, 0);
    ctx.globalAlpha = 1;
    ctx.filter = 'none';

    // Pass 3: Warm paper texture overlay
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = 'rgba(255, 240, 210, 0.4)';
    ctx.fillRect(0, 0, w, h);

    // Pass 4: Add colorful Holi splashes using color overlay
    const holiColors = [
      'rgba(255, 20, 147, 0.15)',  // pink
      'rgba(255, 165, 0, 0.12)',   // orange
      'rgba(0, 255, 255, 0.1)',    // cyan
      'rgba(255, 255, 0, 0.1)',    // yellow
      'rgba(138, 43, 226, 0.12)',  // purple
    ];

    ctx.globalCompositeOperation = 'overlay';
    for (const color of holiColors) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const r = w * (0.3 + Math.random() * 0.4);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // Pass 5: Subtle edge darkening for watercolor paper feel
    ctx.globalCompositeOperation = 'multiply';
    const edgeGrad = ctx.createRadialGradient(w/2, h/2, w*0.25, w/2, h/2, w*0.7);
    edgeGrad.addColorStop(0, 'rgba(255,255,255,1)');
    edgeGrad.addColorStop(1, 'rgba(220,200,180,1)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, 0, w, h);

    // Pass 6: Paint drip streaks
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 8; i++) {
      const sx = Math.random() * w;
      ctx.fillStyle = holiColors[i % holiColors.length].replace(/[\d.]+\)$/, '0.3)');
      ctx.fillRect(sx, 0, 3 + Math.random() * 6, h);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
  }

  /**
   * Bollywood: High drama — golden glow, vignette, lens flare, filmy color grading
   */
  async bollywood(ctx, img, w, h) {
    // Pass 1: Base with dramatic contrast + warm tint
    ctx.filter = 'contrast(1.5) saturate(1.8) brightness(1.05)';
    ctx.drawImage(img, 0, 0);
    ctx.filter = 'none';

    // Pass 2: Golden warm overlay (Bollywood signature look)
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(255, 180, 50, 0.2)';
    ctx.fillRect(0, 0, w, h);

    // Pass 3: Dramatic color pops — Holi powder bursts
    const burstColors = [
      { color: 'rgba(255, 0, 100, 0.18)', x: w*0.2, y: h*0.3 },
      { color: 'rgba(255, 200, 0, 0.15)', x: w*0.8, y: h*0.2 },
      { color: 'rgba(0, 200, 255, 0.12)', x: w*0.5, y: h*0.7 },
      { color: 'rgba(180, 0, 255, 0.14)', x: w*0.15, y: h*0.8 },
      { color: 'rgba(0, 255, 100, 0.1)', x: w*0.85, y: h*0.6 },
    ];

    ctx.globalCompositeOperation = 'screen';
    for (const burst of burstColors) {
      const r = w * 0.35;
      const grad = ctx.createRadialGradient(burst.x, burst.y, 0, burst.x, burst.y, r);
      grad.addColorStop(0, burst.color);
      grad.addColorStop(0.6, burst.color.replace(/[\d.]+\)$/, '0.05)'));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // Pass 4: Center lens flare
    ctx.globalCompositeOperation = 'screen';
    const flareGrad = ctx.createRadialGradient(w*0.55, h*0.35, 0, w*0.55, h*0.35, w*0.3);
    flareGrad.addColorStop(0, 'rgba(255, 240, 200, 0.25)');
    flareGrad.addColorStop(0.3, 'rgba(255, 200, 100, 0.1)');
    flareGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = flareGrad;
    ctx.fillRect(0, 0, w, h);

    // Pass 5: Heavy vignette
    ctx.globalCompositeOperation = 'multiply';
    const vignette = ctx.createRadialGradient(w/2, h/2, w*0.25, w/2, h/2, w*0.65);
    vignette.addColorStop(0, 'rgba(255,255,255,1)');
    vignette.addColorStop(0.7, 'rgba(60,30,10,0.7)');
    vignette.addColorStop(1, 'rgba(20,5,0,0.9)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * Rangoli: Kaleidoscopic symmetry + ultra-saturated + geometric mandala overlay
   */
  async rangoli(ctx, img, w, h) {
    // Pass 1: Ultra-saturated base
    ctx.filter = 'saturate(2.5) contrast(1.3) brightness(1.05)';
    ctx.drawImage(img, 0, 0);
    ctx.filter = 'none';

    // Pass 2: Create mirror symmetry (rangoli-like)
    // Horizontal mirror blend
    ctx.globalAlpha = 0.25;
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;

    // Pass 3: Geometric mandala ring overlay
    ctx.globalCompositeOperation = 'overlay';
    const cx = w / 2;
    const cy = h / 2;
    const rings = [w*0.4, w*0.3, w*0.2, w*0.12];
    const ringColors = ['rgba(255,20,147,0.12)', 'rgba(255,200,0,0.1)', 'rgba(0,220,255,0.1)', 'rgba(100,255,0,0.1)'];

    rings.forEach((r, idx) => {
      ctx.strokeStyle = ringColors[idx];
      ctx.lineWidth = 3 + idx;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Petal shapes around ring
      const petalCount = 8 + idx * 4;
      for (let i = 0; i < petalCount; i++) {
        const angle = (Math.PI * 2 * i) / petalCount;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        ctx.beginPath();
        ctx.arc(px, py, 6 + idx * 3, 0, Math.PI * 2);
        ctx.fillStyle = ringColors[(idx + i) % ringColors.length];
        ctx.fill();
      }
    });

    // Pass 4: Color field overlays for vibrancy
    ctx.globalCompositeOperation = 'color-dodge';
    ctx.globalAlpha = 0.06;
    const quadrants = [
      { x: 0, y: 0, color: '#FF1493' },
      { x: w/2, y: 0, color: '#00FFFF' },
      { x: 0, y: h/2, color: '#FFD700' },
      { x: w/2, y: h/2, color: '#00FF00' },
    ];
    for (const q of quadrants) {
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x, q.y, w/2, h/2);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = src;
    });
  }
}
