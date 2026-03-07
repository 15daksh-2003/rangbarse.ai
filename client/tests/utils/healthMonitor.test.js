import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HealthMonitor } from '../../src/utils/healthMonitor.js';

describe('HealthMonitor', () => {
  let onStatusChange;

  beforeEach(() => {
    onStatusChange = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts with gpuAvailable = false', () => {
    const hm = new HealthMonitor(onStatusChange);
    expect(hm.gpuAvailable).toBe(false);
  });

  it('calls check on start', () => {
    const hm = new HealthMonitor(onStatusChange);
    const spy = vi.spyOn(hm, 'check').mockResolvedValue(false);
    hm.start(15000);
    expect(spy).toHaveBeenCalledTimes(1);
    hm.stop();
  });

  it('stops interval on stop()', () => {
    const hm = new HealthMonitor(onStatusChange);
    vi.spyOn(hm, 'check').mockResolvedValue(false);
    hm.start(15000);
    expect(hm.interval).not.toBeNull();
    hm.stop();
    expect(hm.interval).toBeNull();
  });

  it('calls onStatusChange when GPU goes online', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ localGPU: true }),
    });

    const hm = new HealthMonitor(onStatusChange);
    hm.gpuAvailable = false;
    hm.lastCheck = 0;
    await hm.check();

    expect(hm.gpuAvailable).toBe(true);
    expect(onStatusChange).toHaveBeenCalledWith(true);
  });

  it('calls onStatusChange when GPU goes offline', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('timeout'));

    const hm = new HealthMonitor(onStatusChange);
    hm.gpuAvailable = true;
    hm.lastCheck = 0;
    await hm.check();

    expect(hm.gpuAvailable).toBe(false);
    expect(onStatusChange).toHaveBeenCalledWith(false);
  });

  it('debounces checks within 5 seconds', async () => {
    global.fetch = vi.fn();
    const hm = new HealthMonitor(onStatusChange);
    hm.lastCheck = Date.now(); // just checked
    await hm.check();
    expect(fetch).not.toHaveBeenCalled();
  });
});
