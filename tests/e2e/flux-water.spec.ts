import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import type { Page } from '@playwright/test'

import { test, expect } from './public-fixtures'

async function openWater(page: Page): Promise<void> {
  await page.goto('/tools/flux-water')
  await expect(page.locator('.water-canvas')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 })
}

async function snapshot(page: Page): Promise<Buffer> {
  const waiting = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save image', exact: true }).click()
  const download = await waiting
  expect(download.suggestedFilename()).toMatch(/^flux-water-[a-z]+\.png$/)
  return readFile((await download.path())!)
}

test('discovers both tools from desktop and mobile navigation', async ({ page }) => {
  await page.goto('/about')
  await page.waitForLoadState('networkidle')
  await page.locator('.desktop-navigation').getByRole('link', { name: 'Tools', exact: true }).click()
  await expect(page).toHaveURL('/tools')
  await page.getByRole('link', { name: /Play with the water/ }).click()
  await expect(page).toHaveURL('/tools/flux-water')
  await expect(page.locator('.desktop-navigation a[aria-current="page"]')).toHaveText('Tools')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Open navigation menu' }).click()
  await page.locator('.mobile-navigation').getByRole('link', { name: /Tools/ }).click()
  await expect(page.locator('.menu-dialog')).not.toBeVisible()
  await page.getByRole('link', { name: /Open image converter/ }).click()
  await expect(page).toHaveURL('/tools/images')
  await page.getByRole('link', { name: 'All tools & experiments' }).click()
  await expect(page).toHaveURL('/tools')
})

test('explains missing WebGPU, disables unavailable controls and retries without reloading', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true }) })
  await page.goto('/tools/flux-water')
  await expect(page.locator('.water-canvas')).toHaveAttribute('data-state', 'error')
  await expect(page.getByText('WebGPU is unavailable.', { exact: false })).toBeVisible()
  for (const name of ['Play', 'Make waves', 'Save image', 'Reset water']) await expect(page.getByRole('button', { name, exact: true })).toBeDisabled()
  await page.getByText('Water behavior & quality', { exact: true }).click()
  await expect(page.getByLabel('Quality', { exact: true })).toBeDisabled()
  const navigationCount = await page.evaluate(() => performance.getEntriesByType('navigation').length)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('.water-canvas')).toHaveAttribute('data-state', 'error')
  expect(await page.evaluate(() => performance.getEntriesByType('navigation').length)).toBe(navigationCount)
  await page.getByRole('link', { name: '← All tools & experiments' }).click()
  await expect(page).toHaveURL('/tools')
})

test('retries with a fresh adapter after an unavailable adapter', async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.gpu.requestAdapter.bind(navigator.gpu)
    let attempts = 0
    navigator.gpu.requestAdapter = options => ++attempts === 1 ? Promise.resolve(null) : original(options)
  })
  await page.goto('/tools/flux-water')
  await expect(page.locator('.water-canvas')).toHaveAttribute('data-state', 'error')
  await expect(page.getByText('No compatible graphics adapter was found.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('.water-canvas')).toHaveAttribute('data-state', 'ready')
})

