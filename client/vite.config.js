import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: resolve(__dirname, 'src'),
  publicDir: resolve(__dirname, 'public'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    root: resolve(__dirname),
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: [
        'src/index.html',
        'src/app.js',                  // State machine - integration tested
        'src/vision/**',               // MediaPipe CDN - browser-only
        'src/ui/**',                   // Canvas compositing - browser-only
        'src/render/**',               // Canvas 2D API - browser-only
        'src/audio/audioManager.js',   // Web Audio API - browser-only
        'src/game/gameLoop.js',        // rAF + canvas + MediaPipe - integration tested
        'src/ai/cssFilters.js',        // Canvas filter effects - browser-only
        'src/utils/speechRecognition.js', // Web Speech API - browser-only
      ],
      thresholds: {
        // Per-module coverage enforcement
        // These modules are pure logic, fully unit-testable
        // If any drops below 90% statements, test run FAILS
        'src/game/balloon.js': { statements: 90 },
        'src/game/balloonSpawner.js': { statements: 90 },
        'src/game/collisionDetector.js': { statements: 90 },
        'src/game/scoreManager.js': { statements: 90 },
        'src/game/throwEngine.js': { statements: 90 },
        'src/ai/aiClient.js': { statements: 90 },
        'src/ai/stylePrompts.js': { statements: 90 },
        'src/audio/beatDetector.js': { statements: 90 },
        'src/utils/logger.js': { statements: 90 },
        'src/utils/healthMonitor.js': { statements: 90 },
        'src/config.js': { statements: 100 },
      },
    },
  },
});
