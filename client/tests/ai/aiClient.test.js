import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIClient } from '../../src/ai/aiClient.js';

describe('AIClient', () => {
  let client;
  let originalFetch;

  beforeEach(() => {
    client = new AIClient();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('creates with CSS filters fallback', () => {
    expect(client.cssFilters).toBeDefined();
  });

  it('calls /api/generate and returns GPU tier on success', async () => {
    const fakeBlob = new Blob(['fake-image'], { type: 'image/png' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(fakeBlob),
    });

    const result = await client.generate('data:image/png;base64,abc', 'watercolor');
    expect(result.tier).toBe('AI (GPU)');
    expect(result.imageUrl).toBeDefined();
    expect(result.reason).toBeUndefined();
  });

  it('falls back to CSS with reason on API failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    client.cssFilters.apply = vi.fn().mockResolvedValue('data:image/png;base64,filtered');

    const result = await client.generate('data:image/png;base64,abc', 'watercolor');
    expect(result.tier).toBe('AI-Lite (CSS)');
    expect(result.reason).toBe('Could not reach server');
  });

  it('falls back to CSS with reason on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ error: 'GPU server offline' }),
    });
    client.cssFilters.apply = vi.fn().mockResolvedValue('data:image/png;base64,filtered');

    const result = await client.generate('data:image/png;base64,abc', 'bollywood');
    expect(result.tier).toBe('AI-Lite (CSS)');
    expect(result.reason).toContain('offline');
  });
});
