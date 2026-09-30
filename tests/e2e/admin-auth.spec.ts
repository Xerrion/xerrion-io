import { test, expect } from '@playwright/test'

test.describe('Admin Authentication', () => {
  const browserProblems = new WeakMap<object, string[]>()
  test.beforeEach(async ({ page }) => {
    const problems: string[] = []
    browserProblems.set(page, problems)
    page.on('pageerror', (error) => problems.push(error.message))
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type()))
        problems.push(message.text())
    })
  })
  test.afterEach(async ({ page }) => {
    expect(browserProblems.get(page)).toEqual([])
  })
  test('login page renders correctly', async ({ page }) => {
    const response = await page.goto('/admin/login')

    expect(response?.status()).toBe(200)

    const headers = response?.headers()
    expect(headers?.['x-robots-tag']).toContain('noindex')

    const title = page.locator('.title')
    await expect(title).toContainText('Admin Access')

    const brand = page.locator('.brand, .logo')
    await expect(brand.first()).toBeVisible()

    const usernameInput = page.locator(
      'input[name="username"], label:has-text("Username")'
    )
    await expect(usernameInput.first()).toBeVisible()

    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()

    const signInButton = page.getByRole('button', { name: 'Sign In' })
    await expect(signInButton).toBeVisible()

    const navLinks = page.locator('.nav-link')
    await expect(navLinks).toHaveCount(0)
  })

  test('back to site link works', async ({ page }) => {
    await page.goto('/admin/login')
    const backLink = page.getByRole('link', { name: '← Back to site' })
    await expect(backLink).toHaveAttribute('href', '/')

    await backLink.click()
    await expect(page).toHaveURL('/')
  })

  test('auth protection redirects to login', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('login form validation prevents empty submission', async ({ page }) => {
    await page.goto('/admin/login')

    const usernameInput = page.locator('input[name="username"]')
    const isRequired = await usernameInput.getAttribute('required')
    expect(isRequired).not.toBeNull()

    const passwordInput = page.locator('input[type="password"]')
    const pwRequired = await passwordInput.getAttribute('required')
    expect(pwRequired).not.toBeNull()
  })

  test('callback without a browser login attempt cannot authenticate', async ({
    page,
    context
  }) => {
    await page.goto('/auth/pocket-id/callback?code=invalid&state=invalid')
    await expect(page).toHaveURL('/admin/login?error=sign-in')
    await expect(page.getByRole('alert')).toHaveText(
      'Sign-in failed. Please try again.'
    )
    expect(
      (await context.cookies()).some((cookie) => cookie.name === 'session')
    ).toBe(false)
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin/login')
  })
})
