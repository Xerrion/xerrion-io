import { test, expect } from '@playwright/test';

test.describe('Sitemap', () => {
  test('should return sitemap.xml with correct structure and content', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/xml');
    
    const body = await response.text();
    
    expect(body).toContain('<?xml');
    expect(body).toContain('<urlset');
    
    const urls = [
      'https://xerrion.io/',
      'https://xerrion.io/about',
      'https://xerrion.io/projects',
      'https://xerrion.io/gallery'
    ];
    
    for (const url of urls) {
      expect(body).toContain(`<loc>${url}</loc>`);
    }
    
    expect(body).toContain('<lastmod>');
    expect(body).toContain('<changefreq>');
  });
});
