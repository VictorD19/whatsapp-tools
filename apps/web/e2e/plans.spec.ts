import { test, expect } from '@playwright/test'
import { uniqueName, uniqueSlug } from './fixtures/test-data'
import { fillByLabel, fillByPlaceholder, fillInput } from './helpers/input.helper'

/**
 * After creating a plan, the list may have grown past the first page (data accumulates
 * across test runs). Use the search box to bring the plan into view before interacting.
 */
async function createAndFind(
  page: Parameters<Parameters<typeof test>[1]>[0],
  planName: string,
  planSlug: string,
  extraFields?: () => Promise<void>,
) {
  await page.getByRole('button', { name: 'Novo Plano' }).click()
  await expect(page.getByRole('heading', { name: 'Novo Plano' })).toBeVisible()
  await fillByLabel(page, 'Nome', planName)
  await fillByLabel(page, 'Slug', planSlug)
  if (extraFields) await extraFields()
  await page.getByRole('button', { name: 'Criar Plano' }).click()
  // Wait for dialog to close
  await expect(page.getByRole('heading', { name: 'Novo Plano' })).not.toBeVisible({ timeout: 5_000 })
  // Filter so the plan is guaranteed to appear on the first page
  await fillByPlaceholder(page, 'Buscar por nome ou slug...', planName)
  await page.waitForTimeout(400)
  await expect(page.getByText(planName)).toBeVisible({ timeout: 5_000 })
}

test.describe('Plans CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/plans')
    await expect(page.getByRole('heading', { name: 'Planos' })).toBeVisible()
  })

  test('displays plans list', async ({ page }) => {
    // Should show the header and description
    await expect(page.getByText('Gerencie os planos disponiveis na plataforma')).toBeVisible()
  })

  test('creates a plan via dialog', async ({ page }) => {
    const planName = uniqueName('plan')
    const planSlug = uniqueSlug('plan')

    await createAndFind(page, planName, planSlug, async () => {
      await fillByLabel(page, 'Max instancias', '10')
      await fillByLabel(page, 'Max usuarios', '20')
      await fillByLabel(page, 'Max assistentes', '5')
      await fillByLabel(page, 'Disparos/dia', '50')
      await fillByLabel(page, 'Contatos/disparo', '1000')
      await fillByLabel(page, 'Preco (R$)', '99.90')
      await fillByPlaceholder(page, 'Ex: 10 instancias', 'Suporte prioritario')
      await page.getByPlaceholder('Ex: 10 instancias').press('Enter')
      await expect(page.getByText('Suporte prioritario')).toBeVisible()
    })
  })

  test('edits a plan via dialog', async ({ page }) => {
    const planName = uniqueName('plan')
    const planSlug = uniqueSlug('plan')
    const updatedName = uniqueName('plan_edited')

    await createAndFind(page, planName, planSlug)

    // Find the plan row and click the edit icon button (last button)
    const planRow = page.locator('[data-testid^="plan-row-"]', { hasText: planName })
    await planRow.getByRole('button').last().click()

    // Dialog should open with "Editar Plano"
    await expect(page.getByRole('heading', { name: 'Editar Plano' })).toBeVisible()

    // Update name
    await fillByLabel(page, 'Nome', updatedName)
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByRole('heading', { name: 'Editar Plano' })).not.toBeVisible({ timeout: 5_000 })

    // Search by updated name to confirm rename
    await fillByPlaceholder(page, 'Buscar por nome ou slug...', updatedName)
    await page.waitForTimeout(400)
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 5_000 })

    // Old name no longer matches the filter
    await expect(page.locator('[data-testid^="plan-row-"]', { hasText: planName })).not.toBeVisible()
  })

  test('toggles plan active/inactive via badge', async ({ page }) => {
    const planName = uniqueName('plan')
    const planSlug = uniqueSlug('plan')

    await createAndFind(page, planName, planSlug)

    // Find the plan row and click the Ativo badge to toggle
    const planRow = page.locator('[data-testid^="plan-row-"]', { hasText: planName })
    await planRow.getByText('Ativo').click()

    // Should now show Inativo
    await expect(planRow.getByText('Inativo')).toBeVisible({ timeout: 5_000 })

    // Toggle back
    await planRow.getByText('Inativo').click()
    await expect(planRow.getByText('Ativo')).toBeVisible({ timeout: 5_000 })
  })

  test('searches plans by name', async ({ page }) => {
    const planName = uniqueName('searchplan')
    const planSlug = uniqueSlug('searchplan')

    await page.getByRole('button', { name: 'Novo Plano' }).click()
    await fillByLabel(page, 'Nome', planName)
    await fillByLabel(page, 'Slug', planSlug)
    await page.getByRole('button', { name: 'Criar Plano' }).click()

    // Wait for dialog to close
    await expect(page.getByRole('heading', { name: 'Novo Plano' })).not.toBeVisible({ timeout: 5_000 })

    // Search by name — the plan may be on a later page without filtering
    await fillByPlaceholder(page, 'Buscar por nome ou slug...', planName)
    await page.waitForTimeout(500) // debounce

    // Plan should be visible after filtering
    await expect(page.getByText(planName)).toBeVisible({ timeout: 5_000 })

    // Search with non-matching term
    await fillByPlaceholder(page, 'Buscar por nome ou slug...', 'zzz_nonexistent_plan_zzz')
    await page.waitForTimeout(500) // debounce

    // Plan should not be visible
    await expect(page.getByText(planName)).not.toBeVisible({ timeout: 5_000 })
  })
})
