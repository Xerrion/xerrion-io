import { test, expect, mockGallery, navigatePublic } from './public-fixtures'

test.describe('Gallery', () => {
  test.beforeEach(async ({ page }) => {
    await mockGallery(page)
    await navigatePublic(page, '/gallery')
  })

  test('shows photos and category counts without broken images', async ({ page }) => {
    await expect(page.locator('main h1')).toContainText('Away from')
    await expect(page.locator('.photo-card')).toHaveCount(20)
    await expect(page.getByRole('navigation', { name: 'Photo categories' })).toBeVisible()
    await expect(page.locator('.filter-btn').filter({ hasText: 'Charlie' })).toContainText('22')
    await expect.poll(() => page.locator('.photo-card img').first().evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
  })

  test('keeps category and load-more state in the URL', async ({ page }) => {
    await page.locator('.filter-btn').filter({ hasText: 'Charlie' }).click()
    await expect(page).toHaveURL(/category=charlie/)
    await expect(page.locator('.photo-card')).toHaveCount(20)
    await page.getByRole('link', { name: /Load more/ }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page).toHaveURL(/category=charlie/)
    await expect(page.locator('.photo-card')).toHaveCount(22)
    await expect(page.locator('.photo-button').nth(20)).toBeFocused()
    await expect(page.getByRole('link', { name: /Load more/ })).toHaveCount(0)
    await page.locator('.filter-btn').filter({ hasText: 'Empty album' }).click()
    await expect(page).toHaveURL(/category=empty/)
    expect(new URL(page.url()).searchParams.has('page')).toBe(false)
    await expect(page.locator('.photo-card')).toHaveCount(0)
    await expect(page.locator('main')).toContainText(/No photos|empty/i)
    await page.locator('.filter-btn').filter({ hasText: /^All/ }).click()
    await expect(page.locator('.photo-card')).toHaveCount(20)
    expect(new URL(page.url()).searchParams.has('category')).toBe(false)
  })

  test('opens the viewer, respects both boundaries, and closes with Escape', async ({ page }) => {
    const first = page.locator('.photo-button').first()
    await first.click()
    const dialog = page.getByRole('dialog', { name: 'Photo viewer' })
    await expect(dialog).toBeVisible()
    await expect(page.locator('.lightbox-counter')).toContainText('1 /')
    await expect(page.getByRole('button', { name: 'Previous photo' })).toBeDisabled()
    await page.getByRole('button', { name: 'Next photo' }).click()
    await expect(page.locator('.lightbox-counter')).toContainText('2 /')
    await page.getByRole('button', { name: 'Previous photo' }).click()
    await expect(page.locator('.lightbox-counter')).toContainText('1 /')
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  })

  test('disables next on the final photo', async ({ page }) => {
    await page.locator('.photo-button').last().click()
    await expect(page.getByRole('button', { name: 'Next photo' })).toBeDisabled()
    await expect(page.locator('.lightbox-counter')).toContainText('20 / 20')
    await page.getByRole('button', { name: 'Close viewer' }).click()
    await expect(page.getByRole('dialog', { name: 'Photo viewer' })).not.toBeVisible()
  })
})

test.describe('Gallery server query validation', () => {
  for (const category of ['constructor', 'toString', '__proto__']) {
    test('handles an unknown category named ' + category, async ({ request }) => {
      const response = await request.get('/gallery?category=' + encodeURIComponent(category))
      expect(response.status()).toBe(200)
      const html = await response.text()
      const main = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0] ?? ''
      expect(/class="[^"]*\bgallery-page\b/.test(main)).toBe(true)
      expect(/class="[^"]*\bgallery-error\b/.test(main)).toBe(false)
      expect(main.includes('NaN')).toBe(false)
    })
  }
})
