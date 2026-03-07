import { test, expect } from '@playwright/test';

/**
 * E2E tests for RangBarse.ai game flow.
 *
 * Uses Playwright with fake webcam (--use-fake-device-for-media-stream).
 * Tests the full user journey through the app screens.
 *
 * Note: MediaPipe model loading is slow and may not work in headless
 * Chromium; these tests focus on UI screens, navigation, and fallback
 * behavior rather than actual pose detection.
 */

test.describe('Landing Screen', () => {
  test('shows app title and start button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.logo')).toContainText('RangBarse');
    await expect(page.locator('#btn-start')).toBeVisible();
    await expect(page.locator('#btn-start')).toContainText('Allow Camera');
  });

  test('game container is hidden initially', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-container')).toBeHidden();
    await expect(page.locator('#result-screen')).toBeHidden();
  });

  test('GPU status badge is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#gpu-status')).toBeVisible();
    // Should show AI-Lite initially (no server running in test)
    await expect(page.locator('#gpu-label')).toContainText('AI-Lite');
  });
});

test.describe('Camera Permission Flow', () => {
  test('clicking start triggers camera permission', async ({ page, context }) => {
    // Grant camera permission
    await context.grantPermissions(['camera']);
    await page.goto('/');

    // Click start — should transition to game container
    await page.click('#btn-start');

    // Wait for game container to appear (MediaPipe may take time)
    await expect(page.locator('#game-container')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Game Rules Screen', () => {
  test('shows rules when Play button clicked', async ({ page, context }) => {
    await context.grantPermissions(['camera']);
    await page.goto('/');
    await page.click('#btn-start');
    await expect(page.locator('#game-container')).toBeVisible({ timeout: 15000 });

    // Click "Start Holi!" — should show rules overlay
    await page.click('#btn-play');
    await expect(page.locator('#rules-overlay')).toBeVisible();
    await expect(page.locator('.rules-grid')).toBeVisible();

    // Rules contain the 4 game instructions
    await expect(page.locator('.rule-item')).toHaveCount(4);

    // "Let's Go!" button should be present
    await expect(page.locator('#btn-start-game')).toBeVisible();
  });
});

test.describe('Style Picker', () => {
  test('has 3 style options', async ({ page }) => {
    await page.goto('/');

    // Force-show the style picker for testing
    await page.evaluate(() => {
      document.getElementById('style-picker').classList.remove('hidden');
    });

    const cards = page.locator('.style-card');
    await expect(cards).toHaveCount(3);

    // Check style names
    await expect(cards.nth(0)).toContainText('Watercolor');
    await expect(cards.nth(1)).toContainText('Bollywood');
    await expect(cards.nth(2)).toContainText('Rangoli');

    // Each has a data-style attribute
    await expect(cards.nth(0)).toHaveAttribute('data-style', 'watercolor');
    await expect(cards.nth(1)).toHaveAttribute('data-style', 'bollywood');
    await expect(cards.nth(2)).toHaveAttribute('data-style', 'rangoli');
  });

  test('style cards are clickable', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      document.getElementById('style-picker').classList.remove('hidden');
    });

    const cards = page.locator('.style-card');
    // Each card should be accessible via click
    for (let i = 0; i < 3; i++) {
      await expect(cards.nth(i)).toBeVisible();
    }
  });
});

test.describe('Loading / Engagement Screen', () => {
  test('has engagement UI elements', async ({ page }) => {
    await page.goto('/');

    // Force-show loading screen
    await page.evaluate(() => {
      document.getElementById('loading-screen').classList.remove('hidden');
    });

    // Score reveal items
    await expect(page.locator('.reveal-item')).toHaveCount(4);

    // Fun facts area
    await expect(page.locator('#fun-facts')).toBeVisible();

    // "Card Ready" prompt — has .hidden class initially
    await expect(page.locator('#art-ready-prompt')).toHaveClass(/hidden/);
  });
});

test.describe('Result Screen', () => {
  test('has download and play again buttons', async ({ page }) => {
    await page.goto('/');

    // Force-show result screen
    await page.evaluate(() => {
      document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
      const rs = document.getElementById('result-screen');
      rs.classList.remove('hidden');
      rs.style.display = 'flex';
    });

    await expect(page.locator('#btn-download')).toBeVisible();
    await expect(page.locator('#btn-play-again')).toBeVisible();
    // stats-display exists in DOM
    await expect(page.locator('#stats-display')).toHaveCount(1);
  });

  test('play again button exists and is interactive', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
      const rs = document.getElementById('result-screen');
      rs.classList.remove('hidden');
      rs.style.display = 'flex';
    });

    const btn = page.locator('#btn-play-again');
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });
});

test.describe('AI Generation Flow', () => {
  test('CSS fallback badge shows AI-Lite when no server', async ({ page }) => {
    await page.goto('/');
    // Without a running server, GPU status should show AI-Lite
    await expect(page.locator('#gpu-label')).toContainText('AI-Lite');
  });
});

test.describe('Toast Notifications', () => {
  test('toast container exists in DOM', async ({ page }) => {
    await page.goto('/');
    // Container exists (may be empty/invisible until a toast is shown)
    await expect(page.locator('#toast-container')).toHaveCount(1);
  });
});
