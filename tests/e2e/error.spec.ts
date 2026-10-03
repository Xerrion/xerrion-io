import { test, expect } from './public-fixtures'

test.describe('Not-found page', () => {
  for (const route of ['/this-page-does-not-exist-xyz', '/about/this-page-does-not-exist-xyz']) {
    test('returns 404 and offers recovery from ' + route, async ({ page }) => {
      const response = await page.goto(route)
      expect(response?.status()).toBe(404)
      await expect(page.locator('h1')).toContainText("isn't here")
      await expect(page.locator('body')).toContainText('404')
      const home = page.getByRole('link', { name: /Back to home/ })
      await expect(home).toHaveAttribute('href', '/')
      await home.click()
      await expect(page).toHaveURL('/')
      await expect(page.locator('main h1')).toContainText("I'm Lasse.")
    })
  }
})
