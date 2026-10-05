import { test, expect, mockGallery, navigatePublic } from './public-fixtures'

test.describe('Public accessibility', () => {
  test('uses landmarks and a single page heading on all public indexes', async ({ page }) => {
    for (const route of ['/', '/about', '/projects', '/blog', '/gallery']) {
      await page.goto(route)
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.getByRole('main')).toHaveCount(1)
      await expect(page.getByRole('main')).toBeVisible()
      await expect(page.getByRole('contentinfo')).toHaveCount(1)
      await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true })).toBeVisible()
    }
  })

  test('keeps contact actions and external links understandable', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Toggle theme' })).toHaveCount(0)
    const external = page.locator('.public-site a[target="_blank"]')
    expect(await external.count()).toBeGreaterThan(0)
    for (const link of await external.all())
      await expect(link).toHaveAttribute('rel', /noopener/)
    const email = page.getByRole('contentinfo').locator('a[href="mailto:lasse@xerrion.dk"]')
    await expect(email).toHaveAttribute('href', 'mailto:lasse@xerrion.dk')
  })

  test('gives gallery controls names and supports keyboard viewing', async ({ page }) => {
    await mockGallery(page, 3)
    await navigatePublic(page, '/gallery')
    const photo = page.locator('.photo-button').first()
    await expect(photo).toHaveAttribute('aria-label', /View.*fullscreen/)
    await photo.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Photo viewer' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(page.getByRole('button', { name: 'Close viewer' })).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.lightbox-counter')).toHaveText('2 / 3')
    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('.lightbox-counter')).toHaveText('1 / 3')
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  })
})
