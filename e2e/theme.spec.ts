import { test, expect } from '@playwright/test';

test.describe('Theme Toggle', () => {
  test('theme toggle button exists and has correct aria-label', async ({ page }) => {
    await page.goto('/');
    const toggleButton = page.locator('button.theme-toggle[aria-label="Toggle theme"]');
    await expect(toggleButton).toBeVisible();
  });

  test('default theme respects system preference', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('theme toggle button shows sun icon when dark theme is active', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('theme', 'dark');
    });
    await page.goto('/');
    const toggleButton = page.locator('button.theme-toggle[aria-label="Toggle theme"]');
    const sunIcon = toggleButton.locator('svg:has(circle)');
    await expect(sunIcon.first()).toBeVisible();
    await expect(toggleButton).toHaveAttribute('title', 'Switch to light mode');
  });

  test('clicking toggle switches theme and changes icon', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('theme', 'dark');
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    const toggleButton = page.locator('button.theme-toggle[aria-label="Toggle theme"]');
    const html = page.locator('html');

    await expect(html).toHaveAttribute('data-theme', 'dark');

    await toggleButton.click();
    await expect(html).toHaveAttribute('data-theme', 'light', { timeout: 5000 });

    const moonIcon = toggleButton.locator('svg:has(path):not(:has(circle))');
    await expect(moonIcon.first()).toBeVisible();
    await expect(toggleButton).toHaveAttribute('title', 'Switch to dark mode');

    await toggleButton.click();
    await expect(html).toHaveAttribute('data-theme', 'dark', { timeout: 5000 });
  });

  test('theme persists across page navigation', async ({ page }) => {
    await page.addInitScript(() => {
      if (!window.localStorage.getItem('theme')) {
        window.localStorage.setItem('theme', 'dark');
      }
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    const html = page.locator('html');

    await expect(html).toHaveAttribute('data-theme', 'dark');

    const toggleButton = page.locator('button.theme-toggle[aria-label="Toggle theme"]');
    await toggleButton.click();
    await expect(html).toHaveAttribute('data-theme', 'light', { timeout: 5000 });

    await page.goto('/about');
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('theme persists in localStorage', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('theme', 'dark');
    });
    await page.goto('/', { waitUntil: 'networkidle' });

    const toggleButton = page.locator('button.theme-toggle[aria-label="Toggle theme"]');
    await toggleButton.click();

    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('light');
  });

  test('theme loads from localStorage on fresh page load', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('theme', 'light');
    });

    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('respects system light preference when no localStorage', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
  });
});
