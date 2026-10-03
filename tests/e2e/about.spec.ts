import { test, expect } from './public-fixtures'

test.describe('About page', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/about') })

  test('presents the longer introduction and professional background', async ({ page }) => {
    await expect(page).toHaveTitle(/About.*Xerrion/)
    await expect(page.locator('main h1')).toContainText('The longer')
    await expect(page.locator('main h1')).toContainText('version.')
    await expect(page.locator('main')).toContainText('Lasse Skovgaard Nielsen')
    await expect(page.locator('main')).toContainText('TV 2 Danmark')
    await expect(page.locator('main')).toContainText('satellite communications')
    for (const technology of ['TypeScript', 'Rust', 'Svelte', 'ServiceNow'])
      await expect(page.locator('main')).toContainText(technology)
  })

  test('links Charlie and the outside-work section to the gallery', async ({ page }) => {
    await expect(page.locator('main')).toContainText('Charlie')
    await expect(page.locator('main')).toContainText('golden retriever')
    const gallery = page.locator('main a[href="/gallery"]').first()
    await expect(gallery).toBeVisible()
    await gallery.click()
    await expect(page).toHaveURL('/gallery')
  })

  test('provides working source, professional profile and email links', async ({ page }) => {
    for (const href of ['https://github.com/Xerrion', 'https://www.linkedin.com/in/lasse-skovgaard-nielsen/', 'mailto:lasse@xerrion.dk'])
      await expect(page.locator('main a[href="' + href + '"]').first()).toBeAttached()
  })
})
