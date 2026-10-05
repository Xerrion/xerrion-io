import { test, expect, mockBlog, navigatePublic, blogPosts, articleCode } from './public-fixtures'

test.describe('Blog article', () => {
  test.beforeEach(async ({ page }) => {
    await mockBlog(page)
    await navigatePublic(page, '/blog')
    await page.locator('.post-card').first().getByRole('link', { name: blogPosts[0].title, exact: true }).click()
    await expect(page.locator('main h1')).toHaveText(blogPosts[0].title)
  })

  test('provides headings, metadata, contents and adjacent post navigation', async ({ page }) => {
    await expect(page.locator('.desktop-navigation a[aria-current="page"]')).toHaveAttribute('href', '/blog')
    await expect(page.locator('.post-meta')).toContainText('April 7, 2026')
    await expect(page.locator('.post-meta')).toContainText('16 min read')
    const contents = page.getByRole('navigation', { name: 'On this page' })
    await expect(contents.getByRole('link')).toHaveCount(2)
    await contents.getByRole('link').last().click()
    await expect(page).toHaveURL(/#tool-handler$/)
    await expect(page.locator('#tool-handler')).toBeFocused()
    await expect(page.getByRole('navigation', { name: 'Post navigation' }).getByRole('link')).toHaveAttribute('href', '/blog/' + blogPosts[1].slug)
    await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: /Back to the blog/ }).click()
    await expect(page).toHaveURL('/blog')
    await expect(page.locator('.post-card')).toHaveCount(2)
  })

  test('copies the actual code text and gives confirmation', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.getByRole('button', { name: 'Copy code example 1' }).click()
    await expect(page.locator('.code-copy-status')).toHaveText('Code copied to the clipboard.')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(articleCode)
  })

  test('allows keyboard copying when the clipboard API fails', async ({ page }) => {
    await page.evaluate(() => {
      Object.defineProperty(navigator.clipboard, 'writeText', { value: async () => { throw new Error('Test clipboard unavailable') } })
    })
    await page.getByRole('button', { name: 'Copy code example 1' }).click()
    await expect(page.locator('.code-copy-status')).toHaveText('The code is selected. Copy it with your keyboard or browser menu.')
    expect(await page.evaluate(() => getSelection()?.toString())).toBe(articleCode)
    await expect(page.locator('.post-content pre')).toBeFocused()
  })

  test('keeps long titles and code within all requested viewport widths', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 })
      const bounds = await page.locator('.post-content pre').evaluate(element => ({
        width: element.getBoundingClientRect().width,
        client: element.clientWidth,
        content: element.scrollWidth,
        overflow: getComputedStyle(element).overflowX
      }))
      expect(bounds.width).toBeLessThanOrEqual(width)
      expect(bounds.overflow).toBe('auto')
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1)
      if (width === 320) expect(bounds.content).toBeGreaterThan(bounds.client)
      if (width === 390 || width === 1440)
        await testInfo.attach('fixture-article-' + width, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    }
  })
})
