import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('Skip Link functionality on home page', async ({ page }) => {
    await page.goto('/');

    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toHaveAttribute('href', '#main-content');
    await expect(skipLink).toContainText(/Skip to|main content/i);

    const boundingBox = await skipLink.boundingBox();
    if (boundingBox) {
      expect(boundingBox.y).toBeLessThan(0);
    }

    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();

    await expect(skipLink).toBeInViewport();

    await expect(page.locator('#main-content')).toBeAttached();
  });

  test('ARIA Labels on Interactive Elements on home page', async ({ page }) => {
    await page.goto('/');

    const themeToggle = page.locator('button[aria-label="Toggle theme"]');
    await expect(themeToggle).toBeVisible();

    const socialLinks = page.locator('.social-link');
    const count = await socialLinks.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(socialLinks.nth(i)).toHaveAttribute('aria-label');
    }

    const navLinks = page.locator('nav a');
    const navCount = await navLinks.count();
    expect(navCount).toBeGreaterThan(0);
    for (let i = 0; i < navCount; i++) {
      const text = await navLinks.nth(i).textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('Semantic HTML structure on home page', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1')).toHaveCount(1);

    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav.first()).toBeVisible();

    await expect(page.locator('footer')).toBeVisible();

    await expect(page.locator('main, #main-content')).toBeVisible();
  });

  test('About page accessibility', async ({ page }) => {
    await page.goto('/about');

    await expect(page.locator('h1')).toHaveCount(1);

    await expect(page.locator('h2')).toHaveCount(6);
  });

  test.describe('Gallery accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/gallery', { waitUntil: 'networkidle' });
    });

    test('Gallery navigation and photo labels', async ({ page }) => {
      const categoryNav = page.locator('nav[aria-label="Photo categories"]');
      await expect(categoryNav).toBeVisible();

      const photoButtons = page.locator('button[aria-label*="View"][aria-label*="fullscreen"]');
      const count = await photoButtons.count();
      expect(count).toBeGreaterThan(0);
    });

    test('Lightbox ARIA and keyboard navigation', async ({ page }) => {
      const firstPhoto = page.locator('button[aria-label*="View"][aria-label*="fullscreen"]').first();
      await firstPhoto.scrollIntoViewIfNeeded();
      await firstPhoto.click({ timeout: 10000 });

      const lightbox = page.locator('[role="dialog"][aria-modal="true"]');
      await expect(lightbox).toBeVisible({ timeout: 10000 });
      await expect(lightbox).toHaveAttribute('aria-label', 'Photo viewer');

      const closeButton = page.locator('button[aria-label="Close viewer"]');
      await expect(closeButton).toBeVisible();

      const prevButton = page.locator('button[aria-label="Previous photo"]');
      const nextButton = page.locator('button[aria-label="Next photo"]');
      await expect(prevButton).toBeVisible();
      await expect(nextButton).toBeVisible();

      await page.keyboard.press('ArrowRight');

      await page.keyboard.press('ArrowLeft');

      await page.keyboard.press('Escape');
      await expect(lightbox).not.toBeVisible();
    });
  });
});
