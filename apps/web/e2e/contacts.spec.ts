import { test, expect } from '@playwright/test'
import { uniqueName, uniquePhone } from './fixtures/test-data'
import { fillByLabel, fillByPlaceholder, fillInput } from './helpers/input.helper'

test.describe('Contacts CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contacts')
    await expect(page.getByRole('heading', { name: 'Contatos' })).toBeVisible()
  })

  test('displays contacts list', async ({ page }) => {
    await expect(page.getByText(/contatos? cadastrados?/i)).toBeVisible()
  })

  test('creates a contact via sheet', async ({ page }) => {
    const phone = uniquePhone()
    const name = uniqueName('contact')

    await page.getByRole('button', { name: 'Novo contato' }).click()

    // Sheet should open
    await expect(page.getByRole('heading', { name: 'Novo contato' })).toBeVisible()

    // Fill form
    await fillByLabel(page, 'Telefone', phone)
    await fillByLabel(page, /Nome/i, name)

    // Submit
    await page.getByRole('button', { name: 'Criar' }).click()

    // Contact should appear in the list
    await expect(page.getByText(name)).toBeVisible({ timeout: 5_000 })
  })

  test('edits a contact via sheet', async ({ page }) => {
    const phone = uniquePhone()
    const name = uniqueName('contact')
    const updatedName = uniqueName('contact_edited')

    // Create contact first
    await page.getByRole('button', { name: 'Novo contato' }).click()
    await fillByLabel(page, 'Telefone', phone)
    await fillByLabel(page, /Nome/i, name)
    await page.getByRole('button', { name: 'Criar' }).click()
    await expect(page.getByText(name)).toBeVisible({ timeout: 5_000 })

    // Click edit on the row
    const row = page.locator(`[data-testid^="contact-row-"]`, { hasText: name })
    await row.getByRole('button').first().click()

    // Sheet should open with "Editar contato"
    await expect(page.getByRole('heading', { name: 'Editar contato' })).toBeVisible()

    // Update name
    await fillByLabel(page, /Nome/i, updatedName)
    await page.getByRole('button', { name: 'Salvar' }).click()

    // Updated name should be visible
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 5_000 })
  })

  test('deletes a contact via dialog', async ({ page }) => {
    const phone = uniquePhone()
    const name = uniqueName('contact_del')

    // Create contact first
    await page.getByRole('button', { name: 'Novo contato' }).click()
    await fillByLabel(page, 'Telefone', phone)
    await fillByLabel(page, /Nome/i, name)
    await page.getByRole('button', { name: 'Criar' }).click()
    await expect(page.getByText(name)).toBeVisible({ timeout: 5_000 })

    // Click delete button (trash icon)
    const row = page.locator(`[data-testid^="contact-row-"]`, { hasText: name })
    await row.getByRole('button').nth(1).click()

    // Confirm delete dialog
    await expect(page.getByRole('heading', { name: 'Remover contato' })).toBeVisible()
    await page.getByRole('button', { name: 'Remover' }).click()

    // Contact should disappear
    await expect(page.getByText(name)).not.toBeVisible({ timeout: 5_000 })
  })

  test('searches contacts by name', async ({ page }) => {
    const phone = uniquePhone()
    const name = uniqueName('searchable')

    // Create contact
    await page.getByRole('button', { name: 'Novo contato' }).click()
    await fillByLabel(page, 'Telefone', phone)
    await fillByLabel(page, /Nome/i, name)
    await page.getByRole('button', { name: 'Criar' }).click()
    await expect(page.getByText(name)).toBeVisible({ timeout: 5_000 })

    // Search by name
    const searchInput = page.getByPlaceholder(/Buscar/i)
    await fillInput(searchInput, name)

    // Wait for debounce
    await page.waitForTimeout(500)

    // Should still show the contact
    await expect(page.getByText(name)).toBeVisible()

    // Search for something that doesn't exist
    await fillInput(searchInput, 'xyznonexistent123')
    await page.waitForTimeout(500)

    await expect(page.getByText('Nenhum contato encontrado')).toBeVisible({ timeout: 5_000 })
  })
})
