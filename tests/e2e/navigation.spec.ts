import { test, expect } from './public-fixtures'

const links = [
  ['Home', '/'], ['Projects', '/projects'], ['About', '/about'],
  ['Blog', '/blog'], ['Gallery', '/gallery']
]

test.describe('Public navigation', () => {
  test('shows the approved navigation order and home identity', async ({ page }) => {
    await page.goto('/')
    const navigation = page.locator('.desktop-navigation')
    await expect(navigation).toBeVisible()
    for (const [index, [label, href]] of links.entries()) {
      const link = navigation.locator('a').nth(index)
      await expect(link).toHaveText(label)
      await expect(link).toHaveAttribute('href', href)
    }
    await expect(navigation.getByRole('link', { name: /Say hi/ })).toHaveAttribute('href', 'mailto:lasse@xerrion.dk')
    await expect(page.locator('.site-header .brand')).toHaveAttribute('href', '/')
  })

  test('updates the active page after client navigation', async ({ page }) => {
    await page.goto('/')
    const navigation = page.locator('.desktop-navigation')
    await expect(navigation.locator('a[aria-current="page"]')).toHaveAttribute('href', '/')
    await navigation.getByRole('link', { name: 'About', exact: true }).click()
    await expect(page).toHaveURL('/about')
    await expect(navigation.locator('a[aria-current="page"]')).toHaveAttribute('href', '/about')
    await page.goBack()
    await expect(navigation.locator('a[aria-current="page"]')).toHaveAttribute('href', '/')
  })

  test('lets keyboard users skip directly to main content', async ({ page }) => {
    await page.goto('/')
    const skip = page.locator('.skip-link')
    await expect(skip).toHaveAttribute('href', '#main-content')
    await page.keyboard.press('Tab')
    await expect(skip).toBeFocused()
    await expect(skip).toBeInViewport()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()
  })

  test.describe('Mobile menu', () => {
    test.use({ viewport: { width: 390, height: 844 }, contextOptions: { reducedMotion: 'reduce' } })

    test('opens a native modal, protects the page, and restores focus', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      const trigger = page.getByRole('button', { name: 'Open navigation menu' })
      const dialog = page.locator('dialog.menu-dialog')
      const close = page.getByRole('button', { name: 'Close navigation menu' })
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await trigger.click()
      await expect(dialog).toBeVisible()
      expect(await dialog.evaluate(element => element.matches(':modal'))).toBe(true)
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await expect(close).toBeFocused()
      const underlyingLink = page.locator('.site-header .brand')
      await underlyingLink.evaluate(element => element.focus())
      await expect(close).toBeFocused()
      for (let index = 0; index < 13; index++) {
        await page.keyboard.press('Tab')
        expect(await dialog.evaluate(element => element.contains(document.activeElement) || document.activeElement === document.body)).toBe(true)
      }
      await close.focus()
      const before = await page.evaluate(() => scrollY)
      await page.mouse.move(375, 420)
      await page.mouse.wheel(0, 600)
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(before)
      await page.keyboard.press('Escape')
      await expect(dialog).not.toBeVisible()
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await expect(trigger).toBeFocused()
      await trigger.click()
      await close.click()
      await expect(dialog).not.toBeVisible()
      await expect(trigger).toBeFocused()
    })

    test('closes on navigation and marks the destination', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await page.locator('.menu-trigger').click()
      await page.locator('.mobile-navigation').getByRole('link', { name: /About/ }).click()
      await expect(page).toHaveURL('/about')
      await expect(page.locator('.menu-dialog')).not.toBeVisible()
      await expect(page.locator('.menu-trigger')).toHaveAttribute('aria-expanded', 'false')
      await page.locator('.menu-trigger').click()
      await expect(page.locator('.mobile-navigation a[aria-current="page"]')).toHaveAttribute('href', '/about')
    })

    test('closes and releases the page when resized to desktop', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await page.locator('.menu-trigger').click()
      await page.setViewportSize({ width: 1440, height: 1080 })
      await expect(page.locator('.menu-dialog')).not.toBeVisible()
      await expect(page.locator('.menu-trigger')).toHaveAttribute('aria-expanded', 'false')
      await expect(page.locator('.menu-trigger')).not.toBeVisible()
      await expect(page.locator('.desktop-navigation')).toBeVisible()
      expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden')
    })

    test('keeps a reopened menu active after a pending close event', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await page.locator('.menu-trigger').click()
      await page.locator('.menu-close').click()
      await page.evaluate(() => {
        const trigger = document.querySelector<HTMLButtonElement>('.menu-trigger')!
        const close = document.querySelector<HTMLButtonElement>('.menu-close')!
        trigger.click()
        close.click()
        trigger.click()
      })
      await expect(page.locator('.menu-dialog')).toBeVisible()
      await expect(page.locator('.menu-trigger')).toHaveAttribute('aria-expanded', 'true')
      await expect(page.locator('.menu-close')).toBeFocused()
      expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden')
      await page.keyboard.press('Escape')
      await expect(page.locator('.menu-dialog')).not.toBeVisible()
      await expect(page.locator('.menu-trigger')).toBeFocused()
    })
  })
})
