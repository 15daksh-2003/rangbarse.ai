import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './client/tests/e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    // Grant fake webcam permissions — Playwright can't access real hardware
    permissions: ['camera', 'microphone'],
    // Use Chromium (best MediaPipe support)
    browserName: 'chromium',
    launchOptions: {
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
      ],
    },
  },
  webServer: {
    command: 'npx vite --config client/vite.config.js',
    port: 5173,
    reuseExistingServer: true,
    timeout: 15000,
  },
});
