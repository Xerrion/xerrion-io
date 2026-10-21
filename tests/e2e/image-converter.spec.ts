import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
import type { Page } from '@playwright/test'

import { test, expect } from './public-fixtures'

async function image(name = 'test-photo.png', width = 1200, height = 800) {
  return { name, mimeType: 'image/png', buffer: await sharp({ create: { width, height, channels: 4, background: { r: 30, g: 140, b: 220, alpha: 0.5 } } }).png().toBuffer() }
}

async function showAdvanced(page: Page): Promise<void> {
  const panel = page.locator('.settings-fields > fieldset > details')
  if (await panel.getAttribute('open') === null) await panel.locator('summary').first().click()
}

async function convert(page: Page): Promise<void> {
  await expect(page.getByRole('status', { name: 'Conversion progress' })).toContainText(/images? ready to download/)
}

async function downloadImage(page: Page): Promise<{ bytes: Buffer; name: string }> {
  const waiting = page.waitForEvent('download')
  await page.getByRole('link', { name: /^Download / }).first().click()
  const download = await waiting
  return { bytes: await readFile((await download.path())!), name: download.suggestedFilename() }
}

test.describe('Image converter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/images')
    await expect(page.getByLabel('File format')).toBeEnabled()
    await showAdvanced(page)
  })

  test('updates automatically after rapid edits and keeps comparison position', async ({ page }) => {
    await page.locator('#image-files').setInputFiles(await image())
    await convert(page)
    await expect(page.getByRole('button', { name: /Convert.*image/ })).toHaveCount(0)
    const slider = page.getByRole('slider', { name: 'Compare images' })
    await slider.focus()
    await page.keyboard.press('Home')
    await page.keyboard.press('ArrowRight')
    const oldUrl = await page.getByRole('link', { name: 'Download image', exact: true }).getAttribute('href')
    for (const value of ['20', '95', '35', '73']) {
      await page.getByLabel('Quality', { exact: true }).evaluate((element: HTMLInputElement, value) => {
        element.value = value
        element.dispatchEvent(new Event('input', { bubbles: true }))
      }, value)
    }
    await expect(page.getByLabel('Quality', { exact: true })).toBeEnabled()
    await page.getByLabel('Longest edge').fill('480')
    await convert(page)
    await expect(page.locator('.preview-details')).toContainText('480 × 320 px')
    await expect(page.locator('.preview-details')).toContainText('Encoded at 73% quality')
    await expect(slider).toHaveValue('1')
    await expect(page.getByRole('link', { name: 'Download image', exact: true })).not.toHaveAttribute('href', oldUrl!)
    const result = await downloadImage(page)
    expect((await sharp(result.bytes).metadata()).width).toBe(480)
  })

  test('cancels an in-flight worker when newer settings arrive', async ({ page }) => {
    await page.addInitScript(() => {
      const NativeWorker = window.Worker
      const state = window as unknown as { terminatedWorkers: number }
      state.terminatedWorkers = 0
      window.Worker = class extends NativeWorker {
        postMessage(message: unknown, options?: Transferable[] | StructuredSerializeOptions): void {
          setTimeout(() => {
            if (Array.isArray(options)) super.postMessage(message, options)
            else super.postMessage(message, options)
          }, 300)
        }
        terminate(): void { state.terminatedWorkers++; super.terminate() }
      }
    })
    await page.reload()
    await expect(page.getByLabel('File format')).toBeEnabled()
    await showAdvanced(page)
    await page.locator('#image-files').setInputFiles(await image())
    await expect(page.getByRole('status', { name: 'Conversion progress' })).toContainText('Updating image')
    await page.getByLabel('Longest edge').fill('360')
    await page.getByLabel('File format').selectOption('jpeg')
    await convert(page)
    const result = await downloadImage(page)
    expect(result.name).toBe('test-photo-optimized.jpg')
    expect((await sharp(result.bytes).metadata()).width).toBe(360)
    expect(await page.evaluate(() => (window as unknown as { terminatedWorkers: number }).terminatedWorkers)).toBeGreaterThanOrEqual(2)
    await expect(page.getByRole('link', { name: 'Download test-photo-optimized.webp', exact: true })).toHaveCount(0)
  })

  test('center crops and applies flips and rotation to the downloaded pixels', async ({ page }) => {
    const pixels = Buffer.alloc(120 * 80 * 3)
    for (let y = 0; y < 80; y++) for (let x = 0; x < 120; x++) {
      pixels[(y * 120 + x) * 3 + (x < 60 ? 0 : 2)] = 255
    }
    const buffer = await sharp(pixels, { raw: { width: 120, height: 80, channels: 3 } }).png().toBuffer()
    await page.locator('#image-files').setInputFiles({ name: 'two-colors.png', mimeType: 'image/png', buffer })
    await page.getByRole('button', { name: /^PNG/ }).click()
    await page.getByText('Crop & transform', { exact: true }).click()
    await page.getByLabel('Crop ratio').selectOption('1:1')
    await page.getByRole('button', { name: 'Flip horizontal', exact: true }).click()
    await convert(page)
    const flipped = await downloadImage(page)
    const flippedPixels = await sharp(flipped.bytes).removeAlpha().raw().toBuffer()
    expect((await sharp(flipped.bytes).metadata()).width).toBe(80)
    expect(Array.from(flippedPixels.subarray(0, 3))).toEqual([0, 0, 255])
    await page.getByRole('button', { name: /Rotate 90°/ }).click()
    await convert(page)
    const rotated = await downloadImage(page)
    const rotatedPixels = await sharp(rotated.bytes).removeAlpha().raw().toBuffer()
    expect(Array.from(rotatedPixels.subarray(0, 3))).toEqual([255, 0, 0])
    expect(Array.from(rotatedPixels.subarray(rotatedPixels.length - 3))).toEqual([0, 0, 255])
    await page.getByRole('button', { name: 'Reset', exact: true }).click()
    await convert(page)
    await expect(page.locator('.preview-details')).toContainText('120 × 80 px')
    await expect(page.getByRole('button', { name: 'Flip horizontal', exact: true })).toHaveAttribute('aria-pressed', 'false')
  })

  test('resizes within width and height bounds or by percentage', async ({ page }) => {
    await page.locator('#image-files').setInputFiles(await image())
    await page.getByLabel('Resize by').selectOption('bounds')
    await page.getByLabel('Max width (px)').fill('300')
    await page.getByLabel('Max height (px)').fill('150')
    await convert(page)
    await expect(page.locator('.preview-details')).toContainText('225 × 150 px')
    await page.getByLabel('Resize by').selectOption('percent')
    await page.getByRole('slider', { name: 'Scale', exact: true }).evaluate((element: HTMLInputElement) => {
      element.value = '25'
      element.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await convert(page)
    const result = await downloadImage(page)
    expect((await sharp(result.bytes).metadata()).width).toBe(300)
    expect((await sharp(result.bytes).metadata()).height).toBe(200)
  })

  test('optimizes to a size target and explains when the target is unreachable', async ({ page }) => {
    const pixels = Buffer.alloc(512 * 384 * 3)
    let seed = 123456
    for (let index = 0; index < pixels.length; index++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; pixels[index] = seed >>> 24 }
    const buffer = await sharp(pixels, { raw: { width: 512, height: 384, channels: 3 } }).png().toBuffer()
    await page.locator('#image-files').setInputFiles({ name: 'texture.png', mimeType: 'image/png', buffer })
    await page.getByLabel('File format').selectOption('jpeg')
    await page.getByLabel('Target file size').fill('25')
    await convert(page)
    const result = await downloadImage(page)
    expect(result.bytes.length).toBeLessThanOrEqual(25 * 1024)
    await page.getByLabel('Target file size').fill('1')
    await convert(page)
    await expect(page.locator('.size-tip').first()).toContainText('target size could not be reached')
    expect((await downloadImage(page)).bytes.length).toBeGreaterThan(1024)
  })

  test('updates a transparent JPEG background from white to black', async ({ page }) => {
    const buffer = await sharp({ create: { width: 80, height: 60, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer()
    await page.locator('#image-files').setInputFiles({ name: 'clear.png', mimeType: 'image/png', buffer })
    await page.getByLabel('File format').selectOption('jpeg')
    await convert(page)
    const white = await sharp((await downloadImage(page)).bytes).raw().toBuffer()
    expect(white[0]).toBeGreaterThan(250)
    await page.getByLabel('Transparency background').selectOption('dark')
    await convert(page)
    const black = await sharp((await downloadImage(page)).bytes).raw().toBuffer()
    expect(black[0]).toBeLessThan(5)
  })

  test('cancels work when images are cleared and supports the non-worker fallback', async ({ page }) => {
    await page.addInitScript(() => { Object.defineProperty(window, 'OffscreenCanvas', { value: undefined }) })
    await page.reload()
    await expect(page.getByLabel('File format')).toBeEnabled()
    await showAdvanced(page)
    await page.locator('#image-files').setInputFiles(await image('fallback.png', 80, 60))
    await convert(page)
    expect((await downloadImage(page)).name).toBe('fallback-optimized.webp')
    await page.getByLabel('Longest edge').fill('40')
    await page.getByRole('button', { name: 'Clear all', exact: true }).click()
    await expect(page.locator('.file-list')).toHaveCount(0)
    await page.waitForTimeout(400)
    await expect(page.getByRole('link', { name: /^Download / })).toHaveCount(0)
    await expect(page.locator('.preview')).toHaveCount(0)
  })

  test('converts locally, resizes, compares, and downloads real WebP bytes', async ({ page }, testInfo) => {
    const network: string[] = []
    page.on('request', request => { if (['xhr', 'fetch'].includes(request.resourceType()) && request.url().startsWith('http')) network.push(request.url()) })
    const source = await image()
    await page.locator('#image-files').setInputFiles(source)
    await page.getByLabel('Longest edge').fill('600')
    await convert(page)
    await expect(page.locator('.preview-details')).toContainText('1200 × 800 → 600 × 400 px')
    const slider = page.getByRole('slider', { name: 'Compare images' })
    await slider.focus()
    await page.keyboard.press('Home')
    await expect(page.locator('clipPath rect')).toHaveAttribute('width', '0%')
    await page.keyboard.press('End')
    await expect(page.locator('clipPath rect')).toHaveAttribute('width', '100%')
    const result = await downloadImage(page)
    expect(result.name).toBe('test-photo-optimized.webp')
    const metadata = await sharp(result.bytes).metadata()
    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(600)
    expect(metadata.height).toBe(400)
    expect(metadata.hasAlpha).toBe(true)
    expect(result.bytes.length).toBeLessThan(source.buffer.length)
    expect(network).toEqual([])
    const controls = await page.locator('.settings-fields').boundingBox()
    const actions = await page.locator('.settings-actions').boundingBox()
    expect(actions!.y + actions!.height).toBeLessThanOrEqual(controls!.y + 1)
    await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true })
  })

  test('exports transparent PNG and flattens JPEG on white without enlarging', async ({ page }) => {
    await page.locator('#image-files').setInputFiles(await image('transparent.png', 80, 60))
    await page.getByRole('button', { name: /^PNG/ }).click()
    await expect(page.getByLabel('Quality', { exact: true })).toBeDisabled()
    await convert(page)
    const png = await downloadImage(page)
    expect(png.name).toBe('transparent-optimized.png')
    expect((await sharp(png.bytes).metadata()).hasAlpha).toBe(true)
    await page.getByLabel('File format').selectOption('jpeg')
    await expect(page.getByRole('link', { name: /^Download / })).toHaveCount(0)
    await page.getByLabel('Longest edge').fill('1920')
    await convert(page)
    const jpeg = await downloadImage(page)
    expect(jpeg.name).toBe('transparent-optimized.jpg')
    const metadata = await sharp(jpeg.bytes).metadata()
    expect(metadata.format).toBe('jpeg')
    expect(metadata.width).toBe(80)
    expect(metadata.height).toBe(60)
    expect(metadata.hasAlpha).toBe(false)
    const pixel = await sharp(jpeg.bytes).raw().toBuffer()
    expect(pixel[0]).toBeGreaterThan(130)
    expect(pixel[1]).toBeGreaterThan(180)
    expect(pixel[2]).toBeGreaterThan(220)
  })

  test('applies EXIF orientation and removes original camera metadata', async ({ page }) => {
    const buffer = await sharp({ create: { width: 120, height: 80, channels: 3, background: 'green' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer()
    await page.locator('#image-files').setInputFiles({ name: 'rotated.jpg', mimeType: 'image/jpeg', buffer })
    await convert(page)
    const result = await downloadImage(page)
    const metadata = await sharp(result.bytes).metadata()
    expect(metadata.width).toBe(80)
    expect(metadata.height).toBe(120)
    expect(metadata.exif).toBeUndefined()
  })

  test('downloads a valid ZIP with unique image names', async ({ page }) => {
    const input = await image('same.png', 80, 60)
    await page.locator('#image-files').setInputFiles([input, input])
    await convert(page)
    const waiting = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download 2 as ZIP' }).click()
    const download = await waiting
    expect(download.suggestedFilename()).toBe('xerrion-images.zip')
    const path = (await download.path())!
    const output = execFileSync('/usr/bin/unzip', ['-t', path], { encoding: 'utf8' })
    expect(output).toContain('No errors detected')
    const names = execFileSync('/usr/bin/unzip', ['-Z1', path], { encoding: 'utf8' }).trim().split('\n')
    expect(names).toEqual(['same-optimized.webp', 'same-optimized-2.webp'])
    for (const name of names) {
      const bytes = execFileSync('/usr/bin/unzip', ['-p', path, name])
      expect((await sharp(bytes).metadata()).format).toBe('webp')
    }
  })

  test('isolates decoding errors and lets a mixed batch finish', async ({ page }) => {
    await page.locator('#image-files').setInputFiles([
      { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') },
      await image('valid.png', 80, 60)
    ])
    await convert(page)
    await expect(page.getByRole('status', { name: 'Conversion progress' })).toContainText('1 of 2 images ready')
    await expect(page.getByRole('alert')).toContainText('could not read')
    await expect(page.getByRole('link', { name: 'Download valid-optimized.webp' })).toBeVisible()
    await page.getByRole('button', { name: 'Remove broken.png' }).click()
    await expect(page.locator('.file-list li')).toHaveCount(1)
    await page.getByRole('button', { name: 'Clear all' }).click()
    await expect(page.locator('.file-list')).toHaveCount(0)
    await expect(page.getByRole('link', { name: /^Download / })).toHaveCount(0)
  })

  test('rejects unsupported files and invalid dimensions without starting a batch', async ({ page }) => {
    await page.locator('#image-files').setInputFiles({ name: 'animation.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') })
    await expect(page.getByRole('alert')).toContainText('Choose a JPEG')
    await page.locator('#image-files').setInputFiles(await image())
    await page.getByLabel('Longest edge').fill('8193')
    await expect(page.getByRole('alert')).toContainText('1 to 8192')
    await expect(page.getByRole('link', { name: /^Download / })).toHaveCount(0)
  })

  test('detects unavailable WebP export instead of mislabeling PNG bytes', async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.toBlob
      HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
        return original.call(this, callback, type === 'image/webp' ? 'image/png' : type, quality)
      }
    })
    await page.reload()
    await expect(page.getByLabel('File format')).toBeEnabled()
    await showAdvanced(page)
    await expect(page.getByLabel('File format').locator('option[value="webp"]')).toHaveCount(0)
    await page.locator('#image-files').setInputFiles(await image('fallback.png', 80, 60))
    await convert(page)
    expect((await downloadImage(page)).name).toBe('fallback-optimized.jpg')
  })

  test('accepts dropped files and releases object URLs when leaving the tool', async ({ page }) => {
    const input = await image('dropped.png', 80, 60)
    const drop = await page.evaluateHandle(({ name, mimeType, bytes }) => {
      const transfer = new DataTransfer()
      transfer.items.add(new File([new Uint8Array(bytes)], name, { type: mimeType }))
      return transfer
    }, { ...input, bytes: Array.from(input.buffer), buffer: undefined })
    await page.locator('.drop-area').dispatchEvent('drop', { dataTransfer: drop })
    await drop.dispose()
    await expect(page.locator('.file-name')).toHaveText('dropped.png')
    await convert(page)
    const blobUrls = await page.locator('.preview svg image').evaluateAll(elements => elements.map(element => element.getAttribute('href')!))
    await page.evaluate(() => {
      const original = URL.revokeObjectURL
      const state = window as unknown as { revokedUrls: string[] }
      state.revokedUrls = []
      URL.revokeObjectURL = url => { state.revokedUrls.push(url); original.call(URL, url) }
    })
    await page.locator('.desktop-navigation').getByRole('link', { name: 'About', exact: true }).click()
    await expect(page).toHaveURL('/about')
    const released = await page.evaluate(() => (window as unknown as { revokedUrls: string[] }).revokedUrls)
    expect(released).toEqual(expect.arrayContaining(blobUrls))
  })

  test('fits small screens, supports keyboard controls, and opens from mobile navigation', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.locator('.menu-trigger').click()
    await page.locator('.mobile-navigation').getByRole('link', { name: /Tools/ }).click()
    await expect(page.locator('.menu-dialog')).not.toBeVisible()
    await page.getByRole('link', { name: /Open image converter/ }).click()
    await page.locator('#image-files').setInputFiles(await image('a-long-image-filename-that-should-never-overflow-the-screen.png'))
    await page.getByRole('button', { name: /^Email/ }).click()
    await convert(page)
    await expect(page.getByRole('link', { name: 'Download image', exact: true })).toBeVisible()
    const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }))
    expect(width.scroll).toBeLessThanOrEqual(width.viewport)
    await page.getByRole('slider', { name: 'Compare images' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('clipPath rect')).toHaveAttribute('width', '51%')
    await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true })
  })
})

