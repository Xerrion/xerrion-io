import { expect, test } from '@playwright/test'

test('browser reports an unhandled error through a sanitized error envelope', async ({ page, context }) => {
  const envelopes: string[] = []
  const pageErrors: string[] = []
  const consoleProblems: string[] = []

  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) consoleProblems.push(message.text())
  })
  await page.route('https://monitoring.invalid/**', async (route) => {
    envelopes.push(route.request().postData() ?? '')
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  await context.addCookies([{ name: 'monitoring-test', value: 'private-cookie', url: 'http://127.0.0.1:5174' }])
  await page.goto('/about?monitoring=private-query#private-fragment')
  await expect(page.locator('main h1')).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(envelopes).toEqual([])

  // An asynchronous exception exercises the installed global handler.
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error('Monitoring browser test https://user:private-password@example.test/callback?code=private-code#private-fragment')
    }, 0)
  })
  await expect.poll(() => envelopes.length).toBe(1)
  expect(pageErrors).toHaveLength(1)
  expect(pageErrors[0]).toContain('Monitoring browser test')

  const lines = envelopes[0].split('\n')
  const item = JSON.parse(lines[1])
  const event = JSON.parse(lines[2])
  expect(item.type).toBe('event')
  expect(event.environment).toBe('test')
  expect(event.release).toBe('monitoring-test')
  expect(event.tags.runtime).toBe('browser')
  expect(event.tags.route).toBe('/(public)/about')
  expect(event.sdk.name).toBe('sentry.javascript.sveltekit')
  expect(event.exception.values[0].value).toBe('Monitoring browser test https://example.test/callback')
  expect(event.exception.values[0].stacktrace.frames.length).toBeGreaterThan(0)
  expect(event.sdk.settings.infer_ip).toBe('never')
  expect(event).not.toHaveProperty('user')
  expect(event).not.toHaveProperty('breadcrumbs')
  expect(event).not.toHaveProperty('contexts')
  expect(event).not.toHaveProperty('extra')
  expect(lines[2]).not.toContain('private-')
  expect(consoleProblems).toEqual([])
})
