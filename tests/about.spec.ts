import { test, expect } from '@playwright/test';

test.describe('About Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about');
  });

  test('should have correct title and layout', async ({ page }) => {
    await expect(page).toHaveTitle(/About/);
    const container = page.locator('.about');
    await expect(container).toBeVisible();
    await expect(page.locator('h1')).toHaveText('About Me');
    await expect(page.locator('.subtitle')).toHaveText('The longer version');
  });

  test('should have all 6 about sections', async ({ page }) => {
    const sections = page.locator('.about-section');
    await expect(sections).toHaveCount(6);

    const headings = [
      'The basics',
      'Work stuff',
      'Tech I like',
      'Charlie',
      'Outside of work',
      'Say hi'
    ];

    for (const heading of headings) {
      await expect(page.locator('h2', { hasText: heading })).toBeVisible();
    }
  });

  test('should have correct tech grid items', async ({ page }) => {
    const techGrid = page.locator('.tech-grid');
    await expect(techGrid).toBeVisible();

    const techItems = page.locator('.tech-item');
    await expect(techItems).toHaveCount(6);

    const expectedTech = [
      'TypeScript',
      'Rust',
      'Python',
      'Svelte',
      'ServiceNow',
      'APIs'
    ];

    for (let i = 0; i < expectedTech.length; i++) {
      const item = techItems.nth(i);
      await expect(item.locator('.tech-name')).toHaveText(expectedTech[i]);
      await expect(item.locator('.tech-note')).not.toBeEmpty();
    }
  });

  test('should have charlie section with gallery link', async ({ page }) => {
    const charlieSection = page.locator('.about-section', { hasText: 'Charlie' });
    const galleryLink = charlieSection.locator('a[href="/gallery"]');
    await expect(galleryLink).toBeVisible();
    await expect(galleryLink).toHaveText(/gallery/i);
  });

  test('should have outside of work section with 4 list items', async ({ page }) => {
    const outsideSection = page.locator('.about-section', { hasText: 'Outside of work' });
    await expect(outsideSection.locator('ul li')).toHaveCount(4);
  });

  test('should have say hi section with social links', async ({ page }) => {
    const sayHiSection = page.locator('.about-section', { hasText: 'Say hi' });
    const socialLinks = sayHiSection.locator('.social-link');
    await expect(socialLinks).toHaveCount(3);

    const expectedHrefs = [
      'https://github.com/Xerrion',
      'https://www.linkedin.com/in/lasse-skovgaard-nielsen/',
      'mailto:lasse@xerrion.dk'
    ];

    for (let i = 0; i < expectedHrefs.length; i++) {
      await expect(socialLinks.nth(i)).toHaveAttribute('href', expectedHrefs[i]);
    }
  });
});
