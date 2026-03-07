import { describe, it, expect } from 'vitest';
import { BeatDetector } from '../../src/audio/beatDetector.js';

describe('BeatDetector', () => {
  it('returns no beat when analyser is null', () => {
    const bd = new BeatDetector(null);
    const result = bd.update();
    expect(result.isBeat).toBe(false);
    expect(result.intensity).toBe(0);
  });

  it('initializes with zero avgEnergy', () => {
    const bd = new BeatDetector(null);
    expect(bd.avgEnergy).toBe(0);
    expect(bd.lastBeatTime).toBe(0);
  });

  it('creates dataArray from analyser frequencyBinCount', () => {
    const mockAnalyser = {
      frequencyBinCount: 64,
      fftSize: 512,
      smoothingTimeConstant: 0.6,
    };
    const bd = new BeatDetector(mockAnalyser);
    expect(bd.dataArray.length).toBe(64);
  });

  it('creates fallback dataArray when no analyser', () => {
    const bd = new BeatDetector(null);
    expect(bd.dataArray.length).toBe(128);
  });

  it('detects beat when bass exceeds threshold', () => {
    const mockAnalyser = {
      frequencyBinCount: 64,
      fftSize: 512,
      smoothingTimeConstant: 0.6,
      getByteFrequencyData: (arr) => {
        // Simulate strong bass hit
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i <= 8 ? 250 : 20;
        }
      },
    };
    const bd = new BeatDetector(mockAnalyser);
    // First call to build up avgEnergy
    bd.update();
    // Force lastBeatTime to be old enough
    bd.lastBeatTime = 0;
    const result = bd.update();
    // With high bass values, should detect a beat
    expect(result.intensity).toBeGreaterThan(0.5);
  });

  it('respects beat cooldown', () => {
    const mockAnalyser = {
      frequencyBinCount: 64,
      fftSize: 512,
      smoothingTimeConstant: 0.6,
      getByteFrequencyData: (arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i <= 8 ? 250 : 20;
        }
      },
    };
    const bd = new BeatDetector(mockAnalyser);
    bd.lastBeatTime = Date.now(); // Just beat
    const result = bd.update();
    // Should NOT be a beat because cooldown hasn't passed
    expect(result.isBeat).toBe(false);
  });

  it('returns intensity in 0-1 range', () => {
    const mockAnalyser = {
      frequencyBinCount: 64,
      fftSize: 512,
      smoothingTimeConstant: 0.6,
      getByteFrequencyData: (arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = 128;
        }
      },
    };
    const bd = new BeatDetector(mockAnalyser);
    const result = bd.update();
    expect(result.intensity).toBeGreaterThanOrEqual(0);
    expect(result.intensity).toBeLessThanOrEqual(1);
  });
});
