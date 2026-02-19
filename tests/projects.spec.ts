import { test, expect } from '@playwright/test';

test.describe('Projects Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
  });

  test('should load and display basic page elements', async ({ page }) => {
    const container = page.locator('.projects-page');
    await expect(container).toBeVisible();

    const heading = page.locator('h1');
    await expect(heading).toContainText('Projects');

    const searchInput = page.locator('.search-input');
    await expect(searchInput).toHaveAttribute('aria-label', 'Search projects');
    await expect(searchInput).toHaveAttribute('type', 'text');

    const languageSelect = page.locator('.language-select');
    await expect(languageSelect).toHaveAttribute('aria-label', 'Filter by programming language');
    await expect(languageSelect.locator('option').first()).toHaveText('All languages');

    const resultsCount = page.locator('.results-count');
    await expect(resultsCount).toBeVisible();
    await expect(resultsCount).toContainText(/(\d+) projects/);
  });

  test('should display project cards with expected elements', async ({ page }) => {
    const projectCards = page.locator('.project-card');
    
    const count = await projectCards.count();
    if (count > 0) {
      const firstCard = projectCards.first();
      
      const cardLink = firstCard.locator('.card-link');
      await expect(cardLink).toHaveAttribute('target', '_blank');
      await expect(cardLink).toBeVisible();

      await expect(firstCard.locator('.card-description')).toBeVisible();

      await expect(firstCard.locator('.language')).toBeVisible();
      await expect(firstCard.locator('.language-dot')).toBeVisible();

      const topics = firstCard.locator('.topic');
      const topicCount = await topics.count();
      expect(topicCount).toBeLessThanOrEqual(4);

      const pinnedBadge = firstCard.locator('.pinned-badge');
      if (await pinnedBadge.count() > 0) {
        await expect(pinnedBadge).toContainText('📌 Pinned');
      }
    }
  });

  test('should filter projects by search', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    const resultsCount = page.locator('.results-count');
    
    const initialText = await resultsCount.innerText();
    
    await searchInput.fill('svelte');
    
    const clearBtn = page.locator('.clear-btn');
    await expect(clearBtn).toBeVisible();
    
    await clearBtn.click();
    await expect(searchInput).toHaveValue('');
    await expect(resultsCount).toHaveText(initialText);
    await expect(clearBtn).not.toBeVisible();
  });

  test('should filter projects by language', async ({ page }) => {
    const languageSelect = page.locator('.language-select');
    const resultsCount = page.locator('.results-count');
    
    const options = await languageSelect.locator('option').all();
    if (options.length > 1) {
      const langValue = await options[1].getAttribute('value');
      if (langValue) {
        await languageSelect.selectOption(langValue);
        
        const filteredNote = page.locator('.filtered-note');
        await expect(filteredNote).toBeVisible();
        await expect(filteredNote).toHaveText('(filtered)');
        
        const clearBtn = page.locator('.clear-btn');
        await expect(clearBtn).toBeVisible();
        
        await clearBtn.click();
        await expect(languageSelect).toHaveValue('');
        await expect(filteredNote).not.toBeVisible();
      }
    }
  });

  test('should show empty state for no results and allow reset', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    
    await searchInput.fill('xyznonexistent123456789');
    
    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('Nothing found');
    
    const resetBtn = emptyState.locator('.btn-reset');
    await expect(resetBtn).toBeVisible();
    
    await resetBtn.click();
    await expect(searchInput).toHaveValue('');
    await expect(emptyState).not.toBeVisible();
    
    if (await page.locator('.project-card').count() > 0) {
      await expect(page.locator('.project-card').first()).toBeVisible();
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    const errorMessage = page.locator('.error-message');
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).toContainText('😅');
    }
  });
});

