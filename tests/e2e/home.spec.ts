import { test, expect } from './public-fixtures'

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/') })

  test('introduces Lasse and the work he does', async ({ page }) => {
    await expect(page).toHaveTitle(/Xerrion/)
    await expect(page.locator('main h1')).toContainText("I'm Lasse.")
    await expect(page.locator('main h1')).toContainText('I build software.')
    await expect(page.locator('main')).toContainText('TV 2 Danmark')
    await expect(page.locator('main')).toContainText('Odense')
  })

  test('features the real Particle Foundry screenshot and source', async ({ page }) => {
    const image = page.locator('main img[alt*="Particle Foundry"]')
    await image.scrollIntoViewIfNeeded()
    await expect(image).toBeVisible()
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0)
    expect(await image.evaluate(element => getComputedStyle(element).objectFit)).toBe('contain')
    await expect(page.locator('main a[href="https://github.com/Xerrion/particle-foundry"]').first()).toHaveAttribute('target', '_blank')
  })

  test('connects visitors to all public sections', async ({ page }) => {
    for (const route of ['/projects', '/about', '/blog', '/gallery'])
      await expect(page.locator('main a[href="' + route + '"]').first()).toBeAttached()
    await page.locator('main a[href="/about"]').first().click()
    await expect(page).toHaveURL('/about')
  })
})
