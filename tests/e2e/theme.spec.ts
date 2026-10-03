import { test, expect } from './public-fixtures'

test.describe('Public theme and saved admin preference', () => {
  for (const preference of ['light', 'dark'] as const) {
    test(`keeps B3 dark with the ${preference} system preference`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: preference })
      await page.addInitScript(() => localStorage.setItem('theme', 'light'))
      await page.goto('/')
      await expect(page.locator('.public-site')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Toggle theme' })).toHaveCount(0)
      const brightness = await page.locator('.public-site').evaluate(element => {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 1
        const context = canvas.getContext('2d')!
        context.fillStyle = getComputedStyle(document.body).backgroundColor
        context.fillRect(0, 0, 1, 1)
        const color = Array.from(context.getImageData(0, 0, 1, 1).data)
        if (color[3] !== 255) throw new Error('The page background is transparent')
        return color.slice(0, 3)
      })
      expect(Math.max(...brightness)).toBeLessThan(60)
      expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light')
    })
  }

  test('preserves the saved light preference when visiting admin', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'light'))
    await page.goto('/')
    await page.goto('/about')
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light')
    await page.goto('/admin/login')
    await expect(page.locator('.public-site')).toHaveCount(0)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible()
  })
})
