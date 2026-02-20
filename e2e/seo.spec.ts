import { test, expect } from '@playwright/test';

test.describe('SEO Meta Tags', () => {
  const pages = [
    { path: '/', title: /Xerrion/, ogType: 'website' },
    { path: '/about', title: /About.*Xerrion/, ogType: 'profile' },
    { path: '/projects', title: /Projects.*Xerrion/, ogType: 'website' },
    { path: '/gallery', title: /Gallery.*Xerrion/, ogType: 'website' },
  ];

  for (const pageInfo of pages) {
    test(`Verify SEO meta tags for ${pageInfo.path}`, async ({ page }) => {
      await page.goto(pageInfo.path);

      await expect(page).toHaveTitle(pageInfo.title);

      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute('content', /.+/);

      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute('href', new RegExp(`${pageInfo.path}$`));

      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveAttribute('content', /.+/);

      const ogDescription = page.locator('meta[property="og:description"]');
      await expect(ogDescription).toHaveAttribute('content', /.+/);

      const ogUrl = page.locator('meta[property="og:url"]');
      await expect(ogUrl).toHaveAttribute('content', new RegExp(`${pageInfo.path}$`));

      const ogType = page.locator('meta[property="og:type"]');
      await expect(ogType).toHaveAttribute('content', pageInfo.ogType);

      const ogSiteName = page.locator('meta[property="og:site_name"]');
      await expect(ogSiteName).toHaveAttribute('content', 'Xerrion');

      const twitterCard = page.locator('meta[name="twitter:card"]');
      await expect(twitterCard).toHaveAttribute('content', 'summary_large_image');

      const twitterTitle = page.locator('meta[name="twitter:title"]');
      await expect(twitterTitle).toHaveAttribute('content', /.+/);

      const twitterDescription = page.locator('meta[name="twitter:description"]');
      await expect(twitterDescription).toHaveAttribute('content', /.+/);

      const jsonLd = page.locator('script[type="application/ld+json"]');
      await expect(jsonLd.first()).toBeAttached();
      const jsonContent = await jsonLd.first().innerHTML();
      const parsedJson = JSON.parse(jsonContent);
      const firstItem = Array.isArray(parsedJson) ? parsedJson[0] : parsedJson;
      expect(firstItem).toHaveProperty('@type');
      expect(typeof firstItem['@type']).toBe('string');
    });
  }
});
