import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanvasManager } from '../../src/render/canvasManager.js';

// Mock canvas context
function createMockCtx() {
  return {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    fillRect: vi.fn(),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    filter: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(100 * 100 * 4),
    })),
  };
}

// Mock canvas element
function createMockCanvas(width = 1280, height = 720) {
  const ctx = createMockCtx();
  return {
    width,
    height,
    style: {},
    getContext: vi.fn(() => ctx),
    toDataURL: vi.fn(() => 'data:image/png;base64,test'),
    _ctx: ctx,
  };
}

describe('CanvasManager', () => {
  let cm;
  let container;

  beforeEach(() => {
    container = {
      innerHTML: '',
      append: vi.fn(),
      appendChild: vi.fn(),
    };

    // Mock document.createElement
    const origCreateElement = globalThis.document?.createElement;
    vi.stubGlobal('document', {
      createElement: vi.fn((tag) => {
        if (tag === 'video') {
          return {
            autoplay: false,
            playsInline: false,
            muted: false,
            style: {},
            srcObject: null,
          };
        }
        if (tag === 'canvas') return createMockCanvas();
        if (tag === 'div') return { style: {}, remove: vi.fn() };
        return {};
      }),
    });

    // Mock Image constructor for _loadImage
    vi.stubGlobal('Image', class MockImage {
      constructor() {
        this.crossOrigin = '';
        setTimeout(() => {
          this.width = 1280;
          this.height = 720;
          if (this.onload) this.onload();
        }, 0);
      }
    });

    cm = new CanvasManager(container);
  });

  it('initializes with null canvases', () => {
    expect(cm.splatCanvas).toBeNull();
    expect(cm.gameCanvas).toBeNull();
    expect(cm.videoElement).toBeNull();
  });

  it('init creates video, splat canvas, and game canvas', () => {
    cm.init(1280, 720);
    expect(cm.videoElement).toBeDefined();
    expect(cm.splatCanvas).toBeDefined();
    expect(cm.gameCanvas).toBeDefined();
    expect(container.append).toHaveBeenCalled();
  });

  it('clearGameCanvas calls clearRect', () => {
    cm.init(1280, 720);
    cm.clearGameCanvas();
    expect(cm.gameCtx.clearRect).toHaveBeenCalledWith(0, 0, 1280, 720);
  });

  it('clearSplatCanvas calls clearRect', () => {
    cm.init(1280, 720);
    cm.clearSplatCanvas();
    expect(cm.splatCtx.clearRect).toHaveBeenCalledWith(0, 0, 1280, 720);
  });

  it('setStream sets video srcObject', () => {
    cm.init(1280, 720);
    const mockStream = { id: 'test-stream' };
    cm.setStream(mockStream);
    expect(cm.videoElement.srcObject).toBe(mockStream);
  });

  it('captureComposite returns data URL', () => {
    cm.init(1280, 720);
    const result = cm.captureComposite();
    expect(typeof result).toBe('string');
    expect(result).toContain('data:image/png');
  });

  it('captureWebcamFrame returns data URL', () => {
    cm.init(1280, 720);
    const result = cm.captureWebcamFrame();
    expect(typeof result).toBe('string');
    expect(result).toContain('data:image/png');
  });

  it('captureSceneCanvas returns data URL', () => {
    cm.init(1280, 720);
    const result = cm.captureSceneCanvas();
    expect(typeof result).toBe('string');
  });

  it('composeAIArt returns a promise', () => {
    cm.init(1280, 720);
    const result = cm.composeAIArt(
      'data:image/png;base64,webcam',
      'data:image/png;base64,transformed',
      'watercolor'
    );
    expect(result).toBeInstanceOf(Promise);
  });
});

describe('CanvasManager - Blend Modes', () => {
  it('uses CONFIG.BLEND_MODES for composition', async () => {
    // Verify that config.js has BLEND_MODES
    const { CONFIG } = await import('../../src/config.js');
    expect(CONFIG.BLEND_MODES).toBeDefined();
    expect(CONFIG.BLEND_MODES.watercolor).toEqual({ mode: 'multiply', opacity: 0.75 });
    expect(CONFIG.BLEND_MODES.bollywood).toEqual({ mode: 'overlay', opacity: 0.90 });
    expect(CONFIG.BLEND_MODES.rangoli).toEqual({ mode: 'soft-light', opacity: 0.70 });
  });
});