test('renders actual water, freezes when paused, updates lighting and exports real pixels', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openWater(page)
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  await expect(page.getByText('Motion is paused to match your device setting.', { exact: false })).toBeVisible()
  await expect(page.locator('.advanced-settings')).not.toHaveAttribute('open', '')
  const first = await snapshot(page)
  const original = await sharp(first).stats()
  expect(original.channels[0].stdev).toBeGreaterThan(5)
  expect((await sharp(first).metadata()).width).toBeGreaterThan(200)
  const frozen = await snapshot(page)
  expect(frozen.equals(first)).toBe(true)
  await page.getByRole('button', { name: 'Moonlight', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Moonlight', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const moonlight = await snapshot(page)
  expect(moonlight.equals(first)).toBe(false)
  const dark = await sharp(moonlight).stats()
  expect(dark.channels[0].mean).toBeLessThan(original.channels[0].mean)
  await page.getByRole('button', { name: 'Tropical sand', exact: true }).click()
  expect((await snapshot(page)).equals(moonlight)).toBe(false)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('.performance')).toContainText(/\d+ FPS/, { timeout: 10_000 })
  const before = Number(await page.locator('.water-canvas').getAttribute('data-frames'))
  await expect.poll(async () => Number(await page.locator('.water-canvas').getAttribute('data-frames'))).toBeGreaterThan(before)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const surface = page.locator('.water-canvas')
  await surface.focus()
  await page.keyboard.press('b')
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
  await page.keyboard.press('r')
  await testInfo.attach('water-rendered', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  await testInfo.attach('water-snapshot', { body: first, contentType: 'image/png' })
})

test('changes quality and behavior live, restores defaults and draws pointer ripples', async ({ page }) => {
  await openWater(page)
  await page.getByText('Water behavior & quality', { exact: true }).click()
  await page.getByLabel('Quality', { exact: true }).selectOption('0')
  await expect(page.locator('.performance')).toContainText('Light')
  await expect(page.locator('.resolution')).toContainText(/192/)
  const brush = page.getByLabel('Brush size')
  await brush.fill('80')
  await expect(brush).toHaveValue('80')
  await page.getByLabel('Surface movement').fill('20')
  await page.getByLabel('Ripple persistence').fill('90')
  await page.getByRole('button', { name: 'Restore defaults' }).click()
  await expect(brush).toHaveValue('35')
  await expect(page.getByLabel('Surface movement')).toHaveValue('45')
  await expect(page.getByLabel('Ripple persistence')).toHaveValue('65')
  await expect(page.getByLabel('Quality', { exact: true })).toHaveValue('1')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const before = await snapshot(page)
  await page.locator('.water-canvas').scrollIntoViewIfNeeded()
  const rect = (await page.locator('.water-canvas').boundingBox())!
  await page.mouse.move(rect.x + rect.width * .3, rect.y + rect.height * .5)
  await page.mouse.down()
  await page.mouse.move(rect.x + rect.width * .7, rect.y + rect.height * .6, { steps: 12 })
  await page.mouse.up()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  expect((await snapshot(page)).equals(before)).toBe(false)
})

test('releases graphics resources on navigation and reconnects after a device loss', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { waterDevice?: GPUDevice; waterDestroyed: number }
    state.waterDestroyed = 0
    if (typeof GPUAdapter === 'undefined') return
    const requestDevice = GPUAdapter.prototype.requestDevice
    GPUAdapter.prototype.requestDevice = async function (descriptor) {
      const device = await requestDevice.call(this, descriptor)
      state.waterDevice = device
      const destroy = device.destroy.bind(device)
      device.destroy = () => { state.waterDestroyed++; destroy() }
      return device
    }
  })
  await openWater(page)
  await page.getByRole('link', { name: '← All tools & experiments' }).click()
  await expect(page).toHaveURL('/tools')
  await expect.poll(() => page.evaluate(() => (window as unknown as { waterDestroyed: number }).waterDestroyed)).toBe(1)
  await page.getByRole('link', { name: /Play with the water/ }).click()
  await expect(page.locator('.water-canvas')).toHaveAttribute('data-state', 'ready')
  await page.evaluate(() => (window as unknown as { waterDevice: GPUDevice }).waterDevice.destroy())
  await expect(page.locator('.water-canvas')).toHaveAttribute('data-state', 'error')
  await expect(page.getByText('The graphics connection was lost.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('.water-canvas')).toHaveAttribute('data-state', 'ready')
  await page.getByRole('button', { name: 'Make waves', exact: true }).click()
  await expect(page.locator('.performance')).toContainText(/\d+ FPS/)
})

for (const width of [320, 390, 768, 1440]) {
  test(`fits ${width}px with accessible controls and fullscreen`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openWater(page)
    await page.getByRole('button', { name: 'Make waves', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
    await page.getByText('Water behavior & quality', { exact: true }).click()
    await expect(page.getByLabel('Quality', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1)
    expect(await page.locator('.water-canvas').evaluate(canvas => getComputedStyle(canvas).touchAction)).toBe('none')
    await page.getByRole('button', { name: 'Fullscreen', exact: true }).click()
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
    await expect(page.getByRole('button', { name: 'Exit fullscreen', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click()
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false)
    await testInfo.attach(`water-${width}px`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  })
}

test.describe('Touch interaction', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })

  test('starts waves with a finger and saves a mobile image', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openWater(page)
    const before = await snapshot(page)
    await page.locator('.water-canvas').scrollIntoViewIfNeeded()
    const rect = (await page.locator('.water-canvas').boundingBox())!
    await page.touchscreen.tap(rect.x + rect.width * .5, rect.y + rect.height * .5)
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    expect((await snapshot(page)).equals(before)).toBe(false)
  })
})
