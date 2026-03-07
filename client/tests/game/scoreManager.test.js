import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreManager } from '../../src/game/scoreManager.js';

describe('ScoreManager', () => {
  let sm;

  beforeEach(() => {
    sm = new ScoreManager();
  });

  it('starts with zero scores', () => {
    const stats = sm.getStats();
    expect(stats.score).toBe(0);
    expect(stats.dodged).toBe(0);
    expect(stats.hit).toBe(0);
    expect(stats.thrown).toBe(0);
  });

  it('adds 10 points per dodge', () => {
    sm.onDodge();
    sm.onDodge();
    expect(sm.getStats().score).toBe(20);
    expect(sm.getStats().dodged).toBe(2);
  });

  it('adds 25 points per throw', () => {
    sm.onThrow();
    expect(sm.getStats().score).toBe(25);
    expect(sm.getStats().thrown).toBe(1);
  });

  it('tracks hits without adding points', () => {
    sm.onHit();
    sm.onHit();
    sm.onHit();
    expect(sm.getStats().score).toBe(0);
    expect(sm.getStats().hit).toBe(3);
  });

  it('resets all stats', () => {
    sm.onDodge();
    sm.onHit();
    sm.onThrow();
    sm.reset();
    const stats = sm.getStats();
    expect(stats.score).toBe(0);
    expect(stats.dodged).toBe(0);
    expect(stats.hit).toBe(0);
    expect(stats.thrown).toBe(0);
  });

  it('tracks total spawned', () => {
    sm.onSpawn();
    sm.onSpawn();
    sm.onSpawn();
    expect(sm.getStats().totalSpawned).toBe(3);
  });
});
