import { CONFIG } from '../config.js';

export class BeatDetector {
  constructor(analyser) {
    this.analyser = analyser;
    if (analyser) {
      this.analyser.fftSize = 512; // More frequency resolution for real music
      this.analyser.smoothingTimeConstant = 0.6;
      this.dataArray = new Uint8Array(analyser.frequencyBinCount);
    } else {
      this.dataArray = new Uint8Array(128);
    }
    this.lastBeatTime = 0;
    this.avgEnergy = 0; // Running average for adaptive threshold
  }

  update() {
    if (!this.analyser) {
      return { isBeat: false, intensity: 0 };
    }

    this.analyser.getByteFrequencyData(this.dataArray);

    // Focus on bass/low-mid frequencies (bins 1-15 at 512 FFT = ~43-645Hz)
    // Dhol bass hits are strongest in 60-200Hz range (bins 1-5)
    let bassSum = 0;
    const bassRange = 8;
    for (let i = 1; i <= bassRange; i++) {
      bassSum += this.dataArray[i];
    }
    const avgBass = bassSum / bassRange;

    // Adaptive threshold using running average
    this.avgEnergy = this.avgEnergy * 0.95 + avgBass * 0.05;
    const dynamicThreshold = Math.max(CONFIG.BEAT_THRESHOLD, this.avgEnergy * 1.3);

    const now = Date.now();
    let isBeat = false;

    if (avgBass > dynamicThreshold && now - this.lastBeatTime > CONFIG.BEAT_COOLDOWN_MS) {
      isBeat = true;
      this.lastBeatTime = now;
    }

    return { isBeat, intensity: Math.min(1, avgBass / 220) };
  }
}
