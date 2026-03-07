import { CONFIG } from '../config.js';
import { CSSFilters } from './cssFilters.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('AIClient');

export class AIClient {
  constructor() {
    this.cssFilters = new CSSFilters();
  }

  /**
   * Generate AI art using canvas-only pipeline.
   *
   * @param {string} sceneCanvas - base64 PNG of splatters on ambient map (sent to server)
   * @param {string} style - 'watercolor' | 'bollywood' | 'rangoli'
   * @param {number} coverage - splatter coverage % (for low-coverage boost)
   * @returns {{ imageUrl: string, tier: string, reason?: string }}
   */
  async generate(sceneCanvas, style, coverage = 50) {
    try {
      const response = await fetch(CONFIG.AI_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: sceneCanvas, style, coverage }),
      });

      if (response.ok) {
        const blob = await response.blob();
        log.info('GPU art generated successfully');
        return { imageUrl: URL.createObjectURL(blob), tier: 'AI (GPU)' };
      }

      // Parse the error reason from the server
      let reason = 'Server error';
      try {
        const errBody = await response.json();
        reason = errBody.error || errBody.message || reason;
      } catch {}

      if (response.status === 429) {
        reason = 'Too many requests — try again in a minute';
      } else if (response.status === 503) {
        reason = reason.includes('busy') ? 'Server busy — GPU queue is full' : 'GPU server is offline';
      }

      log.warn(`API ${response.status}: ${reason}, using CSS fallback`);
      const filtered = await this.cssFilters.apply(sceneCanvas, style);
      return { imageUrl: filtered, tier: 'AI-Lite (CSS)', reason };
    } catch (err) {
      const reason = 'Could not reach server';
      log.warn(`Network error: ${err.message}, using CSS fallback`);
      const filtered = await this.cssFilters.apply(sceneCanvas, style);
      return { imageUrl: filtered, tier: 'AI-Lite (CSS)', reason };
    }
  }
}
