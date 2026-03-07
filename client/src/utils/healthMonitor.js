import { CONFIG } from '../config.js';
import { Logger } from './logger.js';

const log = new Logger('HealthMonitor');

export class HealthMonitor {
  constructor(onStatusChange) {
    this.gpuAvailable = false;
    this.lastCheck = 0;
    this.interval = null;
    this.onStatusChange = onStatusChange;
  }

  start(intervalMs = 15000) {
    this.check();
    this.interval = setInterval(() => this.check(), intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async check() {
    // Debounce: skip if last check was < 5s ago
    if (Date.now() - this.lastCheck < 5000) return this.gpuAvailable;

    try {
      const res = await fetch(CONFIG.AI_HEALTH_ENDPOINT, { signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      const prev = this.gpuAvailable;
      this.gpuAvailable = data.localGPU === true;
      this.lastCheck = Date.now();

      if (prev !== this.gpuAvailable) {
        log.info(`GPU status changed: ${this.gpuAvailable ? 'ONLINE' : 'OFFLINE'}`);
        this.onStatusChange(this.gpuAvailable);
      }
    } catch {
      if (this.gpuAvailable) {
        this.gpuAvailable = false;
        log.warn('GPU health check failed — marking offline');
        this.onStatusChange(false);
      }
    }

    return this.gpuAvailable;
  }
}
