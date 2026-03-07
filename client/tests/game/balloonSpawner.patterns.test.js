import { describe, it, expect, beforeEach } from 'vitest';
import { BalloonSpawner } from '../../src/game/balloonSpawner.js';

describe('BalloonSpawner - pattern rotation & all patterns', () => {
  let spawner;

  beforeEach(() => {
    spawner = new BalloonSpawner(1280, 720);
  });

  it('rotates pattern after interval', () => {
    const first = spawner.activePattern;
    // Simulate time passing beyond rotation interval
    spawner.update(8000, false); // 8s > 7.5s interval
    expect(spawner.activePattern).not.toBe(first);
  });

  it('spawns with TOP_RAIN pattern', () => {
    spawner.activePattern = 'TOP_RAIN';
    const b = spawner.spawn(5000);
    expect(b.y).toBe(-20); // Top edge
    expect(b.vy).toBeGreaterThan(0); // Falls down
  });

  it('spawns with SIDE_SWEEP pattern', () => {
    spawner.activePattern = 'SIDE_SWEEP';
    const b = spawner.spawn(5000);
    // Should spawn at left or right edge
    expect(b.x === -20 || b.x === 1300).toBe(true);
  });

  it('spawns with SPIRAL pattern', () => {
    spawner.activePattern = 'SPIRAL';
    const b = spawner.spawn(5000);
    // Should spawn from corners
    const corners = [[0,0], [1280,0], [1280,720], [0,720]];
    const atCorner = corners.some(([cx, cy]) => b.x === cx && b.y === cy);
    expect(atCorner).toBe(true);
  });

  it('handles unknown pattern with default spawn', () => {
    spawner.activePattern = 'UNKNOWN';
    const b = spawner.spawn(5000);
    expect(b).toBeDefined();
    expect(b.x).toBe(-20);
  });

  it('respects spawn interval timing', () => {
    // First spawn at t=400 (meets the 400ms interval from t=0)
    const b1 = spawner.update(400, false);
    expect(b1).not.toBeNull();

    const b2 = spawner.update(500, false);
    expect(b2).toBeNull(); // Too soon (100ms < 400ms)

    const b3 = spawner.update(900, false);
    expect(b3).not.toBeNull(); // 500ms since last spawn
  });

  it('spawns faster on beat', () => {
    spawner.update(0, false); // Reset lastSpawnTime
    const b = spawner.update(250, true); // 250ms > 200ms beat interval
    expect(b).not.toBeNull();
  });

  it('cycles through all 4 patterns', () => {
    const seen = new Set();
    for (let t = 0; t < 40000; t += 8000) {
      spawner.update(t, false);
      seen.add(spawner.activePattern);
    }
    expect(seen.size).toBe(4);
  });
});
