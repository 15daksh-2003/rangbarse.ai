import { CONFIG } from '../config.js';
import { Balloon } from './balloon.js';

export class BalloonSpawner {
  constructor(cw, ch) {
    this.cw = cw;
    this.ch = ch;
    this.patternIndex = 0;
    this.activePattern = CONFIG.PATTERNS[0];
    this.lastPatternSwitch = 0;
    this.lastSpawnTime = 0;
  }

  update(elapsedMs, isBeat) {
    // Rotate pattern
    if (elapsedMs - this.lastPatternSwitch >= CONFIG.PATTERN_ROTATE_INTERVAL_MS) {
      this.patternIndex = (this.patternIndex + 1) % CONFIG.PATTERNS.length;
      this.activePattern = CONFIG.PATTERNS[this.patternIndex];
      this.lastPatternSwitch = elapsedMs;
    }

    const interval = isBeat ? CONFIG.BALLOON_SPAWN_INTERVAL_BEAT_MS : CONFIG.BALLOON_SPAWN_INTERVAL_MS;

    if (elapsedMs - this.lastSpawnTime >= interval) {
      this.lastSpawnTime = elapsedMs;
      return this.spawn(elapsedMs);
    }
    return null;
  }

  spawn(elapsedMs) {
    const color = this.getColorForTime(elapsedMs);
    const params = this.getSpawnParams();
    return new Balloon({ ...params, color });
  }

  getSpawnParams() {
    const speed = CONFIG.BALLOON_SPEED_MIN + Math.random() * (CONFIG.BALLOON_SPEED_MAX - CONFIG.BALLOON_SPEED_MIN);

    switch (this.activePattern) {
      case 'EDGES_IN': {
        // Spawn from random edge, fly INWARD toward center area (but offset)
        // This gives the user time to see and dodge
        const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
        let x, y, targetX, targetY;

        switch (edge) {
          case 0: // top
            x = Math.random() * this.cw; y = -20;
            break;
          case 1: // right
            x = this.cw + 20; y = Math.random() * this.ch;
            break;
          case 2: // bottom
            x = Math.random() * this.cw; y = this.ch + 20;
            break;
          default: // left
            x = -20; y = Math.random() * this.ch;
            break;
        }

        // Aim toward center zone with some randomness
        targetX = this.cw * (0.3 + Math.random() * 0.4);
        targetY = this.ch * (0.2 + Math.random() * 0.5);
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        return {
          x, y,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: CONFIG.BALLOON_RADIUS_MIN + Math.random() * 10,
        };
      }
      case 'TOP_RAIN': {
        return {
          x: Math.random() * this.cw, y: -20,
          vx: (Math.random() - 0.5) * 2,
          vy: CONFIG.BALLOON_SPEED_MIN + Math.random() * 3,
          radius: CONFIG.BALLOON_RADIUS_MIN + Math.random() * 15,
        };
      }
      case 'SIDE_SWEEP': {
        const fromLeft = Math.random() > 0.5;
        return {
          x: fromLeft ? -20 : this.cw + 20,
          y: Math.random() * this.ch * 0.8,
          vx: (fromLeft ? 1 : -1) * (CONFIG.BALLOON_SPEED_MIN + Math.random() * 3),
          vy: (Math.random() - 0.3) * 2,
          radius: CONFIG.BALLOON_RADIUS_MIN + Math.random() * 10,
        };
      }
      case 'SPIRAL': {
        // Spawn from corners, spiral inward
        const corner = Math.floor(Math.random() * 4);
        const corners = [
          { x: 0, y: 0 }, { x: this.cw, y: 0 },
          { x: this.cw, y: this.ch }, { x: 0, y: this.ch },
        ];
        const c = corners[corner];
        // Aim toward center with slight angular offset for spiral feel
        const targetX = this.cw / 2 + (Math.random() - 0.5) * this.cw * 0.3;
        const targetY = this.ch / 2 + (Math.random() - 0.5) * this.ch * 0.3;
        const dx = targetX - c.x;
        const dy = targetY - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Add perpendicular component for spiral motion
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const spiralAmount = 0.3;

        return {
          x: c.x, y: c.y,
          vx: (dx / dist + perpX * spiralAmount) * speed,
          vy: (dy / dist + perpY * spiralAmount) * speed,
          radius: CONFIG.BALLOON_RADIUS_MIN,
        };
      }
      default:
        return { x: -20, y: Math.random() * this.ch, vx: speed, vy: 0, radius: CONFIG.BALLOON_RADIUS_MIN };
    }
  }

  getColorForTime(elapsedMs) {
    for (const phase of CONFIG.COLOR_PHASES) {
      if (elapsedMs >= phase.start && elapsedMs < phase.end) {
        return phase.palette[Math.floor(Math.random() * phase.palette.length)];
      }
    }
    return '#FF00FF';
  }
}
