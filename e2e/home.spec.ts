import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have correct title containing Xerrion', async ({ page }) => {
    await expect(page).toHaveTitle(/Xerrion/);
  });

  test('should display the hero section', async ({ page }) => {
    await expect(page.locator('.hero')).toBeVisible();
  });

  test('should display greeting with highlight name', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toContainText("Hey, I'm");
    await expect(heading.locator('.highlight')).toContainText('Lasse');
  });

  test('should display the wave emoji', async ({ page }) => {
    const wave = page.locator('.wave');
    await expect(wave).toBeVisible();
    await expect(wave).toContainText('👋');
  });

  test('should display the tagline with text', async ({ page }) => {
    const tagline = page.locator('.tagline');
    await expect(tagline).toBeVisible();
    await expect(tagline).not.toBeEmpty();
  });

  test('should display the intro paragraph with text', async ({ page }) => {
    const intro = page.locator('.intro');
    await expect(intro).toBeVisible();
    await expect(intro).not.toBeEmpty();
  });

  test('should display exactly 3 social links in hero section', async ({ page }) => {
    const heroLinks = page.locator('.hero .social-link');
    await expect(heroLinks).toHaveCount(3);
  });

  test('should have correct social link hrefs and aria-labels', async ({ page }) => {
    const hero = page.locator('.hero');

    const githubLink = hero.locator('.social-link[href="https://github.com/Xerrion"]');
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('aria-label', /github/i);

    const linkedinLink = hero.locator('.social-link[href="https://www.linkedin.com/in/lasse-skovgaard-nielsen/"]');
    await expect(linkedinLink).toBeVisible();
    await expect(linkedinLink).toHaveAttribute('aria-label', /linkedin/i);

    const emailLink = hero.locator('.social-link[href="mailto:lasse@xerrion.dk"]');
    await expect(emailLink).toBeVisible();
    await expect(emailLink).toHaveAttribute('aria-label', /email/i);
  });

  test('should display the nav cards section', async ({ page }) => {
    await expect(page.locator('.nav-cards')).toBeVisible();
  });

  test('should have exactly 3 nav cards', async ({ page }) => {
    await expect(page.locator('.nav-card')).toHaveCount(3);
  });

  test('should display about nav card correctly', async ({ page }) => {
    const aboutCard = page.locator('.nav-card[href="/about"]');
    await expect(aboutCard).toBeVisible();
    await expect(aboutCard.locator('.card-emoji')).toContainText('🧑‍💻');
    await expect(aboutCard).toContainText('About');
  });

  test('should display projects nav card correctly', async ({ page }) => {
    const projectsCard = page.locator('.nav-card[href="/projects"]');
    await expect(projectsCard).toBeVisible();
    await expect(projectsCard.locator('.card-emoji')).toContainText('🛠️');
    await expect(projectsCard).toContainText('Projects');
  });

  test('should display gallery nav card correctly', async ({ page }) => {
    const galleryCard = page.locator('.nav-card[href="/gallery"]');
    await expect(galleryCard).toBeVisible();
    await expect(galleryCard.locator('.card-emoji')).toContainText('📸');
    await expect(galleryCard).toContainText('Gallery');
  });

  test('should navigate to the about page when about nav card is clicked', async ({ page }) => {
    await page.locator('.nav-card[href="/about"]').click();
    await expect(page).toHaveURL(/\/about/);
  });

  test('should display the status list with 4 items', async ({ page }) => {
    const statusList = page.locator('.status-list');
    await expect(statusList).toBeVisible();
    await expect(statusList.locator('li')).toHaveCount(4);
  });

  test('should display correct status items content', async ({ page }) => {
    const items = page.locator('.status-list li');
    
    await expect(items.filter({ hasText: 'TV 2 Danmark' })).toContainText('💼');
    await expect(items.filter({ hasText: 'Rust' })).toContainText('🦀');
    await expect(items.filter({ hasText: 'Charlie' })).toContainText('🐕');
    await expect(items.filter({ hasText: 'Gaming' })).toContainText('🎮');
  });
});
