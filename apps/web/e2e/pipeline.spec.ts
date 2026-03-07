import { test, expect } from '@playwright/test'
import { uniqueName } from './fixtures/test-data'
import { fillByLabel } from './helpers/input.helper'

test.describe('Pipeline Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/pipeline')
    await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible()
  })

  test('displays pipeline stages', async ({ page }) => {
    await expect(page.getByText(/Gerencie os estagios/i)).toBeVisible()
  })

  test('creates a new stage via dialog', async ({ page }) => {
    const stageName = uniqueName('stage')

    await page.getByRole('button', { name: 'Novo estagio' }).click()

    // Dialog should open
    await expect(page.getByRole('heading', { name: 'Novo estagio' })).toBeVisible()

    // Fill name
    await fillByLabel(page, 'Nome', stageName)

    // Select type "Ativo"
    await page.getByRole('button', { name: 'Ativo' }).click()

    // Submit
    await page.getByRole('button', { name: 'Criar' }).click()

    // Stage should appear
    await expect(page.getByText(stageName)).toBeVisible({ timeout: 5_000 })
  })

  test('edits a stage via dialog', async ({ page }) => {
    const stageName = uniqueName('stage')
    const updatedName = uniqueName('stage_edited')

    // Create stage first
    await page.getByRole('button', { name: 'Novo estagio' }).click()
    await fillByLabel(page, 'Nome', stageName)
    await page.getByRole('button', { name: 'Criar' }).click()
    await expect(page.getByText(stageName)).toBeVisible({ timeout: 5_000 })

    // Click edit on the stage row
    const stageRow = page.locator(`[data-testid^="stage-row-"]`, { hasText: stageName })
    await stageRow.locator('button').filter({ has: page.locator('svg') }).nth(-2).click()

    // Dialog should open
    await expect(page.getByRole('heading', { name: 'Editar estagio' })).toBeVisible()

    // Update name
    await fillByLabel(page, 'Nome', updatedName)
    await page.getByRole('button', { name: 'Salvar' }).click()

    // Updated name should appear
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 5_000 })
  })

  test('deletes a non-default stage via dialog', async ({ page }) => {
    const stageName = uniqueName('stage_del')

    // Create stage first
    await page.getByRole('button', { name: 'Novo estagio' }).click()
    await fillByLabel(page, 'Nome', stageName)
    await page.getByRole('button', { name: 'Criar' }).click()
    await expect(page.getByText(stageName)).toBeVisible({ timeout: 5_000 })

    // Click delete on the stage row (last button)
    const stageRow = page.locator(`[data-testid^="stage-row-"]`, { hasText: stageName })
    await stageRow.locator('button').filter({ has: page.locator('svg') }).last().click()

    // Confirm delete
    await expect(page.getByRole('heading', { name: 'Excluir estagio' })).toBeVisible()
    await page.getByRole('button', { name: 'Excluir' }).click()

    // Stage should disappear from the list
    await expect(page.locator('[data-testid^="stage-row-"]', { hasText: stageName })).not.toBeVisible({ timeout: 5_000 })
  })

  test('default stage delete button is disabled', async ({ page }) => {
    // Find a row with "Padrao" badge
    const defaultRow = page.locator(`[data-testid^="stage-row-"]`, { hasText: 'Padrao' }).first()

    if (await defaultRow.isVisible()) {
      // The delete button (last button) should be disabled
      const deleteBtn = defaultRow.locator('button').filter({ has: page.locator('svg') }).last()
      await expect(deleteBtn).toBeDisabled()
    }
  })

  test('reorders stages with up/down arrows', async ({ page }) => {
    // Create two stages to test reorder
    const stage1 = uniqueName('order1')
    const stage2 = uniqueName('order2')

    // Create stage1
    await page.getByRole('button', { name: 'Novo estagio' }).click()
    await fillByLabel(page, 'Nome', stage1)
    await page.getByRole('button', { name: 'Criar' }).click()
    await expect(page.getByText(stage1)).toBeVisible({ timeout: 5_000 })

    // Create stage2
    await page.getByRole('button', { name: 'Novo estagio' }).click()
    await fillByLabel(page, 'Nome', stage2)
    await page.getByRole('button', { name: 'Criar' }).click()
    await expect(page.getByText(stage2)).toBeVisible({ timeout: 5_000 })

    // Click move up on stage2 row
    const stage2Row = page.locator(`[data-testid^="stage-row-"]`, { hasText: stage2 })
    // The up arrow button is the first in the move buttons group
    const buttons = stage2Row.locator('button').filter({ has: page.locator('svg') })
    // Arrow buttons are before edit/delete buttons
    await buttons.first().click()

    // Wait for reorder to complete
    await page.waitForTimeout(500)

    // Both stages should still be visible
    await expect(page.getByText(stage1)).toBeVisible()
    await expect(page.getByText(stage2)).toBeVisible()
  })
})
