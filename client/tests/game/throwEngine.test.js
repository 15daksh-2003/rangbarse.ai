import { describe, it, expect, beforeEach } from 'vitest';
import { ThrowEngine } from '../../src/game/throwEngine.js';
import { Balloon } from '../../src/game/balloon.js';

describe('ThrowEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new ThrowEngine();
  });

  it('starts with no caught balloons', () => {
    expect(engine.caughtBalloons.size).toBe(0);
  });

  describe('catchBalloon()', () => {
    it('sets balloon state to caught and stores it', () => {
      const b = new Balloon({ x: 100, y: 100, vx: 5, vy: 5, radius: 15, color: '#F00' });
      engine.catchBalloon(b, 'left');
      expect(b.state).toBe('caught');
      expect(b.attachedHand).toBe('left');
      expect(engine.caughtBalloons.size).toBe(1);
    });
  });

  describe('update()', () => {
    it('moves caught balloon to hand position', () => {
      const b = new Balloon({ x: 100, y: 100, vx: 5, vy: 5, radius: 15, color: '#F00' });
      engine.catchBalloon(b, 'left');

      engine.update({
        left: { palmPos: { x: 300, y: 400 } },
        right: { palmPos: { x: 0, y: 0 } },
      });

      expect(b.x).toBe(300);
      expect(b.y).toBe(400);
    });
  });

  describe('checkFlick()', () => {
    it('releases balloon on flick and sets thrown state', () => {
      const b = new Balloon({ x: 100, y: 100, vx: 0, vy: 0, radius: 15, color: '#F00' });
      engine.catchBalloon(b, 'left');

      const mockTracker = {
        detectFlick: () => ({ isFlick: true, direction: { x: 1, y: 0 } }),
      };

      const count = engine.checkFlick(mockTracker, {
        left: { palmPos: { x: 300, y: 400 } },
        right: { palmPos: { x: 0, y: 0 } },
      });

      expect(count).toBe(1);
      expect(b.state).toBe('thrown');
      expect(b.vx).toBe(12);
      expect(b.vy).toBe(0);
      expect(engine.caughtBalloons.size).toBe(0);
    });

    it('keeps balloon caught when no flick detected', () => {
      const b = new Balloon({ x: 100, y: 100, vx: 0, vy: 0, radius: 15, color: '#F00' });
      engine.catchBalloon(b, 'right');

      const mockTracker = {
        detectFlick: () => ({ isFlick: false, direction: { x: 0, y: 0 } }),
      };

      const count = engine.checkFlick(mockTracker, {
        left: { palmPos: { x: 0, y: 0 } },
        right: { palmPos: { x: 200, y: 200 } },
      });

      expect(count).toBe(0);
      expect(b.state).toBe('caught');
      expect(engine.caughtBalloons.size).toBe(1);
    });
  });

  describe('reset()', () => {
    it('clears all caught balloons', () => {
      const b = new Balloon({ x: 0, y: 0, vx: 0, vy: 0, radius: 10, color: '#F00' });
      engine.catchBalloon(b, 'left');
      expect(engine.caughtBalloons.size).toBe(1);
      engine.reset();
      expect(engine.caughtBalloons.size).toBe(0);
    });
  });
});
