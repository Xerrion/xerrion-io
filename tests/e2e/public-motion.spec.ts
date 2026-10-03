import { test, expect } from './public-fixtures'

test.describe('Public motion', () => {
  test('renders a real intermediate menu entrance and exit', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.locator('.menu-trigger').click()
    const dialog = page.locator('.menu-dialog')
    const entrance = await dialog.evaluate(element => {
      const animation = element.getAnimations().find(animation => animation instanceof CSSAnimation && animation.animationName.includes('menu-arrive'))!
      const duration = Number(animation.effect!.getTiming().duration)
      animation.pause()
      animation.currentTime = duration / 2
      return { duration, opacity: Number(getComputedStyle(element).opacity) }
    })
    expect(entrance.duration).toBe(180)
    expect(entrance.opacity).toBeGreaterThan(0)
    expect(entrance.opacity).toBeLessThan(1)
    await testInfo.attach('menu-entrance-intermediate', { body: await page.screenshot(), contentType: 'image/png' })
    await dialog.evaluate(element => element.getAnimations().forEach(animation => animation.finish()))
    await page.locator('.menu-close').click()
    const exit = await dialog.evaluate(element => {
      const animation = element.getAnimations().find(animation => !(animation instanceof CSSAnimation))!
      const duration = Number(animation.effect!.getTiming().duration)
      animation.pause()
      animation.currentTime = duration / 2
      return { duration, opacity: Number(getComputedStyle(element).opacity) }
    })
    expect(exit.opacity).toBeGreaterThan(0)
    expect(exit.opacity).toBeLessThan(1)
    await testInfo.attach('menu-exit-intermediate', { body: await page.screenshot(), contentType: 'image/png' })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(dialog).not.toBeVisible()
    await expect(page.locator('.menu-trigger')).toHaveAttribute('aria-expanded', 'false')
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden')
  })

  test('shows a scroll reveal intermediate frame and responds to a changed motion preference', async ({ page }, testInfo) => {
    await page.goto('/')
    const row = page.locator('main #about')
    await expect.poll(() => row.evaluate(element => element.getAnimations().length)).toBeGreaterThan(0)
    await row.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await expect.poll(() => row.evaluate(element => element.getAnimations()[0]?.playState)).toBe('running')
    const sample = await row.evaluate(element => {
      const animation = element.getAnimations()[0]
      const duration = Number(animation.effect!.getTiming().duration)
      animation.pause()
      animation.currentTime = duration / 2
      return { opacity: Number(getComputedStyle(element).opacity), transform: getComputedStyle(element).transform }
    })
    expect(sample.opacity).toBeGreaterThan(0)
    expect(sample.opacity).toBeLessThan(1)
    expect(sample.transform).not.toBe('none')
    await testInfo.attach('scroll-reveal-intermediate', { body: await page.screenshot(), contentType: 'image/png' })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect.poll(() => row.evaluate(element => element.getAnimations().length)).toBe(0)
    await expect(row).toHaveCSS('opacity', '1')
    await expect(row).toHaveCSS('transform', 'none')
    await expect(row.getByRole('link').first()).toBeVisible()
  })

  test('does not hide content or animate the menu with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.locator('main h1')).toHaveCSS('opacity', '1')
    await expect(page.locator('main #gallery')).toHaveCSS('opacity', '1')
    expect(await page.locator('main').evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0)
    await page.locator('.menu-trigger').click()
    await expect(page.locator('.menu-dialog')).toHaveCSS('animation-name', 'none')
    await page.locator('.menu-close').click()
    await expect(page.locator('.menu-dialog')).not.toBeVisible()
  })

  test('shows unrevealed content when its link receives keyboard focus', async ({ page }) => {
    await page.goto('/')
    const row = page.locator('main #gallery')
    await expect.poll(() => row.evaluate(element => element.getAnimations().length)).toBeGreaterThan(0)
    await row.getByRole('link').first().focus()
    await expect(row).toHaveCSS('opacity', '1')
    expect(await row.evaluate(element => element.getAnimations().length)).toBe(0)
  })
})
