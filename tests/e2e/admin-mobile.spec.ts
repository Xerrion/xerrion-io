import { test, expect, type Page } from '@playwright/test'

const screens = [
  '/admin',
  '/admin/blog',
  '/admin/blog/new',
  '/admin/blog/1',
  '/admin/blog/tags',
  '/admin/gallery',
  '/admin/gallery/categories',
  '/admin/gallery/upload',
  '/admin/login',
  '/admin/login?password'
]

async function openPage(page: Page, route: string): Promise<void> {
  await page.goto(route)
  if (!route.includes('login')) {
    await expect(page.locator('.menu-toggle')).toBeEnabled()
  }
}

async function expectNoOverflow(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }))
  expect(widths.content).toBeLessThanOrEqual(widths.viewport + 1)
}

const consoleProblems = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page }) => {
  const problems: string[] = []
  page.on('pageerror', (error) => problems.push(error.message))
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type()))
      problems.push(message.text())
  })
  consoleProblems.set(page, problems)
})

test.afterEach(async ({ page }) => {
  expect(consoleProblems.get(page)).toEqual([])
})

for (const width of [320, 390, 768, 844, 1280]) {
  test(`all admin screens fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 844 })
    for (const screen of screens) {
      await openPage(page, screen)
      await expect(page.locator('h1')).toBeVisible()
      if (/blog\/(new|1)$/.test(screen))
        await expect(page.locator('.cm-content')).toBeVisible()
      await expectNoOverflow(page)
      if (!screen.includes('login')) {
        for (const input of await page
          .locator('input[type="text"], select, textarea')
          .all()) {
          expect(
            await input.evaluate((element) =>
              parseFloat(getComputedStyle(element).fontSize)
            )
          ).toBeGreaterThanOrEqual(16)
        }
      }
      if (!screen.includes('login')) {
        const main = await page.locator('main').boundingBox()
        expect(main?.width).toBeGreaterThanOrEqual(
          width < 768 ? width - 1 : width - 241
        )
        if (width < 768) {
          await expect(
            page.getByRole('button', { name: 'Menu', exact: true })
          ).toBeVisible()
          await expect(
            page.getByRole('navigation', { name: 'Admin navigation' })
          ).toBeHidden()
        } else {
          await expect(
            page.getByRole('navigation', { name: 'Admin navigation' })
          ).toBeVisible()
        }
      }
    }
  })
}

test('mobile menu supports touch, Escape, route changes, and desktop resize', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openPage(page, '/admin')
  const menu = page.getByRole('button', { name: 'Menu', exact: true })
  await menu.tap()
  await expect(
    page.getByRole('button', { name: 'Close menu' })
  ).toHaveAttribute('aria-expanded', 'true')
  const navigation = page.getByRole('navigation', { name: 'Admin navigation' })
  await expect(navigation).toBeVisible()
  const links = navigation.getByRole('link')
  for (const link of await links.all()) {
    await expect
      .poll(async () => (await link.boundingBox())?.height)
      .toBeGreaterThanOrEqual(44)
  }
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  await expect(navigation).toBeHidden()
  await menu.tap()
  await navigation.getByRole('link', { name: 'Tags', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/blog\/tags$/)
  await expect(navigation).toBeHidden()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await page.setViewportSize({ width: 1280, height: 844 })
  await expect(navigation).toBeVisible()
})

test('mobile lists retain all values and offer reachable edit controls', async ({
  page
}) => {
  await page.setViewportSize({ width: 320, height: 844 })
  for (const route of [
    '/admin/blog',
    '/admin/blog/tags',
    '/admin/gallery/categories'
  ]) {
    await openPage(page, route)
    const row = page.locator('tbody tr').first()
    for (const cell of await row.locator('td[data-label]').all()) {
      await expect(cell).toBeVisible()
      const box = await cell.boundingBox()
      expect(box?.x).toBeGreaterThanOrEqual(0)
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320)
    }
    if (route !== '/admin/blog') {
      await page.getByRole('button', { name: 'Edit', exact: true }).click()
      await expect(
        page.getByRole('button', { name: 'Save', exact: true })
      ).toBeVisible()
      await expectNoOverflow(page)
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    }
  }
})

test('mobile editor accepts content and keeps long URLs inside the page', async ({
  page
}) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await openPage(page, '/admin/blog/1')
  const editor = page.locator('.cm-content')
  await expect(editor).toContainText('Existing content')
  await editor.fill(
    'Updated mobile content. ' +
      'word '.repeat(500) +
      'https://example.com/' +
      'path'.repeat(80)
  )
  await expect(page.locator('.reading-time-badge')).toHaveText('3 min read')
  await expectNoOverflow(page)
  const chip = page.getByRole('button', {
    name: /A long name that must remain readable/
  })
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  await chip.click()
  await expect(chip).toHaveAttribute('aria-pressed', 'false')
})

test('mobile gallery selection and details stay inside the viewport', async ({
  page
}) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await openPage(page, '/admin/gallery')
  await page.getByRole('button', { name: /^Select a-very-long-photo/ }).tap()
  await expect(page.getByText('1 photo selected')).toBeVisible()
  await expectNoOverflow(page)
  const bulk = await page.locator('.bulk-bar').boundingBox()
  expect(bulk?.x).toBeGreaterThanOrEqual(0)
  expect((bulk?.x ?? 0) + (bulk?.width ?? 0)).toBeLessThanOrEqual(320)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Photo details' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Photo details' })
  ).toBeVisible()
  await expectNoOverflow(page)
  const modal = await page.locator('.modal').boundingBox()
  expect(modal?.height).toBeLessThanOrEqual(640)
  await page
    .locator('.modal-header')
    .getByRole('button', { name: 'Close' })
    .click()
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('empty mobile lists fit without horizontal scrolling', async ({
  page
}) => {
  await page.setViewportSize({ width: 320, height: 844 })
  for (const route of [
    '/admin/blog?empty',
    '/admin/blog/tags?empty',
    '/admin/gallery?empty'
  ]) {
    await openPage(page, route)
    await expect(page.locator('.empty-state')).toBeVisible()
    await expectNoOverflow(page)
  }
})

test('mobile upload queue keeps long filenames and removal controls reachable', async ({
  page
}) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await openPage(page, '/admin/gallery/upload')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'a-long-photo-name-'.repeat(10) + '.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('UI fixture. This file is never uploaded.')
  })
  await expect(page.getByRole('button', { name: 'Remove file' })).toBeVisible()
  await expectNoOverflow(page)
  await page.getByRole('button', { name: 'Remove file' }).click()
  await expect(page.locator('.file-item')).toHaveCount(0)
})
