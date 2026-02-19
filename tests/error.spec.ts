import { test, expect } from '@playwright/test';

test.describe('Error Page (404)', () => {
	test('should return 404 status and show error for nonexistent URL', async ({ page }) => {
		const response = await page.goto('/this-page-does-not-exist-xyz');

		expect(response?.status()).toBe(404);

		const heading = page.locator('h1');
		await expect(heading).toContainText('404');
	});

	test('should return 404 for nonexistent nested route', async ({ page }) => {
		const response = await page.goto('/about/nonexistent-subpage');

		expect(response?.status()).toBe(404);

		const heading = page.locator('h1');
		await expect(heading).toContainText('404');
	});
});
