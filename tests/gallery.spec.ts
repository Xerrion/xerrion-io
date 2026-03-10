import { test, expect } from '@playwright/test';

test.describe('Gallery', () => {
  test('should load the gallery page with initial photos', async ({ page }) => {
    await page.goto('/gallery');
    
    // Check header
    await expect(page.locator('h1')).toHaveText('Gallery');
    
    // Check if at least one photo is loaded (from DB)
    const photoCards = page.locator('.photo-card');
    await expect(photoCards.first()).toBeAttached();
    
    // Check if filter buttons are present
    const filters = page.locator('.filter-btn');
    await expect(filters.first()).toBeAttached();
    await expect(filters.locator('text=All').first()).toBeAttached();
  });

  test('should filter photos by category and handle infinite scroll', async ({ page }) => {
    // Generate mock photos
    const generateMockPhotos = (startId: number, count: number) => {
      return Array.from({ length: count }).map((_, i) => ({
        id: `mock-${startId + i}`,
        name: `Mock Photo ${startId + i}`,
        url: `https://example.com/${startId + i}.jpg`,
        thumbUrl: `https://example.com/${startId + i}-thumb.jpg`,
        mediumUrl: `https://example.com/${startId + i}-medium.jpg`,
        fullUrl: `https://example.com/${startId + i}-full.jpg`,
        width: 800,
        height: 600,
        category: 'charlie',
        createdAt: new Date().toISOString()
      }));
    };

    // Intercept the API route
    await page.route('**/api/gallery/photos*', async (route) => {
      const url = new URL(route.request().url());
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      const category = url.searchParams.get('category');

      if (category === 'charlie') {
        if (offset === 0) {
          // Return exactly 20 to trigger `hasMore = true`
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ photos: generateMockPhotos(1, 20) })
          });
        } else if (offset === 20) {
          // Return 2 more for infinite scroll
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ photos: generateMockPhotos(21, 2) })
          });
        } else {
          route.fulfill({ status: 200, body: JSON.stringify({ photos: [] }) });
        }
      } else {
        route.fulfill({ status: 200, body: JSON.stringify({ photos: [] }) });
      }
    });

    await page.goto('/gallery');

    // Click the "Charlie" category (wait for it to be visible and click it)
    const charlieFilter = page.locator('.filter-btn', { hasText: 'Charlie' });
    
    await expect(async () => {
      await charlieFilter.click();
      await expect(page.locator('.photo-card')).toHaveCount(20);
      await expect(page.locator('img[alt="Mock Photo 1"]')).toBeAttached();
    }).toPass();

    // Scroll to the bottom to trigger infinite scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Wait for the next batch of 2 photos to load (total 22)
    await expect(page.locator('.photo-card')).toHaveCount(22);
    await expect(page.locator('img[alt="Mock Photo 22"]')).toBeAttached();
  });

  test('should open lightbox, navigate, and close', async ({ page }) => {
    await page.goto('/gallery');

    // Wait for photos to be visible
    const photoButtons = page.locator('.photo-button');
    await expect(photoButtons.first()).toBeAttached();

    const lightbox = page.locator('.lightbox-backdrop');
    
    // Click the first photo to open the Lightbox
    await expect(async () => {
      await photoButtons.nth(0).click();
      await expect(lightbox).toBeAttached();
    }).toPass();

    const counter = page.locator('.lightbox-counter');
    await expect(counter).toContainText('1 /');

    // Previous button should be hidden on the first photo
    const prevBtn = page.locator('.lightbox-prev');
    await expect(prevBtn).toBeHidden();

    // Click Next button
    const nextBtn = page.locator('.lightbox-next');
    await expect(nextBtn).toBeAttached();
    await nextBtn.click();

    // The counter should update
    await expect(counter).toContainText('2 /');

    // Now Previous button should be visible
    await expect(prevBtn).toBeAttached();
    
    // Navigate back to the first photo
    await prevBtn.click();
    await expect(counter).toContainText('1 /');
    await expect(prevBtn).toBeHidden();

    // Close via Close Button
    const closeBtn = page.locator('.lightbox-close');
    await closeBtn.click();
    await expect(lightbox).toBeHidden();

    // Open again to test Escape key
    await photoButtons.nth(0).click();
    await expect(lightbox).toBeAttached();
    
    // Close via Escape key
    await page.keyboard.press('Escape');
    await expect(lightbox).toBeHidden();
  });

  test('should hide Next button on the last photo', async ({ page }) => {
    // Generate exactly 2 mock photos
    const mockPhotos = [
      { id: 'mock-1', name: 'Photo One', url: 'https://example.com/1.jpg', thumbUrl: 'https://example.com/1.jpg', mediumUrl: 'https://example.com/1.jpg', width: 800, height: 600, category: 'test', createdAt: new Date().toISOString() },
      { id: 'mock-2', name: 'Photo Two', url: 'https://example.com/2.jpg', thumbUrl: 'https://example.com/2.jpg', mediumUrl: 'https://example.com/2.jpg', width: 800, height: 600, category: 'test', createdAt: new Date().toISOString() }
    ];

    await page.route('**/api/gallery/photos*', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ photos: mockPhotos })
      });
    });

    await page.goto('/gallery');

    // Click a filter to trigger the mock API
    const charlieFilter = page.locator('.filter-btn', { hasText: 'Charlie' });
    
    await expect(async () => {
      await charlieFilter.click();
      await expect(page.locator('.photo-card')).toHaveCount(2);
    }).toPass();

    // Open first photo
    await page.locator('.photo-button').nth(0).click();

    // Counter shows 1/2
    await expect(page.locator('.lightbox-counter')).toContainText('1 / 2');

    // Go to second (last) photo
    const nextBtn = page.locator('.lightbox-next');
    await nextBtn.click();

    // Counter shows 2/2
    await expect(page.locator('.lightbox-counter')).toContainText('2 / 2');

    // Next button should be hidden
    await expect(nextBtn).toBeHidden();
  });
});
