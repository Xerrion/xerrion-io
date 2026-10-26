import type { Page } from '@playwright/test'

import { test, expect, mockPublicData, navigatePublic } from './public-fixtures'

const photos = Array.from({ length: 6 }, (_, index) => ({
  id: `lightbox-${index + 1}`,
  name: `Lightbox photo ${index + 1}`,
  category: 'test',
  thumbUrl: `https://gallery.test/${index + 1}-thumb.svg`,
  mediumUrl: `https://gallery.test/${index + 1}-medium.svg`,
  fullUrl: `https://gallery.test/${index + 1}.svg`,
  width: index % 2 === 0 ? 800 : 400,
  height: 600,
  createdAt: new Date('2026-01-01')
}))

function imageBody(index: number): string {
  const photo = photos[index]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${photo.width}" height="${photo.height}"><rect width="100%" height="100%" fill="hsl(${index * 60} 70% 50%)"/></svg>`
}

async function prepareGallery(page: Page, items = photos): Promise<void> {
  // Analytics availability is unrelated to the local viewer contract.
  for (const url of [
    'https://cloud.umami.is/script.js',
    'https://www.googletagmanager.com/gtag/js*'
  ]) {
    await page.route(url, (route) =>
      route.fulfill({ contentType: 'application/javascript', body: '' })
    )
  }
  await page.route('https://gallery.test/**', (route) => {
    const index =
      Number(new URL(route.request().url()).pathname.match(/\d+/)?.[0]) - 1
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: imageBody(index)
    })
  })
  await mockPublicData(page, '/gallery', {
    categories: [{ slug: 'test', name: 'Test', order: 0 }],
    initialPhotos: items,
    photoCounts: { test: items.length },
    totalPhotos: items.length,
    error: null
  })
  await navigatePublic(page, '/gallery')
  await expect(page.locator('.photo-button')).toHaveCount(items.length)
}

async function openPhoto(page: Page, index = 0): Promise<void> {
  await page.locator('.photo-button').nth(index).click()
  await expect(page.getByRole('dialog', { name: 'Photo viewer' })).toBeVisible()
}

async function expectPhoto(
  page: Page,
  index: number,
  count = photos.length
): Promise<void> {
  await expect(page.locator('.lightbox-counter')).toHaveText(
    `${index + 1} / ${count}`
  )
  await expect(page.locator('.lightbox-image')).toHaveCount(1)
  await expect(page.locator('.lightbox-image')).toHaveAttribute(
    'alt',
    photos[index].name
  )
  await expect(page.locator('.photo-title')).toHaveText(photos[index].name)
}

async function swipePhoto(page: Page, dx: number, dy = 0): Promise<void> {
  const box = (await page.locator('.lightbox-image-wrapper').boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const session = await page.context().newCDPSession(page)
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }]
  })
  for (let step = 1; step <= 5; step++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + (dx * step) / 5, y: y + (dy * step) / 5 }]
    })
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: []
  })
  await session.detach()
}

test('focuses the viewer, blocks background focus, and restores focus and scroll', async ({
  page
}) => {
  await prepareGallery(page)
  const trigger = page.locator('.photo-button').nth(2)
  await trigger.scrollIntoViewIfNeeded()
  const scrollY = await page.evaluate(() => window.scrollY)
  await trigger.click()
  await expect(page.getByRole('button', { name: 'Close viewer' })).toBeFocused()
  expect(
    await page
      .locator('dialog.lightbox')
      .evaluate((dialog) => dialog.matches(':modal'))
  ).toBe(true)
  await page
    .locator('.photo-button')
    .first()
    .evaluate((button: HTMLButtonElement) => button.focus())
  await expect(page.getByRole('button', { name: 'Close viewer' })).toBeFocused()
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Tab')
    expect(
      await page.evaluate(
        () =>
          document.activeElement === document.body ||
          !!document.activeElement?.closest('dialog.lightbox')
      )
    ).toBe(true)
  }
  await page.mouse.wheel(0, 500)
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Photo viewer' })).toBeHidden()
  await expect(trigger).toBeFocused()
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY)
  expect(
    await page
      .locator('body')
      .evaluate((body) => getComputedStyle(body).overflow)
  ).not.toBe('hidden')
})

for (const reducedMotion of [false, true]) {
  test(`navigation updates immediately and respects boundaries with reduced motion ${reducedMotion}`, async ({
    page
  }) => {
    await page.emulateMedia({
      reducedMotion: reducedMotion ? 'reduce' : 'no-preference'
    })
    await prepareGallery(page)
    await openPhoto(page)
    for (let index = 0; index < 20; index++)
      await page.keyboard.press('ArrowRight')
    await expectPhoto(page, 5)
    await expect(
      page.getByRole('button', { name: 'Next photo' })
    ).toBeDisabled()
    await page.keyboard.press('ArrowLeft')
    await expectPhoto(page, 4)
    for (let index = 0; index < 20; index++)
      await page.keyboard.press('ArrowLeft')
    await expectPhoto(page, 0)
    await expect(
      page.getByRole('button', { name: 'Previous photo' })
    ).toBeDisabled()
    if (reducedMotion) {
      expect(
        await page
          .locator('.image-surface')
          .evaluate((surface) => surface.getAnimations().length)
      ).toBe(0)
    }
  })
}

