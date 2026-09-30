import { test, expect } from '@playwright/test'

// Run separately with POCKET_ID_CLIENT_ID=test to verify fail-closed configuration.
test.describe('Pocket ID configuration', () => {
  test.skip(
    process.env.POCKET_ID_CLIENT_ID !== 'test',
    'Requires the partial-configuration test environment'
  )

  test('renders Pocket ID login and prevents password fallback', async ({
    page,
    request,
    context
  }) => {
    const problems: string[] = []
    page.on('pageerror', (error) => problems.push(error.message))
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type()))
        problems.push(message.text())
    })
    await page.goto('/admin/login')
    await expect(
      page.getByRole('button', { name: 'Sign in with Pocket ID' })
    ).toBeVisible()
    await expect(page.getByRole('alert')).toHaveText(
      'Sign-in is unavailable. Please try again later.'
    )
    await expect(page.locator('input[type="password"]')).toHaveCount(0)
    const password = await request.post('/admin/login?/login', {
      form: { username: 'test', password: 'test' },
      headers: { origin: 'http://localhost:5173', accept: 'text/html' }
    })
    expect(password.status()).toBe(403)
    expect(
      (await context.cookies()).some((cookie) => cookie.name === 'session')
    ).toBe(false)
    expect(problems).toEqual([])
  })
})
