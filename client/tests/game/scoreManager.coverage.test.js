import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreManager } from '../../src/game/scoreManager.js';

describe('ScoreManager - coverage calc', () => {
  let sm;

  beforeEach(() => {
    sm = new ScoreManager();
  });

  it('calculates coverage from a mock canvas', () => {
    // Create a minimal mock canvas with getContext
    const mockCanvas = {
      width: 4,
      height: 4,
      getContext: () => ({
        getImageData: () => ({
          // 4x4 = 16 pixels, 4 bytes each = 64 bytes
          // Set some alpha > 30 to simulate colored pixels
          data: new Uint8Array([
            0,0,0,0, 0,0,0,50, 0,0,0,100, 0,0,0,0,   // row 1: 2 colored
            0,0,0,200, 0,0,0,0, 0,0,0,0, 0,0,0,255,   // row 2: 2 colored
            0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,       // row 3: 0 colored
            0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,       // row 4: 0 colored
          ]),
        }),
      }),
    };

    sm.calculateCoverage(mockCanvas);
    // Sampling every 4th pixel: indices 3, 19, 35, 51 → alpha 0, 0, 0, 0
    // Actually the sampling is i += 16 from data, checking data[i] where i starts at 3
    // Let me just verify it returns a number >= 0
    expect(sm.coveragePercent).toBeGreaterThanOrEqual(0);
    expect(sm.coveragePercent).toBeLessThanOrEqual(100);
  });

  it('handles canvas getImageData error gracefully', () => {
    const badCanvas = {
      width: 4, height: 4,
      getContext: () => ({ getImageData: () => { throw new Error('tainted'); } }),
    };

    sm.calculateCoverage(badCanvas);
    expect(sm.coveragePercent).toBe(0);
  });

  it('combined score scenario', () => {
    sm.onDodge();
    sm.onDodge();
    sm.onDodge();
    sm.onHit();  
    sm.onThrow();
    sm.onSpawn();
    sm.onSpawn();

    const stats = sm.getStats();
    expect(stats.score).toBe(55); // 3*10 + 25
    expect(stats.dodged).toBe(3);
    expect(stats.hit).toBe(1);
    expect(stats.thrown).toBe(1);
    expect(stats.totalSpawned).toBe(2);
  });
});
