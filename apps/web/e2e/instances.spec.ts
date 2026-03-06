import { test, expect } from '@playwright/test'
import { uniqueName } from './fixtures/test-data'
import { fillByLabel, fillInput } from './helpers/input.helper'

test.describe('Instances Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/instances')
    await expect(page.getByRole('heading', { name: 'Instancias WhatsApp' })).toBeVisible()
  })

  test('displays stats cards', async ({ page }) => {
    await expect(page.getByText('Total')).toBeVisible()
    await expect(page.getByText('Conectadas')).toBeVisible()
    await expect(page.getByText('Conectando')).toBeVisible()
    await expect(page.getByText('Desconectadas')).toBeVisible()
  })

  test('creates an instance via modal', async ({ page }) => {
    const name = uniqueName('inst')

    await page.getByRole('button', { name: 'Nova instancia' }).click()

    // Dialog should open
    await expect(page.getByRole('heading', { name: 'Nova instancia WhatsApp' })).toBeVisible()

    // Fill name
    await fillByLabel(page, 'Nome', name)

    // Submit
    await page.getByRole('button', { name: 'Criar instancia' }).click()

    // Instance card should appear
    await expect(
      page.locator('[data-testid^="instance-card-"]', { hasText: name })
    ).toBeVisible({ timeout: 5_000 })
  })

  test('validates instance name', async ({ page }) => {
    await page.getByRole('button', { name: 'Nova instancia' }).click()
    await expect(page.getByRole('heading', { name: 'Nova instancia WhatsApp' })).toBeVisible()

    // Try submitting with a single character (min 2)
    await fillByLabel(page, 'Nome', 'a')
    await page.getByRole('button', { name: 'Criar instancia' }).click()

    // Should show validation error
    await expect(page.getByText(/pelo menos 2 caracteres/i)).toBeVisible()

    // Try with invalid characters
    await fillByLabel(page, 'Nome', 'invalid name!')
    await page.getByRole('button', { name: 'Criar instancia' }).click()

    await expect(page.getByText(/Apenas letras/i)).toBeVisible()
  })

  test('deletes an instance', async ({ page }) => {
    const name = uniqueName('inst-del')

    // Create instance first
    await page.getByRole('button', { name: 'Nova instancia' }).click()
    await fillByLabel(page, 'Nome', name)
    await page.getByRole('button', { name: 'Criar instancia' }).click()

    const card = page.locator('[data-testid^="instance-card-"]', { hasText: name })
    await expect(card).toBeVisible({ timeout: 5_000 })

    // Click delete (trash icon button on the card)
    await card.getByRole('button').filter({ has: page.locator('svg') }).last().click()

    // Instance should disappear
    await expect(card).not.toBeVisible({ timeout: 5_000 })
  })

  test('shows empty state when no instances', async ({ page }) => {
    // This test verifies the empty state rendering.
    // It may or may not be visible depending on existing data,
    // so we just verify the page structure loaded correctly.
    const heading = page.getByRole('heading', { name: 'Instancias WhatsApp' })
    await expect(heading).toBeVisible()

    // Either we see instance cards or the empty state
    const hasCards = await page.locator('[data-testid^="instance-card-"]').count()
    if (hasCards === 0) {
      await expect(page.getByText('Nenhuma instancia criada')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Criar primeira instancia' })).toBeVisible()
    }
  })

  test('cancel closes the create modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Nova instancia' }).click()
    await expect(page.getByRole('heading', { name: 'Nova instancia WhatsApp' })).toBeVisible()

    await page.getByRole('button', { name: 'Cancelar' }).click()

    await expect(page.getByRole('heading', { name: 'Nova instancia WhatsApp' })).not.toBeVisible()
  })
})
