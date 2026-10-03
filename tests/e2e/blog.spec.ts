import { test, expect, mockBlog, navigatePublic, blogPosts } from './public-fixtures'

test.describe('Blog index', () => {
  test.beforeEach(async ({ page }) => {
    await mockBlog(page)
    await navigatePublic(page, '/blog')
  })

  test('renders posts, dates, cover and real feed routes', async ({ page }) => {
    await expect(page.locator('.post-card')).toHaveCount(2)
    await expect(page.locator('.post-card').first()).toContainText(blogPosts[0].title)
    await expect(page.locator('.post-card').first()).toContainText('April 7, 2026')
    await expect(page.locator('.post-card').last()).toContainText('March 30, 2026')
    await expect(page.locator('.post-card').last().locator('img')).toBeAttached()
    await expect(page.getByRole('link', { name: /RSS feed/ })).toHaveAttribute('href', '/blog/rss.xml')
    await expect(page.getByRole('link', { name: /Atom feed/ })).toHaveAttribute('href', '/blog/atom.xml')
  })

  test('filters by tag and preserves both available tag choices', async ({ page }) => {
    await page.locator('.blog-filters').getByRole('link', { name: 'MCP', exact: true }).click()
    await expect(page).toHaveURL(/tag=mcp/)
    await expect(page.locator('.post-card')).toHaveCount(1)
    await expect(page.locator('.blog-filters a[aria-current="true"]')).toHaveText('MCP')
    await page.locator('.blog-filters').getByRole('link', { name: 'Dogs', exact: true }).click()
    await expect(page).toHaveURL(/tag=dogs/)
    await expect(page.locator('.post-card')).toHaveCount(1)
    await expect(page.locator('.post-card')).toContainText('Charlie')
    await page.getByRole('link', { name: /Clear filter/ }).click()
    await expect(page).toHaveURL('/blog')
    await expect(page.locator('.post-card')).toHaveCount(2)
  })

  test('provides a useful empty state for a tag without posts', async ({ page }) => {
    await page.evaluate(() => {
      const anchor = document.createElement('a')
      anchor.href = '/blog?tag=unknown'
      anchor.textContent = 'Open unmatched tag'
      document.querySelector('main')!.append(anchor)
    })
    await page.getByRole('link', { name: 'Open unmatched tag' }).click()
    await expect(page.locator('.post-card')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Nothing with this tag yet.' })).toBeVisible()
    await page.getByRole('link', { name: /See all posts/ }).click()
    await expect(page.locator('.post-card')).toHaveCount(2)
  })
})
