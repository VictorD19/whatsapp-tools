import { test, expect } from '@playwright/test'
import { uniqueName } from './fixtures/test-data'
import { fillByLabel } from './helpers/input.helper'

test.describe('Tags CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/tags')
    await expect(page.getByRole('heading', { name: 'Tags' })).toBeVisible()
  })

  test('displays tags list', async ({ page }) => {
    await expect(page.getByText(/tags? cadastradas?/i)).toBeVisible()
  })

  test('creates a new tag via dialog', async ({ page }) => {
    const tagName = uniqueName('tag')

    await page.getByRole('button', { name: 'Nova tag' }).click()

    // Dialog should open
    await expect(page.getByRole('heading', { name: 'Nova tag' })).toBeVisible()

    // Fill name
    await fillByLabel(page, 'Nome', tagName)

    // Submit
    await page.getByRole('button', { name: 'Criar' }).click()

    // Tag should appear in the list
    await expect(page.getByText(tagName)).toBeVisible({ timeout: 5_000 })
  })

  test('edits an existing tag via dialog', async ({ page }) => {
    const tagName = uniqueName('tag')
    const updatedName = uniqueName('tag_edited')

    // Create tag first
    await page.getByRole('button', { name: 'Nova tag' }).click()
    await fillByLabel(page, 'Nome', tagName)
    await page.getByRole('button', { name: 'Criar' }).click()
    await expect(page.getByText(tagName)).toBeVisible({ timeout: 5_000 })

    // Find the tag row and click edit
    const tagRow = page.getByText(tagName).locator('..')
    await tagRow.locator('..').getByRole('button').first().click()

    // Dialog should open with "Editar tag"
    await expect(page.getByRole('heading', { name: 'Editar tag' })).toBeVisible()

    // Update name
    await fillByLabel(page, 'Nome', updatedName)
    await page.getByRole('button', { name: 'Salvar' }).click()

    // Updated name should appear
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(tagName)).not.toBeVisible()
  })

  test('deletes a tag via dialog', async ({ page }) => {
    const tagName = uniqueName('tag_del')

    // Create tag first
    await page.getByRole('button', { name: 'Nova tag' }).click()
    await fillByLabel(page, 'Nome', tagName)
    await page.getByRole('button', { name: 'Criar' }).click()
    await expect(page.getByText(tagName)).toBeVisible({ timeout: 5_000 })

    // Find the tag and click delete (trash icon button)
    const tagItem = page.locator(`[data-testid^="tag-item-"]`, { hasText: tagName })
    await tagItem.getByRole('button').nth(1).click()

    // Confirm delete dialog
    await expect(page.getByRole('heading', { name: 'Excluir tag' })).toBeVisible()
    await page.getByRole('button', { name: 'Excluir' }).click()

    // Tag should disappear
    await expect(page.getByText(tagName)).not.toBeVisible({ timeout: 5_000 })
  })
})
