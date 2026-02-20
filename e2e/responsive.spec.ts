import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test.describe('Mobile Viewport (375px)', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('Mobile Navigation', async ({ page }) => {
      const mobileToggle = page.locator('.mobile-toggle');
      const navContent = page.locator('.nav-content');
      const hamburger = page.locator('.hamburger');

      await expect(mobileToggle).toBeVisible();
      await expect(mobileToggle).toHaveAttribute('aria-label', 'Toggle navigation menu');
      await expect(mobileToggle).toHaveAttribute('aria-expanded', 'false');
      await expect(navContent).not.toBeVisible();

      await mobileToggle.click();
      await expect(navContent).toHaveClass(/open/);
      await expect(navContent).toBeVisible();
      await expect(hamburger).toHaveClass(/open/);
      await expect(mobileToggle).toHaveAttribute('aria-expanded', 'true');

      const navLinks = navContent.locator('a');
      await expect(navLinks).toHaveCount(4);
      await expect(navLinks.first()).toBeVisible();

      await mobileToggle.click();
      await expect(navContent).not.toHaveClass(/open/);
      await expect(navContent).not.toBeVisible();
      await expect(hamburger).not.toHaveClass(/open/);
      await expect(mobileToggle).toHaveAttribute('aria-expanded', 'false');

      await mobileToggle.click();
      await expect(navContent).toBeVisible();
      
      await navContent.getByRole('link', { name: 'About' }).click();
      await expect(page).toHaveURL(/\/about/);
      await expect(navContent).not.toBeVisible();
    });

    test('Gallery Responsive', async ({ page }) => {
      await page.goto('/gallery');
      const photoMasonry = page.locator('.photo-masonry');
      await expect(photoMasonry).toBeVisible();

      const columnCount = await photoMasonry.evaluate((el) => {
        return window.getComputedStyle(el).getPropertyValue('column-count');
      });
      expect(columnCount).toBe('1');
    });

    test('Home Page Responsive', async ({ page }) => {
      await page.goto('/');
      
      await expect(page.locator('.hero')).toBeVisible();

      const navCards = page.locator('.nav-cards .nav-card');
      await expect(navCards).toHaveCount(3);
      await expect(navCards.first()).toBeVisible();

      await expect(page.locator('.hero .social-links')).toBeVisible();
    });
  });

  test.describe('Desktop Viewport', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('Desktop Navigation', async ({ page }) => {
      const mobileToggle = page.locator('.mobile-toggle');
      const navContent = page.locator('.nav-content');

      await expect(mobileToggle).not.toBeVisible();

      await expect(navContent).toBeVisible();
      const navLinks = navContent.locator('a');
      await expect(navLinks).toHaveCount(4);
      for (let i = 0; i < 4; i++) {
        await expect(navLinks.nth(i)).toBeVisible();
      }
    });
  });
});
