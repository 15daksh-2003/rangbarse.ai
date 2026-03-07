import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameLoop } from '../../src/game/gameLoop.js';

// Mock requestAnimationFrame
vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => setTimeout(cb, 0)));

// Mock document for DOM queries in tick()
vi.stubGlobal('document', {
  getElementById: vi.fn(() => ({ textContent: '' })),
  createElement: vi.fn(() => ({})),
});

describe('GameLoop', () => {
  let gameLoop;
  let mocks;

  beforeEach(() => {
    mocks = {
      poseTracker: { getBodyBox: vi.fn(() => ({ x: 300, y: 200, width: 200, height: 300 })) },
      handTracker: {
        getHandStates: vi.fn(() => ({
          left: { x: 0, y: 0, open: false },
          right: { x: 0, y: 0, open: false },
        })),
      },
      canvasManager: {
        clearGameCanvas: vi.fn(),
        gameCtx: {
          clearRect: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
        },
        splatCtx: {},
        splatCanvas: { width: 1280, height: 720 },
      },
      audioManager: { playSFX: vi.fn() },
      scoreManager: {
        score: 0,
        onSpawn: vi.fn(),
        onHit: vi.fn(),
        onDodge: vi.fn(),
        onThrow: vi.fn(),
        calculateCoverage: vi.fn(),
      },
      beatDetector: { update: vi.fn(() => ({ isBeat: false, intensity: 0 })) },
      onGameEnd: vi.fn(),
      onEvent: vi.fn(),
    };

    gameLoop = new GameLoop(mocks);
  });

  it('initializes with empty balloons array', () => {
    expect(gameLoop.balloons).toEqual([]);
    expect(gameLoop.running).toBe(false);
  });

  it('start sets running to true', () => {
    gameLoop.start();
    expect(gameLoop.running).toBe(true);
  });

  it('stop sets running to false', () => {
    gameLoop.start();
    gameLoop.stop();
    expect(gameLoop.running).toBe(false);
  });

  it('start resets balloons', () => {
    gameLoop.balloons = [{ x: 1 }];
    gameLoop.start();
    expect(gameLoop.balloons).toEqual([]);
  });

  it('start records startTime', () => {
    const before = Date.now();
    gameLoop.start();
    expect(gameLoop.startTime).toBeGreaterThanOrEqual(before);
  });

  it('tick does nothing when not running', () => {
    gameLoop.running = false;
    gameLoop.tick();
    expect(mocks.beatDetector.update).not.toHaveBeenCalled();
  });

  it('has correct dependency references', () => {
    expect(gameLoop.spawner).toBeDefined();
    expect(gameLoop.collisionDetector).toBeDefined();
    expect(gameLoop.throwEngine).toBeDefined();
    expect(gameLoop.balloonRenderer).toBeDefined();
    expect(gameLoop.splatRenderer).toBeDefined();
    expect(gameLoop.dripSimulator).toBeDefined();
    expect(gameLoop.particleEffects).toBeDefined();
  });
});
