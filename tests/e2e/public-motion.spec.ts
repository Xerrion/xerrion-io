import type { Locator, Page, TestInfo } from '@playwright/test'

import { test, expect } from './public-fixtures'

async function captureFrame(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const path = testInfo.outputPath(name + '.png')
  await page.screenshot({ path })
  await testInfo.attach(name, { path, contentType: 'image/png' })
}

async function sampleReveal(element: Locator): Promise<{ opacity: number; transform: string; scale: number }> {
  await expect.poll(() => element.evaluate(node => node.getAnimations()[0]?.playState)).toBe('running')
  return element.evaluate(node => {
    const animation = node.getAnimations()[0]
    const timing = animation.effect!.getTiming()
    animation.pause()
    animation.currentTime = Number(timing.delay) + Number(timing.duration) / 4
    const style = getComputedStyle(node)
    const matrix = style.transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(style.transform)
    return { opacity: Number(style.opacity), transform: style.transform, scale: matrix.a }
  })
}

async function sampleHover(element: Locator): Promise<{
  start: { x: number; y: number; scale: number }
  intermediate: { x: number; y: number; scale: number }
  end: { x: number; y: number; scale: number }
}> {
  return element.evaluate(node => {
    const animation = node.getAnimations().find(animation =>
      animation instanceof CSSTransition && animation.transitionProperty === 'transform'
    )
    if (!animation) throw new Error('Expected a transform transition after hover')
    const duration = Number(animation.effect!.getTiming().duration)
    animation.pause()
    const at = (time: number): { x: number; y: number; scale: number } => {
      animation.currentTime = time
      const transform = getComputedStyle(node).transform
      const matrix = transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(transform)
      return { x: matrix.m41, y: matrix.m42, scale: matrix.a }
    }
    const start = at(0)
    const end = at(duration)
    const intermediate = at(duration / 4)
    return { start, intermediate, end }
  })
}

async function expectInstantTransition(element: Locator): Promise<void> {
  const duration = await element.evaluate(node => Math.max(
    ...getComputedStyle(node).transitionDuration.split(',').map(value => Number.parseFloat(value) * 1000)
  ))
  expect(duration).toBeLessThanOrEqual(1)
  await expect.poll(() => element.evaluate(node => node.getAnimations().length)).toBe(0)
}

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
    await captureFrame(page, testInfo, 'menu-entrance-intermediate')
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
    await captureFrame(page, testInfo, 'menu-exit-intermediate')
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
    await captureFrame(page, testInfo, 'scroll-reveal-intermediate')
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
    await expect.poll(() => row.evaluate(element => element.getAnimations().filter(animation =>
      !(animation instanceof CSSTransition) && !(animation instanceof CSSAnimation)
    ).length)).toBe(0)
  })

  test('reveals About tools, prose and photo independently when scrolled into view', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 320 })
    await page.goto('/about')
    const tool = page.locator('.about-tools dl > div').first()
    const prose = page.locator('#about-life-title')
    const photo = page.locator('.about-charlie')
    for (const element of [tool, prose, photo])
      await expect.poll(() => element.evaluate(node => node.getAnimations()[0]?.playState)).toBe('paused')

    await tool.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
    const toolSample = await sampleReveal(tool)
    expect(toolSample.opacity).toBeGreaterThan(0)
    expect(toolSample.opacity).toBeLessThan(1)
    expect(toolSample.transform).not.toBe('none')
    expect(await prose.evaluate(node => node.getAnimations()[0]?.playState)).toBe('paused')
    expect(await photo.evaluate(node => node.getAnimations()[0]?.playState)).toBe('paused')
    await captureFrame(page, testInfo, 'about-tool-reveal-intermediate')
    await tool.evaluate(node => node.getAnimations().forEach(animation => animation.finish()))

    await prose.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
    const proseSample = await sampleReveal(prose)
    expect(proseSample.opacity).toBeGreaterThan(0)
    expect(proseSample.opacity).toBeLessThan(1)
    expect(proseSample.transform).not.toBe('none')
    expect(await photo.evaluate(node => node.getAnimations()[0]?.playState)).toBe('paused')
    await captureFrame(page, testInfo, 'about-prose-reveal-intermediate')
    await prose.evaluate(node => node.getAnimations().forEach(animation => animation.finish()))

    await photo.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
    const photoSample = await sampleReveal(photo)
    expect(photoSample.opacity).toBeGreaterThan(0)
    expect(photoSample.opacity).toBeLessThan(1)
    expect(photoSample.scale).toBeGreaterThan(0)
    expect(photoSample.scale).toBeLessThan(1)
    await expect.poll(() => photo.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
    await captureFrame(page, testInfo, 'about-photo-reveal-intermediate')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const element of [tool, prose, photo]) {
      await expect.poll(() => element.evaluate(node => node.getAnimations().length)).toBe(0)
      await expect(element).toHaveCSS('opacity', '1')
      await expect(element).toHaveCSS('transform', 'none')
    }
  })

  test('renders intermediate About hover transforms and removes them when motion preference changes', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1080 })
    await page.goto('/about')
    const link = page.getByRole('link', { name: 'See my projects', exact: true })
    await link.scrollIntoViewIfNeeded()
    await expect.poll(() => link.evaluate(node => node.getAnimations().length)).toBe(0)
    await link.hover()
    const arrow = link.locator('.link-arrow')
    const arrowSample = await sampleHover(arrow)
    expect(arrowSample.intermediate.x).toBeGreaterThan(arrowSample.start.x)
    expect(arrowSample.intermediate.x).toBeLessThan(arrowSample.end.x)
    await captureFrame(page, testInfo, 'about-link-hover-intermediate')

    await page.mouse.move(0, 0)
    const photo = page.locator('.about-charlie')
    await photo.scrollIntoViewIfNeeded()
    await expect.poll(() => photo.evaluate(node => node.getAnimations().length)).toBe(0)
    await expect.poll(() => photo.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
    await photo.hover()
    const image = photo.locator('img')
    const imageSample = await sampleHover(image)
    expect(imageSample.intermediate.scale).toBeGreaterThan(imageSample.start.scale)
    expect(imageSample.intermediate.scale).toBeLessThan(imageSample.end.scale)
    await expect(photo.locator('.charlie-photo')).toHaveCSS('overflow', 'hidden')
    await captureFrame(page, testInfo, 'about-photo-hover-intermediate')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const element of [arrow, image]) {
      await expect(element).toHaveCSS('transform', 'none')
      await expectInstantTransition(element)
    }
  })

  test('keeps About content visible and disables hover transforms with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/about')
    expect(await page.locator('main').evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0)
    for (const element of [page.locator('.about-tools dl > div').first(), page.locator('#about-life-title'), page.locator('.about-charlie')])
      await expect(element).toHaveCSS('opacity', '1')
    const tool = page.locator('.about-tools dl > div').first()
    await tool.hover()
    await expect(tool.locator('.tool-icon')).toHaveCSS('transform', 'none')
    await expectInstantTransition(tool.locator('.tool-icon'))
    const link = page.getByRole('link', { name: 'See my projects', exact: true })
    await link.hover()
    await expect(link.locator('.link-arrow')).toHaveCSS('transform', 'none')
    const photo = page.locator('.about-charlie')
    await photo.hover()
    await expect(photo.locator('img')).toHaveCSS('transform', 'none')
    await expectInstantTransition(photo.locator('img'))
    expect(await page.locator('main').evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0)
  })
})
