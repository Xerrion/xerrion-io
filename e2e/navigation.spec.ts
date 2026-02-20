import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('header is visible and fixed', async ({ page }) => {
    const header = page.locator('.header');
    await expect(header).toBeVisible();
    await expect(header).toHaveCSS('position', 'fixed');
  });

  test('logo is visible, contains text and links to home', async ({ page }) => {
    const logo = page.locator('.logo');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('href', '/');
    
    const logoText = logo.locator('.logo-text');
    await expect(logoText).toHaveText('Xerrion');
    
    await logo.click();
    await expect(page).toHaveURL('/');
  });

  test('nav links exist with correct text and href', async ({ page }) => {
    const navLinks = page.locator('.nav-link');
    await expect(navLinks).toHaveCount(4);
    
    const expectedLinks = [
      { text: 'Home', href: '/' },
      { text: 'About', href: '/about' },
      { text: 'Projects', href: '/projects' },
      { text: 'Gallery', href: '/gallery' },
    ];
    
    for (let i = 0; i < expectedLinks.length; i++) {
      const link = navLinks.nth(i);
      await expect(link).toHaveText(expectedLinks[i].text);
      await expect(link).toHaveAttribute('href', expectedLinks[i].href);
    }
  });

  test('active state works correctly', async ({ page }) => {
    const homeLink = page.locator('.nav-link', { hasText: 'Home' });
    await expect(homeLink).toHaveClass(/active/);
    
    await page.goto('/about');
    const aboutLink = page.locator('.nav-link', { hasText: 'About' });
    await expect(aboutLink).toHaveClass(/active/);
    await expect(homeLink).not.toHaveClass(/active/);
  });

  test('navigation links work', async ({ page }) => {
    await page.click('.nav-link:has-text("About")');
    await expect(page).toHaveURL('/about');
  });

  test('skip-to-content link works correctly', async ({ page }) => {
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toHaveAttribute('href', '#main-content');
    
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeAttached();
  });
});
