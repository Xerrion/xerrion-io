import { test, expect, galleryPhotos, mockGallery, mockPublicData, navigatePublic } from './public-fixtures'

test.describe('Home gallery previews', () => {
  test('uses current gallery photos for the gallery section and Charlie portrait', async ({ page }) => {
    await mockGallery(page, 3)
    const photos = galleryPhotos(3)
    await mockPublicData(page, '', {
      latestPosts: [],
      galleryPhoto: { ...photos[0], category: 'nature', name: 'A walk outside' },
      charliePhoto: photos[1],
      galleryError: null
    })
    await navigatePublic(page, '/')

    const galleryImage = page.locator('#gallery .gallery-preview')
    await galleryImage.scrollIntoViewIfNeeded()
    await expect(galleryImage).toHaveAttribute('src', photos[0].mediumUrl)
    await expect(galleryImage).toHaveAttribute('alt', 'A walk outside')
    await expect(page.locator('#gallery .gallery-image-link')).toHaveAttribute('href', '/gallery?category=nature')
    await expect.poll(() => galleryImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
    await expect(page.locator('.charlie-photo')).toHaveAttribute('src', photos[1].mediumUrl)
    await expect(page.locator('.charlie-link')).toHaveAttribute('href', '/gallery?category=charlie')

    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    }
  })

  test('shows a new photo after returning to the home page', async ({ page }) => {
    await mockGallery(page, 3)
    const photos = galleryPhotos(3)
    let currentPhoto = photos[0]
    await mockPublicData(page, '', () => ({ latestPosts: [], galleryPhoto: currentPhoto, charliePhoto: null, galleryError: null }))
    await navigatePublic(page, '/')
    await expect(page.locator('#gallery .gallery-preview')).toHaveAttribute('src', photos[0].mediumUrl)
    await page.locator('main a[href="/about"]').first().click()
    currentPhoto = photos[2]
    await page.locator('.desktop-navigation a[href="/"]').click()
    await expect(page.locator('#gallery .gallery-preview')).toHaveAttribute('src', photos[2].mediumUrl)
  })

  test('uses the existing thumbnail fallback when a medium variant is absent', async ({ page }) => {
    await mockGallery(page, 1)
    const photo = { ...galleryPhotos(1)[0], mediumUrl: undefined }
    await mockPublicData(page, '', { latestPosts: [], galleryPhoto: photo, charliePhoto: photo, galleryError: null })
    await navigatePublic(page, '/')
    await expect(page.locator('#gallery .gallery-preview')).toHaveAttribute('src', photo.thumbUrl)
    await expect(page.locator('.charlie-photo')).toHaveAttribute('src', photo.thumbUrl)
  })

  for (const state of [
    { name: 'empty', error: null, text: 'No photos yet.' },
    { name: 'unavailable', error: 'The gallery is temporarily unavailable.', text: 'The gallery is temporarily unavailable.' }
  ]) {
    test(`handles an ${state.name} gallery without static image fallbacks`, async ({ page }) => {
      await mockPublicData(page, '', { latestPosts: [], galleryPhoto: null, charliePhoto: null, galleryError: state.error })
      await navigatePublic(page, '/')
      await expect(page.locator('#gallery .gallery-status')).toHaveText(state.text)
      await expect(page.locator('#gallery img, .charlie-photo')).toHaveCount(0)
      await expect(page.locator('main h1')).toContainText("I'm Lasse.")
      await page.setViewportSize({ width: 390, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await expect(page.locator('#gallery a[href="/gallery"]')).toBeAttached()
    })
  }
})
