import { test, expect } from '@playwright/test'
import { uniqueName } from './fixtures/test-data'
import { fillInput } from './helpers/input.helper'

test.describe('Contact Lists', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact-lists')
    await expect(page.getByRole('heading', { name: 'Listas de Contatos' })).toBeVisible()
  })

  test('displays contact lists', async ({ page }) => {
    await expect(page.getByText(/listas? cadastradas?/i)).toBeVisible()
  })

  test('deletes a list via Dialog', async ({ page }) => {
    // Wait for the table to load
    const firstRow = page.locator('[data-testid^="list-row-"]').first()

    // Skip if no lists exist
    const hasLists = await firstRow.isVisible({ timeout: 3_000 }).catch(() => false)
    if (!hasLists) {
      test.skip()
      return
    }

    // Get the list name before deleting
    const listName = await firstRow.locator('td').first().locator('.font-medium').textContent()

    // Click delete button on first row
    await firstRow.getByRole('button').click()

    // Confirm dialog should open
    await expect(page.getByRole('heading', { name: 'Remover lista' })).toBeVisible()

    // Click destructive button
    await page.getByRole('button', { name: 'Remover' }).click()

    // Dialog should close
    await expect(page.getByRole('heading', { name: 'Remover lista' })).not.toBeVisible({ timeout: 5_000 })

    // If the list name was unique, it should no longer be visible
    if (listName) {
      await expect(page.getByText(listName, { exact: true })).not.toBeVisible({ timeout: 5_000 })
    }
  })

  test('searches by name', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Buscar por nome...')
    await expect(searchInput).toBeVisible()

    // Type a search term
    const searchTerm = uniqueName('nonexistent')
    await fillInput(searchInput, searchTerm)

    // Wait for debounce
    await page.waitForTimeout(500)

    // Should show empty state since the search term is unique/nonexistent
    await expect(page.getByText(/Nenhuma lista encontrada/i)).toBeVisible({ timeout: 5_000 })

    // Clear search
    await searchInput.clear()
    await page.waitForTimeout(500)

    // Should restore original state
    await expect(page.getByText(/listas? cadastradas?/i)).toBeVisible({ timeout: 5_000 })
  })

  test('pagination navigates between pages', async ({ page }) => {
    // Check if pagination exists (only when totalPages > 1)
    const nextButton = page.getByRole('button', { name: 'Proximo' })
    const hasPagination = await nextButton.isVisible({ timeout: 3_000 }).catch(() => false)

    if (!hasPagination) {
      test.skip()
      return
    }

    // Should show current page info
    await expect(page.getByText(/Pagina \d+ de \d+/i)).toBeVisible()

    // Previous button should be disabled on first page
    const prevButton = page.getByRole('button', { name: 'Anterior' })
    await expect(prevButton).toBeDisabled()

    // Click next
    await nextButton.click()

    // Should now show page 2
    await expect(page.getByText(/Pagina 2 de/i)).toBeVisible({ timeout: 5_000 })

    // Previous button should now be enabled
    await expect(prevButton).toBeEnabled()
  })
})
