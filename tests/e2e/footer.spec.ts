import { test, expect } from './public-fixtures'

test.describe('Public footer', () => {
  for (const route of ['/', '/about']) {
    test(`shows identity and real contact links on ${route}`, async ({ page }) => {
      await page.goto(route)
      const footer = page.getByRole('contentinfo')
      await footer.scrollIntoViewIfNeeded()
      await expect(footer).toContainText('Lasse Skovgaard Nielsen')
      await expect(footer).toContainText('Odense')
      for (const href of ['mailto:lasse@xerrion.dk', 'https://github.com/Xerrion', 'https://www.linkedin.com/in/lasse-skovgaard-nielsen/'])
        await expect(footer.locator('a[href="' + href + '"]')).toBeVisible()
      const back = footer.getByRole('link', { name: /Back to top/ })
      await back.click()
      await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(5)
    })
  }
})
