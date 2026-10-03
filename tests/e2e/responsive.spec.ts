import { test, expect, mockGallery, mockBlog, mockPublicData, navigatePublic, projects } from './public-fixtures'

test.describe('Responsive public design', () => {
  for (const width of [320, 390, 768, 1440]) {
    test('keeps public indexes within ' + width + 'px', async ({ page }, testInfo) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.setViewportSize({ width, height: 844 })
      await mockBlog(page)
      await mockPublicData(page, '/projects', { projects, error: null })
      for (const route of ['/', '/about', '/projects', '/blog', '/gallery', '/this-page-does-not-exist-xyz']) {
        const fixture = ['/projects', '/blog', '/gallery'].includes(route)
        if (fixture) await navigatePublic(page, route)
        else await page.goto(route)
        await expect(page.locator('main h1')).toBeVisible()
        await page.evaluate(async () => {
          await document.fonts.ready
          for (const image of document.images) image.loading = 'eager'
          await Promise.all(Array.from(document.images, image => image.decode().catch(() => {})))
        })
        expect(await page.evaluate(() => Array.from(document.images).filter(image => image.getAttribute('src') && (!image.complete || image.naturalWidth === 0)).map(image => image.getAttribute('src')))).toEqual([])
        const dimensions = await page.evaluate(() => ({
          content: document.documentElement.scrollWidth,
          viewport: innerWidth
        }))
        expect(dimensions.content, route + ' horizontal overflow').toBeLessThanOrEqual(dimensions.viewport + 1)
        await expect(page.locator('.menu-trigger')).toBeVisible({ visible: width <= 740 })
        await expect(page.locator('.desktop-navigation')).toBeVisible({ visible: width > 740 })
        if (width === 390 || width === 1440)
          await testInfo.attach((fixture ? 'fixture-' : '') + (route === '/' ? 'home' : route.slice(1)), { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
      }
    })
  }

  test('keeps portrait and landscape gallery photos within mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockGallery(page, 3)
    await navigatePublic(page, '/gallery')
    for (const photo of await page.locator('.photo-card').all()) {
      const bounds = await photo.boundingBox()
      expect(bounds!.x).toBeGreaterThanOrEqual(0)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391)
  })
})
