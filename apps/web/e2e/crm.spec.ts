import { test, expect } from '@playwright/test'
import { uniqueName } from './fixtures/test-data'
import { fillByLabel, fillByPlaceholder, fillInput } from './helpers/input.helper'

test.describe('CRM Kanban', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/crm')
    await expect(page.getByRole('heading', { name: /CRM.*Pipeline/i })).toBeVisible()
  })

  test('displays kanban board with stage columns', async ({ page }) => {
    // Wait for loading to finish
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 5_000 })

    // Should have at least one kanban column
    const columns = page.locator('[data-testid^="kanban-column-"]')
    await expect(columns.first()).toBeVisible({ timeout: 5_000 })
    expect(await columns.count()).toBeGreaterThan(0)
  })

  test('displays pipeline total value', async ({ page }) => {
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Pipeline total:')).toBeVisible()
  })

  test('creates a deal via sheet', async ({ page }) => {
    const title = uniqueName('deal')

    await page.getByRole('button', { name: /Novo neg/i }).click()

    // Sheet should open
    await expect(page.getByRole('heading', { name: /Novo neg/i })).toBeVisible()

    // Select a contact via the contact picker popover
    await page.getByRole('button', { name: /Selecionar contato/i }).click()
    // Wait for contacts to load and click the first one
    await page.waitForTimeout(1_000)
    const contactButton = page.locator('.max-h-\\[280px\\] button').first()
    await expect(contactButton).toBeVisible({ timeout: 5_000 })
    await contactButton.click()

    // Fill title
    const titleLocator = page.getByLabel('Titulo').or(page.getByPlaceholder(/Venda/i))
    await fillInput(titleLocator, title)

    // Fill value
    const valueLocator = page.getByLabel(/Valor/i).or(page.getByPlaceholder('0,00')).first()
    await fillInput(valueLocator, '1500')

    // Submit
    await page.getByRole('button', { name: /Criar neg/i }).click()

    // Deal card should appear on the board
    await expect(
      page.locator('[data-testid^="deal-card-"]', { hasText: title })
    ).toBeVisible({ timeout: 5_000 })
  })

  test('opens deal detail by clicking on card', async ({ page }) => {
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 5_000 })

    // Click on the first deal card if available
    const firstDeal = page.locator('[data-testid^="deal-card-"]').first()
    const dealCount = await page.locator('[data-testid^="deal-card-"]').count()

    if (dealCount > 0) {
      await firstDeal.click()

      // Deal detail sheet should open with contact info, notes section, etc.
      await expect(page.getByText('Etapa')).toBeVisible({ timeout: 5_000 })
      await expect(page.getByText('Valor')).toBeVisible()
      await expect(page.getByText('Contato')).toBeVisible()
      await expect(page.getByText('Notas')).toBeVisible()
    }
  })

  test('adds a note to a deal', async ({ page }) => {
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 5_000 })

    const dealCards = page.locator('[data-testid^="deal-card-"]')
    const count = await dealCards.count()
    if (count === 0) return

    // Open the first deal
    await dealCards.first().click()
    await expect(page.getByText('Notas')).toBeVisible({ timeout: 5_000 })

    // Type a note
    const noteText = uniqueName('note')
    await fillByPlaceholder(page, 'Adicionar nota...', noteText)

    // Save note
    await page.getByRole('button', { name: 'Salvar nota' }).click()

    // Note should appear in the notes list
    await expect(page.getByText(noteText)).toBeVisible({ timeout: 5_000 })
  })

  test('edits deal title inline', async ({ page }) => {
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 5_000 })

    const dealCards = page.locator('[data-testid^="deal-card-"]')
    const count = await dealCards.count()
    if (count === 0) return

    // Open deal detail
    await dealCards.first().click()
    await expect(page.getByText('Etapa')).toBeVisible({ timeout: 5_000 })

    // Click on the title (which has a pencil icon) to enter edit mode
    const titleButton = page.locator('button').filter({ has: page.locator('.lucide-pencil') }).first()
    await titleButton.click()

    // Should show an input for editing
    const titleInput = page.locator('input[autofocus]').first()
    await expect(titleInput).toBeVisible()

    const newTitle = uniqueName('edited')
    await fillInput(titleInput, newTitle)
    await titleInput.press('Enter')

    // Wait for save
    await page.waitForTimeout(500)
  })

  test('deletes a deal via confirmation dialog', async ({ page }) => {
    // First create a deal to delete
    const title = uniqueName('deal-del')

    await page.getByRole('button', { name: /Novo neg/i }).click()
    await expect(page.getByRole('heading', { name: /Novo neg/i })).toBeVisible()

    // Select contact
    await page.getByRole('button', { name: /Selecionar contato/i }).click()
    await page.waitForTimeout(1_000)
    const contactBtn = page.locator('.max-h-\\[280px\\] button').first()
    await expect(contactBtn).toBeVisible({ timeout: 5_000 })
    await contactBtn.click()

    // Fill title
    const titleLocator = page.getByLabel('Titulo').or(page.getByPlaceholder(/Venda/i))
    await fillInput(titleLocator, title)

    // Submit
    await page.getByRole('button', { name: /Criar neg/i }).click()

    // Wait for card to appear
    const dealCard = page.locator('[data-testid^="deal-card-"]', { hasText: title })
    await expect(dealCard).toBeVisible({ timeout: 5_000 })

    // Open deal detail
    await dealCard.click()
    await expect(page.getByText('Notas')).toBeVisible({ timeout: 5_000 })

    // Click delete button
    await page.getByRole('button', { name: /Excluir neg/i }).click()

    // Confirm in dialog
    await expect(page.getByRole('heading', { name: 'Confirmar exclusão' })).toBeVisible()
    await page.getByRole('button', { name: 'Excluir' }).click()

    // Deal should disappear
    await expect(dealCard).not.toBeVisible({ timeout: 5_000 })
  })

  test('filters deals by search', async ({ page }) => {
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 5_000 })

    // Type in the search input
    const searchInput = page.getByPlaceholder(/Buscar por nome/i)
    await fillInput(searchInput, 'xyznonexistent_e2e_999')

    // Wait for filter to apply
    await page.waitForTimeout(500)

    // Should show "Sem negocios" in all columns or no deal cards
    const dealCount = await page.locator('[data-testid^="deal-card-"]').count()
    expect(dealCount).toBe(0)

    // Clear search
    await searchInput.clear()
    await page.waitForTimeout(500)
  })

  test('cancel closes the create sheet', async ({ page }) => {
    await page.getByRole('button', { name: /Novo neg/i }).click()
    await expect(page.getByRole('heading', { name: /Novo neg/i })).toBeVisible()

    await page.getByRole('button', { name: 'Cancelar' }).click()

    await expect(page.getByRole('heading', { name: /Novo neg/i })).not.toBeVisible()
  })
})