test('navigation and closing do not wait for an unfinished animation', async ({
  page
}, testInfo) => {
  await prepareGallery(page)
  await page.addStyleTag({
    content: '.image-surface { animation-play-state: paused !important; }'
  })
  await openPhoto(page)
  await page.locator('.image-surface').evaluate((surface) => {
    const animation = surface.getAnimations()[0]
    animation.pause()
    animation.currentTime = 70
  })
  const opacity = await page
    .locator('.image-surface')
    .evaluate((surface) => Number(getComputedStyle(surface).opacity))
  expect(opacity).toBeGreaterThan(0.65)
  expect(opacity).toBeLessThan(1)
  await page.screenshot({ path: testInfo.outputPath('photo-transition.png') })
  await page.keyboard.press('ArrowRight')
  await expectPhoto(page, 1)
  await page
    .locator('.image-surface')
    .evaluate((surface) =>
      surface.getAnimations().forEach((animation) => animation.pause())
    )
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Photo viewer' })).toBeHidden()
  await openPhoto(page, 4)
  await expectPhoto(page, 4)
  await page.keyboard.press('ArrowLeft')
  await expectPhoto(page, 3)
})

test('shows the selected preview while loading and ignores a stale image response', async ({
  page
}) => {
  await prepareGallery(page)
  let release: () => void = () => {}
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  let requested = false
  let delivered = false
  await page.route(
    /https:\/\/gallery\.test\/3(?:-medium)?\.svg/,
    async (route) => {
      requested = true
      await pending
      await route.fulfill({ contentType: 'image/svg+xml', body: imageBody(2) })
      delivered = true
    }
  )
  try {
    await openPhoto(page, 2)
    await expect.poll(() => requested).toBe(true)
    await expectPhoto(page, 2)
    await expect(page.getByRole('status')).toHaveText('Loading photo…')
    await expect
      .poll(() =>
        page
          .locator('.lightbox-image')
          .evaluate((image: HTMLImageElement) => image.currentSrc)
      )
      .toBe(photos[2].thumbUrl)
    await page.keyboard.press('ArrowRight')
    await expectPhoto(page, 3)
    release()
    await expect.poll(() => delivered).toBe(true)
    await expect
      .poll(() =>
        page
          .locator('.lightbox-image')
          .evaluate((image: HTMLImageElement) => image.currentSrc)
      )
      .toBe(photos[3].fullUrl)
    await expectPhoto(page, 3)
  } finally {
    release()
  }
})

test('keeps a preview after a decode failure and retries the full photo', async ({
  page
}) => {
  await prepareGallery(page)
  let fail = true
  await page.route(/https:\/\/gallery\.test\/1(?:-medium)?\.svg/, (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: fail ? 'invalid image' : imageBody(0)
    })
  )
  await openPhoto(page)
  await expect(page.getByRole('status')).toHaveText(
    'Showing a preview. The full photo could not be loaded.'
  )
  await expect
    .poll(() =>
      page
        .locator('.lightbox-image')
        .evaluate((image: HTMLImageElement) => image.currentSrc)
    )
    .toBe(photos[0].thumbUrl)
  fail = false
  await page.getByRole('button', { name: 'Retry photo' }).click()
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect
    .poll(() =>
      page
        .locator('.lightbox-image')
        .evaluate((image: HTMLImageElement) => image.currentSrc)
    )
    .toBe(photos[0].fullUrl)
  await expect(page.getByRole('dialog', { name: 'Photo viewer' })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expectPhoto(page, 1)
})

test('handles a missing image without trapping the user', async ({ page }) => {
  await prepareGallery(page, [
    { ...photos[0], thumbUrl: '', mediumUrl: '', fullUrl: '' }
  ])
  await openPhoto(page)
  await expect(page.getByRole('status')).toHaveText(
    'Photo could not be loaded.'
  )
  await expect(
    page.getByRole('button', { name: 'Previous photo' })
  ).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Next photo' })).toBeDisabled()
  await page.getByRole('button', { name: 'Close viewer' }).click()
  await expect(page.locator('.photo-button')).toBeFocused()
})

test('only dismisses a click on the background, not a photo or drag', async ({
  page
}) => {
  await prepareGallery(page)
  await openPhoto(page, 1)
  const viewer = page.getByRole('dialog', { name: 'Photo viewer' })
  await page.locator('.lightbox-image').click()
  await expect(viewer).toBeVisible()
  const box = (await page.locator('.image-surface').boundingBox())!
  await page.mouse.move(box.x + 2, box.y + 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 100, box.y + 2)
  await page.mouse.up()
  await expect(viewer).toBeVisible()
  await page.locator('.image-surface').click({ position: { x: 2, y: 2 } })
  await expect(viewer).toBeHidden()
})

