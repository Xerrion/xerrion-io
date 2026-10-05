import { test, expect, mockPublicData, navigatePublic, projects } from './public-fixtures'

test.describe('Projects page', () => {
  test.beforeEach(async ({ page }) => {
    await mockPublicData(page, '/projects', { projects, error: null })
    await navigatePublic(page, '/projects')
  })

  test('shows the featured sandbox and complete repository entries', async ({ page }) => {
    await expect(page.locator('main h1')).toContainText('Things I')
    await expect(page.locator('main h1')).toContainText('build.')
    await expect(page.locator('.project-card')).toHaveCount(3)
    const row = page.locator('.project-card').filter({ hasText: 'servicenow-platform-mcp' })
    await expect(row.locator('.card-description')).toContainText('ServiceNow')
    await expect(row.locator('.language')).toHaveText('Python')
    await expect(row.locator('.card-link')).toHaveAttribute('href', 'https://github.com/Xerrion/servicenow-platform-mcp')
    await expect(row.locator('.card-link')).toHaveAttribute('target', '_blank')
    await expect(page.getByRole('searchbox', { name: 'Search projects' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Filter by programming language' })).toBeVisible()
  })

  test('searches names, descriptions and topics and clears filters', async ({ page }) => {
    const search = page.locator('.search-input')
    const count = page.locator('.results-count')
    await search.fill('foundry')
    await expect(page.locator('.project-card')).toHaveCount(1)
    await expect(count).toContainText('1')
    await search.fill('debugging')
    await expect(page.locator('.project-card')).toHaveCount(1)
    await search.fill('model-context-protocol')
    await expect(page.locator('.project-card')).toHaveCount(1)
    await page.locator('.clear-btn').click()
    await expect(search).toHaveValue('')
    await expect(page.locator('.project-card')).toHaveCount(3)
  })

  test('combines language and text filters and recovers from no results', async ({ page }) => {
    await page.locator('.language-select').selectOption('Rust')
    await expect(page.locator('.project-card')).toHaveCount(1)
    await page.locator('.search-input').fill('ServiceNow')
    await expect(page.locator('.project-card')).toHaveCount(0)
    await expect(page.locator('.empty-state')).toBeVisible()
    await page.locator('.empty-state').getByRole('button').click()
    await expect(page.locator('.search-input')).toHaveValue('')
    await expect(page.locator('.project-card')).toHaveCount(3)
  })
})
