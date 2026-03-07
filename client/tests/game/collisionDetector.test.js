import { describe, it, expect } from 'vitest';
import { CollisionDetector } from '../../src/game/collisionDetector.js';

describe('CollisionDetector', () => {
  const detector = new CollisionDetector();

  describe('checkBodyCollision', () => {
    const bodyBox = { x: 100, y: 100, width: 200, height: 300 };

    it('detects collision when balloon overlaps body box', () => {
      const balloon = { x: 200, y: 200, radius: 20 };
      const hit = detector.checkBodyCollision(balloon, bodyBox);
      expect(hit).not.toBeNull();
      expect(hit).toHaveProperty('x');
      expect(hit).toHaveProperty('y');
    });

    it('returns null when balloon is far from body', () => {
      const balloon = { x: 500, y: 500, radius: 10 };
      const hit = detector.checkBodyCollision(balloon, bodyBox);
      expect(hit).toBeNull();
    });

    it('detects edge collision', () => {
      const balloon = { x: 95, y: 200, radius: 10 }; // just touching left edge
      const hit = detector.checkBodyCollision(balloon, bodyBox);
      expect(hit).not.toBeNull();
    });

    it('handles zero-size body box', () => {
      const balloon = { x: 100, y: 100, radius: 10 };
      const hit = detector.checkBodyCollision(balloon, { x: 0, y: 0, width: 0, height: 0 });
      expect(hit).toBeNull();
    });
  });

  describe('checkHandCatch', () => {
    it('detects catch when open palm is near balloon', () => {
      const balloon = { x: 200, y: 200, radius: 20 };
      const hand = { isOpen: true, palmPos: { x: 210, y: 205 } };
      expect(detector.checkHandCatch(balloon, hand)).toBe(true);
    });

    it('rejects catch when palm is closed', () => {
      const balloon = { x: 200, y: 200, radius: 20 };
      const hand = { isOpen: false, palmPos: { x: 200, y: 200 } };
      expect(detector.checkHandCatch(balloon, hand)).toBe(false);
    });

    it('rejects catch when palm is too far', () => {
      const balloon = { x: 200, y: 200, radius: 20 };
      const hand = { isOpen: true, palmPos: { x: 500, y: 500 } };
      expect(detector.checkHandCatch(balloon, hand)).toBe(false);
    });
  });
});
