import { describe, it, expect } from 'vitest';
import { Balloon } from '../../src/game/balloon.js';

describe('Balloon', () => {
  it('creates with correct initial properties', () => {
    const b = new Balloon({ x: 100, y: 200, vx: 3, vy: 4, radius: 15, color: '#FF00FF' });
    expect(b.x).toBe(100);
    expect(b.y).toBe(200);
    expect(b.vx).toBe(3);
    expect(b.vy).toBe(4);
    expect(b.radius).toBe(15);
    expect(b.color).toBe('#FF00FF');
    expect(b.state).toBe('active');
    expect(b.opacity).toBe(1);
    expect(b.attachedHand).toBeNull();
  });

  it('has a unique id', () => {
    const b1 = new Balloon({ x: 0, y: 0, vx: 1, vy: 1, radius: 10, color: '#FFF' });
    const b2 = new Balloon({ x: 0, y: 0, vx: 1, vy: 1, radius: 10, color: '#FFF' });
    expect(b1.id).not.toBe(b2.id);
  });

  describe('update()', () => {
    it('moves active balloon by velocity and grows radius', () => {
      const b = new Balloon({ x: 100, y: 100, vx: 5, vy: -3, radius: 15, color: '#F00' });
      b.update();
      expect(b.x).toBe(105);
      expect(b.y).toBe(97);
      expect(b.radius).toBeCloseTo(15.3);
    });

    it('moves thrown balloon by velocity without growing', () => {
      const b = new Balloon({ x: 100, y: 100, vx: 10, vy: 10, radius: 20, color: '#F00' });
      b.state = 'thrown';
      b.update();
      expect(b.x).toBe(110);
      expect(b.y).toBe(110);
      expect(b.radius).toBe(20); // no growth
    });

    it('does not move caught balloon', () => {
      const b = new Balloon({ x: 100, y: 100, vx: 5, vy: 5, radius: 15, color: '#F00' });
      b.state = 'caught';
      b.update();
      expect(b.x).toBe(100);
      expect(b.y).toBe(100);
    });

    it('does not move hit balloon', () => {
      const b = new Balloon({ x: 100, y: 100, vx: 5, vy: 5, radius: 15, color: '#F00' });
      b.state = 'hit';
      b.update();
      expect(b.x).toBe(100);
      expect(b.y).toBe(100);
    });
  });

  describe('isOffScreen()', () => {
    it('returns false when balloon is on screen', () => {
      const b = new Balloon({ x: 640, y: 360, vx: 0, vy: 0, radius: 20, color: '#F00' });
      expect(b.isOffScreen(1280, 720)).toBe(false);
    });

    it('returns true when balloon is far left', () => {
      const b = new Balloon({ x: -100, y: 360, vx: 0, vy: 0, radius: 20, color: '#F00' });
      expect(b.isOffScreen(1280, 720)).toBe(true);
    });

    it('returns true when balloon is far right', () => {
      const b = new Balloon({ x: 1400, y: 360, vx: 0, vy: 0, radius: 20, color: '#F00' });
      expect(b.isOffScreen(1280, 720)).toBe(true);
    });

    it('returns true when balloon is far above', () => {
      const b = new Balloon({ x: 640, y: -100, vx: 0, vy: 0, radius: 20, color: '#F00' });
      expect(b.isOffScreen(1280, 720)).toBe(true);
    });

    it('returns true when balloon is far below', () => {
      const b = new Balloon({ x: 640, y: 900, vx: 0, vy: 0, radius: 20, color: '#F00' });
      expect(b.isOffScreen(1280, 720)).toBe(true);
    });

    it('returns false when balloon is just at edge (within radius buffer)', () => {
      const b = new Balloon({ x: -10, y: 360, vx: 0, vy: 0, radius: 20, color: '#F00' });
      expect(b.isOffScreen(1280, 720)).toBe(false); // -10 > -40 (radius*2)
    });
  });
});
