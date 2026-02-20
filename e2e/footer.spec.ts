import { test, expect } from '@playwright/test';

test.describe('Footer', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should display footer with correct content on home page', async ({ page }) => {
		const footer = page.locator('.footer');
		await footer.scrollIntoViewIfNeeded();
		await expect(footer).toBeVisible();

		const footerText = page.locator('.footer-text');
		await expect(footerText).toContainText('Built with Svelte by Lasse. Say hi sometime.');

		const socialLinksContainer = page.locator('.social-links.sm');
		await expect(socialLinksContainer).toBeVisible();
		
		const socialLinks = socialLinksContainer.locator('.social-link');
		await expect(socialLinks).toHaveCount(3);

		const expectedHrefs = [
			'https://github.com/Xerrion',
			'https://www.linkedin.com/in/lasse-skovgaard-nielsen/',
			'mailto:lasse@xerrion.dk'
		];

		for (const href of expectedHrefs) {
			await expect(page.locator(`.footer .social-link[href="${href}"]`)).toBeVisible();
		}

		const currentYear = new Date().getFullYear().toString();
		const copyright = page.locator('.copyright');
		await expect(copyright).toContainText('©');
		await expect(copyright).toContainText(currentYear);
		await expect(copyright).toContainText('Odense, Denmark');
	});

	test('should be present on the about page', async ({ page }) => {
		await page.goto('/about');
		const footer = page.locator('.footer');
		await footer.scrollIntoViewIfNeeded();
		await expect(footer).toBeVisible();
		
		await expect(page.locator('.footer-text')).toContainText('Built with Svelte by Lasse');
	});
});