test.describe('Simple image conversion flow', () => {
  test('shows essential controls first and keeps advanced options closed', async ({ page }) => {
    await page.goto('/tools/images')
    await expect(page.getByLabel('File format')).toBeEnabled()
    await expect(page.getByLabel('Quality', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Image size', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Target file size')).not.toBeVisible()
    await expect(page.getByLabel('Longest edge')).not.toBeVisible()
    await page.locator('#image-files').setInputFiles(await image())
    await convert(page)
    const download = page.getByRole('link', { name: 'Download image', exact: true })
    const actions = await page.locator('.settings-actions').boundingBox()
    const controls = await page.locator('.settings-fields').boundingBox()
    expect(actions!.y + actions!.height).toBeLessThanOrEqual(controls!.y)
    await expect(download).toBeVisible()
    await page.getByLabel('Image size', { exact: true }).selectOption('800')
    await convert(page)
    await expect(page.locator('.preview-details')).toContainText('800 × 533 px')
    await expect(page.getByLabel('Target file size')).not.toBeVisible()
    await page.getByLabel('Image size', { exact: true }).selectOption('custom')
    await expect(page.getByLabel('Longest edge')).toBeVisible()
    await page.getByLabel('Longest edge').fill('600')
    await convert(page)
    await expect(page.locator('.preview-details')).toContainText('600 × 400 px')
    const result = await downloadImage(page)
    expect((await sharp(result.bytes).metadata()).width).toBe(600)
  })

  test('explains the active preset and keeps the preview before the file list', async ({ page }) => {
    await page.goto('/tools/images')
    await expect(page.getByLabel('File format')).toBeEnabled()
    const balanced = page.getByRole('button', { name: /Balanced/ })
    await expect(balanced).toHaveAttribute('aria-pressed', 'true')
    await page.locator('#image-files').setInputFiles(await image())
    await page.getByRole('button', { name: /Email/ }).click()
    await convert(page)
    await expect(page.getByRole('button', { name: /Email/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(balanced).toHaveAttribute('aria-pressed', 'false')
    const preview = await page.locator('.preview').boundingBox()
    const queue = await page.locator('.queue').boundingBox()
    expect(preview!.y + preview!.height).toBeLessThanOrEqual(queue!.y)
    await expect(page.getByLabel('File format')).toHaveValue('jpeg')
    await expect(page.getByLabel('Image size', { exact: true })).toHaveValue('1600')
  })
})
