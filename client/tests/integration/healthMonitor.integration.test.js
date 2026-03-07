import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HealthMonitor } from '../../src/utils/healthMonitor.js';

/**
 * Integration tests for the health monitoring flow.
 * Tests the full polling cycle: check → status change → callback.
 */
describe('HealthMonitor Integration — Polling Scenarios', () => {
  let monitor;
  let statusChanges;
  let originalFetch;

  beforeEach(() => {
    statusChanges = [];
    monitor = new HealthMonitor((available) => {
      statusChanges.push(available);
    });
    originalFetch = global.fetch;
    vi.useFakeTimers();
  });

  afterEach(() => {
    monitor.stop();
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('detects GPU coming online', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ localGPU: true }),
    });

    // Force past debounce
    monitor.lastCheck = 0;
    await monitor.check();

    expect(monitor.gpuAvailable).toBe(true);
    expect(statusChanges).toEqual([true]);
  });

  it('detects GPU going offline after being online', async () => {
    monitor.gpuAvailable = true; // Was online

    global.fetch = vi.fn().mockRejectedValue(new Error('timeout'));
    monitor.lastCheck = 0;
    await monitor.check();

    expect(monitor.gpuAvailable).toBe(false);
    expect(statusChanges).toEqual([false]);
  });

  it('does not fire callback when status unchanged', async () => {
    monitor.gpuAvailable = true;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ localGPU: true }),
    });

    monitor.lastCheck = 0;
    await monitor.check();

    expect(statusChanges).toEqual([]); // No change, no callback
  });

  it('debounces rapid checks', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ localGPU: true }),
    });

    monitor.lastCheck = Date.now(); // Just checked
    await monitor.check();

    expect(global.fetch).not.toHaveBeenCalled(); // Debounced
  });
});
