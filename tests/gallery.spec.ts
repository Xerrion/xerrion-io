import { test, expect } from '@playwright/test';

test.describe('Gallery Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gallery', { waitUntil: 'networkidle' });
  });

  test('Page Structure: loads and shows correct headers', async ({ page }) => {
    const container = page.locator('.gallery-page');
    await expect(container).toBeVisible();

    const h1 = page.locator('h1');
    await expect(h1).toContainText('Gallery');

    const nav = page.locator('nav[aria-label="Photo categories"]');
    await expect(nav).toBeVisible();
  });

  test('Category Filtering: can filter photos by category', async ({ page }) => {
    const filterNav = page.locator('nav[aria-label="Photo categories"]');
    const allFilter = filterNav.locator('button', { hasText: 'All' });

    await expect(allFilter).toBeVisible();
    await expect(allFilter).toHaveClass(/active/);

    const filterCounts = filterNav.locator('.filter-count');
    if (await filterCounts.count() > 0) {
      await expect(filterCounts.first()).toBeVisible();
    }

    const otherFilters = filterNav.locator('button').filter({ hasNotText: 'All' });
    const otherFiltersCount = await otherFilters.count();

    if (otherFiltersCount > 0) {
      const firstCategory = otherFilters.first();

      await firstCategory.click();
      await expect(firstCategory).toHaveClass(/active/);
      await expect(allFilter).not.toHaveClass(/active/);

      await expect(page.locator('.photo-masonry')).toBeVisible();
      await expect(page.locator('.photo-badge').first()).not.toBeVisible();

      await allFilter.click();
      await expect(allFilter).toHaveClass(/active/);
      await expect(firstCategory).not.toHaveClass(/active/);

      const firstPhotoBadge = page.locator('.photo-card .photo-badge').first();
      if (await firstPhotoBadge.count() > 0) {
        await expect(firstPhotoBadge).toBeVisible();
      }
    }
  });

  test('Photo Grid: items have correct structure and labels', async ({ page }) => {
    const grid = page.locator('.photo-masonry');
    await expect(grid).toBeVisible();

    const photoCards = page.locator('.photo-card');
    const count = await photoCards.count();
    
    if (count > 0) {
      const firstCard = photoCards.first();

      const button = firstCard.locator('.photo-button');
      await expect(button).toHaveAttribute('aria-label', /View.*in fullscreen/);

      const overlay = firstCard.locator('.photo-overlay');
      await expect(overlay).toBeVisible();

      await expect(firstCard).toHaveCSS('opacity', '1');
    }
  });

  test('Lightbox: Open, navigate and close via UI and Keyboard', async ({ page }) => {
    const photoButtons = page.locator('.photo-button');
    const totalPhotos = await photoButtons.count();

    if (totalPhotos > 0) {
      const firstButton = photoButtons.first();
      await firstButton.scrollIntoViewIfNeeded();
      await firstButton.click();

      const lightbox = page.locator('.lightbox-backdrop');
      await expect(lightbox).toBeVisible({ timeout: 10000 });
      await expect(lightbox).toHaveAttribute('role', 'dialog');
      await expect(lightbox).toHaveAttribute('aria-modal', 'true');

      const img = lightbox.locator('.lightbox-image');
      await expect(img.first()).toBeVisible();

      const counter = lightbox.locator('.lightbox-counter');
      await expect(counter).toContainText(/1 \/ \d+/);

      const categoryLabel = lightbox.locator('.lightbox-category');
      await expect(categoryLabel).toBeVisible();

      if (totalPhotos > 1) {
        const nextBtn = lightbox.locator('.lightbox-next');
        const prevBtn = lightbox.locator('.lightbox-prev');

        await expect(nextBtn).toHaveAttribute('aria-label', 'Next photo');
        await expect(prevBtn).toHaveAttribute('aria-label', 'Previous photo');

        await nextBtn.click();
        await expect(counter).toContainText(/2 \/ \d+/);

        await prevBtn.click();
        await expect(counter).toContainText(/1 \/ \d+/);

        await page.keyboard.press('ArrowRight');
        await expect(counter).toContainText(/2 \/ \d+/);

        await page.keyboard.press('ArrowLeft');
        await expect(counter).toContainText(/1 \/ \d+/);
      }

      const closeBtn = lightbox.locator('button[aria-label="Close viewer"]');
      await closeBtn.click();
      await expect(lightbox).not.toBeVisible();

      await photoButtons.first().click();
      await expect(lightbox).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(lightbox).not.toBeVisible();
    }
  });
});