test('leaves an empty gallery closed', async ({ page }) => {
  await prepareGallery(page, [])
  await expect(page.getByRole('dialog', { name: 'Photo viewer' })).toBeHidden()
  expect(
    await page
      .locator('body')
      .evaluate((body) => getComputedStyle(body).overflow)
  ).not.toBe('hidden')
})

test.describe('Touch viewer', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  })

  test('keeps navigation visible and fits portrait and landscape photos after rotation', async ({
    page
  }, testInfo) => {
    await prepareGallery(page)
    await openPhoto(page)
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 844, height: 390 }
    ]) {
      await page.setViewportSize(viewport)
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          )
      )
      for (let index = 0; index < 2; index++) {
        const image = page.locator('.lightbox-image')
        await expect
          .poll(() =>
            image.evaluate((element: HTMLImageElement) => element.naturalWidth)
          )
          .toBeGreaterThan(0)
        const imageBox = (await image.boundingBox())!
        const stage = (await page
          .locator('.lightbox-image-wrapper')
          .boundingBox())!
        expect(imageBox.width).toBeGreaterThan(stage.width * 0.9)
        expect(imageBox.height).toBeGreaterThan(stage.height * 0.9)
        expect(imageBox.x).toBeGreaterThanOrEqual(stage.x - 1)
        expect(imageBox.x + imageBox.width).toBeLessThanOrEqual(
          stage.x + stage.width + 1
        )
        expect(imageBox.y).toBeGreaterThanOrEqual(stage.y - 1)
        expect(imageBox.y + imageBox.height).toBeLessThanOrEqual(
          stage.y + stage.height + 1
        )
        await expect(
          page.getByRole('button', { name: 'Previous photo' })
        ).toBeVisible()
        await expect(
          page.getByRole('button', { name: 'Next photo' })
        ).toBeVisible()
        const header = (await page.locator('.lightbox-header').boundingBox())!
        const footer = (await page.locator('.lightbox-footer').boundingBox())!
        expect(header.y).toBe(0)
        expect(footer.y + footer.height).toBeCloseTo(viewport.height, 0)
        await page.screenshot({
          path: testInfo.outputPath(`viewer-${viewport.width}-${index}.png`),
          animations: 'disabled'
        })
        await page
          .getByRole('button', {
            name: index === 0 ? 'Next photo' : 'Previous photo'
          })
          .tap()
      }
    }
  })

  test('swipes horizontally once and ignores short, vertical, and cancelled gestures', async ({
    page
  }) => {
    await prepareGallery(page)
    await openPhoto(page)
    await swipePhoto(page, -120)
    await expectPhoto(page, 1)
    await swipePhoto(page, 120)
    await expectPhoto(page, 0)
    await swipePhoto(page, 120)
    await expectPhoto(page, 0)
    await swipePhoto(page, -20)
    await expectPhoto(page, 0)
    await swipePhoto(page, 0, 120)
    await expectPhoto(page, 0)
    const stage = page.locator('.lightbox-image-wrapper')
    await stage.dispatchEvent('pointerdown', {
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      clientX: 200,
      clientY: 200
    })
    await stage.dispatchEvent('pointermove', {
      pointerId: 7,
      pointerType: 'touch',
      clientX: 100,
      clientY: 200
    })
    await stage.dispatchEvent('pointercancel', {
      pointerId: 7,
      pointerType: 'touch'
    })
    await stage.dispatchEvent('pointerup', {
      pointerId: 7,
      pointerType: 'touch',
      clientX: 100,
      clientY: 200
    })
    await expectPhoto(page, 0)
    await stage.dispatchEvent('pointerdown', {
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      clientX: 200,
      clientY: 200
    })
    await stage.dispatchEvent('pointerdown', {
      pointerId: 8,
      pointerType: 'touch',
      isPrimary: false,
      button: 0,
      clientX: 220,
      clientY: 200
    })
    await stage.dispatchEvent('pointerup', {
      pointerId: 7,
      pointerType: 'touch',
      clientX: 100,
      clientY: 200
    })
    await expectPhoto(page, 0)
    await page.getByRole('button', { name: 'Next photo' }).tap()
    await expectPhoto(page, 1)
  })
})

test('arrow keys still work when a focused navigation control becomes disabled', async ({
  page
}) => {
  await prepareGallery(page)
  await openPhoto(page, 4)
  await page.getByRole('button', { name: 'Next photo' }).click()
  await expectPhoto(page, 5)
  await page.keyboard.press('ArrowLeft')
  await expectPhoto(page, 4)
  await page.getByRole('button', { name: 'Close viewer' }).click()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('dialog', { name: 'Photo viewer' })).toBeHidden()
})
