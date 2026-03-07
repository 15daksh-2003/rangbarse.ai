import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CSSFilters } from '../../src/ai/cssFilters.js';

// Mock document/canvas for Node environment
const mockCtx = {
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  filter: '',
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  lineCap: '',
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  closePath: vi.fn(),
  clip: vi.fn(),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
};

const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => mockCtx),
  toDataURL: vi.fn(() => 'data:image/png;base64,filtered-result'),
};

// Mock document.createElement to return our mock canvas
vi.stubGlobal('document', {
  createElement: vi.fn((tag) => {
    if (tag === 'canvas') return { ...mockCanvas };
    return {};
  }),
});

describe('CSSFilters', () => {
  let filters;

  beforeEach(() => {
    filters = new CSSFilters();
  });

  it('creates an instance', () => {
    expect(filters).toBeDefined();
    expect(typeof filters.apply).toBe('function');
  });

  it('apply returns a data URL string', async () => {
    // Mock loadImage
    filters.loadImage = vi.fn().mockResolvedValue({ width: 100, height: 100 });

    const result = await filters.apply('data:image/png;base64,abc', 'watercolor');
    expect(typeof result).toBe('string');
  });

  it('apply calls loadImage with the input', async () => {
    filters.loadImage = vi.fn().mockResolvedValue({ width: 50, height: 50 });

    await filters.apply('data:image/png;base64,xyz', 'bollywood');
    expect(filters.loadImage).toHaveBeenCalledWith('data:image/png;base64,xyz');
  });

  it('handles all three styles without error', async () => {
    filters.loadImage = vi.fn().mockResolvedValue({ width: 100, height: 100 });

    for (const style of ['watercolor', 'bollywood', 'rangoli']) {
      const result = await filters.apply('data:image/png;base64,abc', style);
      expect(result).toBeDefined();
    }
  });

  it('handles unknown style by drawing image directly', async () => {
    filters.loadImage = vi.fn().mockResolvedValue({ width: 100, height: 100 });

    const result = await filters.apply('data:image/png;base64,abc', 'unknown_style');
    expect(result).toBeDefined();
  });
});
