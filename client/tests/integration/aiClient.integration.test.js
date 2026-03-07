import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIClient } from '../../src/ai/aiClient.js';

/**
 * Integration tests for the AI generation flow.
 * Tests the full aiClient.generate() behavior across different
 * server response scenarios (success, rate limit, queue full, offline, network error).
 */
describe('AIClient Integration — Server Response Scenarios', () => {
  let client;
  let originalFetch;

  beforeEach(() => {
    client = new AIClient();
    // Mock cssFilters to avoid canvas dependency
    client.cssFilters.apply = vi.fn().mockResolvedValue('data:image/png;base64,css-filtered');
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns AI (GPU) tier on 200 success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['image-data'], { type: 'image/png' })),
    });

    const result = await client.generate('data:image/png;base64,abc', 'watercolor');
    expect(result.tier).toBe('AI (GPU)');
    expect(result.reason).toBeUndefined();
    expect(result.imageUrl).toBeDefined();
  });

  it('returns CSS fallback with "Too many requests" on 429', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: 'Too many requests. Try again in a minute.' }),
    });

    const result = await client.generate('data:image/png;base64,abc', 'watercolor');
    expect(result.tier).toBe('AI-Lite (CSS)');
    expect(result.reason).toContain('Too many requests');
    expect(result.imageUrl).toBe('data:image/png;base64,css-filtered');
  });

  it('returns CSS fallback with "GPU offline" on 503 offline', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ error: 'GPU server offline', message: 'CSS fallback active' }),
    });

    const result = await client.generate('data:image/png;base64,abc', 'bollywood');
    expect(result.tier).toBe('AI-Lite (CSS)');
    expect(result.reason).toContain('offline');
  });

  it('returns CSS fallback with "Server busy" on 503 queue full', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ error: 'Server busy. Try again shortly.' }),
    });

    const result = await client.generate('data:image/png;base64,abc', 'rangoli');
    expect(result.tier).toBe('AI-Lite (CSS)');
    expect(result.reason).toContain('busy');
  });

  it('returns CSS fallback with "Could not reach server" on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('fetch failed'));

    const result = await client.generate('data:image/png;base64,abc', 'watercolor');
    expect(result.tier).toBe('AI-Lite (CSS)');
    expect(result.reason).toBe('Could not reach server');
  });

  it('returns CSS fallback on 500 server error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Generation failed', message: 'CUDA out of memory' }),
    });

    const result = await client.generate('data:image/png;base64,abc', 'watercolor');
    expect(result.tier).toBe('AI-Lite (CSS)');
    expect(result.reason).toBe('Generation failed');
  });

  it('handles malformed error JSON gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not JSON')),
    });

    const result = await client.generate('data:image/png;base64,abc', 'watercolor');
    expect(result.tier).toBe('AI-Lite (CSS)');
    expect(result.reason).toBe('Server error'); // Default reason
  });

  it('passes coverage parameter to server', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['image-data'], { type: 'image/png' })),
    });

    await client.generate('data:image/png;base64,abc', 'watercolor', 25);

    const fetchCall = global.fetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.coverage).toBe(25);
  });

  it('defaults coverage to 50 when not provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['image-data'], { type: 'image/png' })),
    });

    await client.generate('data:image/png;base64,abc', 'rangoli');

    const fetchCall = global.fetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.coverage).toBe(50);
  });

  it('sends correct style in request body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['image-data'], { type: 'image/png' })),
    });

    await client.generate('data:image/png;base64,abc', 'bollywood', 40);

    const fetchCall = global.fetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.style).toBe('bollywood');
    expect(body.image).toBe('data:image/png;base64,abc');
  });
});
