import { CONFIG } from '../config.js';

export class ScoreManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.dodged = 0;
    this.hit = 0;
    this.thrown = 0;
    this.totalSpawned = 0;
    this.coveragePercent = 0;
  }

  onDodge() { this.dodged++; this.score += CONFIG.SCORE_DODGE; }
  onHit() { this.hit++; }
  onThrow() { this.thrown++; this.score += CONFIG.SCORE_THROW; }
  onSpawn() { this.totalSpawned++; }

  calculateCoverage(splatCanvas) {
    try {
      const ctx = splatCanvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, splatCanvas.width, splatCanvas.height);
      const data = imageData.data;
      let colored = 0;
      const total = data.length / 4;

      for (let i = 3; i < data.length; i += 16) { // Sample every 4th pixel for speed
        if (data[i] > 30) colored++;
      }

      this.coveragePercent = Math.round((colored / (total / 4)) * 100);
    } catch (e) {
      this.coveragePercent = 0;
    }
  }

  getStats() {
    return {
      score: this.score,
      dodged: this.dodged,
      hit: this.hit,
      thrown: this.thrown,
      totalSpawned: this.totalSpawned,
      coveragePercent: this.coveragePercent,
    };
  }
}
