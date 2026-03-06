import { test, expect } from '@playwright/test'
import { uniqueName, uniqueSlug } from './fixtures/test-data'
import { fillByLabel, fillByPlaceholder, fillInput } from './helpers/input.helper'

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

    await page.getByRole('button', { name: 'Novo Plano' }).click()

    // Dialog should open
    await expect(page.getByRole('heading', { name: 'Novo Plano' })).toBeVisible()

    // Fill form fields
    await fillByLabel(page, 'Nome', planName)
    await fillByLabel(page, 'Slug', planSlug)
    await fillByLabel(page, 'Max instancias', '10')
    await fillByLabel(page, 'Max usuarios', '20')
    await fillByLabel(page, 'Max assistentes', '5')
    await fillByLabel(page, 'Disparos/dia', '50')
    await fillByLabel(page, 'Contatos/disparo', '1000')
    await fillByLabel(page, 'Preco (R$)', '99.90')

    // Add a benefit
    await fillByPlaceholder(page, 'Ex: 10 instancias', 'Suporte prioritario')
    await page.getByPlaceholder('Ex: 10 instancias').press('Enter')
    await expect(page.getByText('Suporte prioritario')).toBeVisible()

    // Submit
    await page.getByRole('button', { name: 'Criar Plano' }).click()

    // Plan should appear in the list
    await expect(page.getByText(planName)).toBeVisible({ timeout: 5_000 })
  })

  test('edits a plan via dialog', async ({ page }) => {
    const planName = uniqueName('plan')
    const planSlug = uniqueSlug('plan')
    const updatedName = uniqueName('plan_edited')

    // Create plan first
    await page.getByRole('button', { name: 'Novo Plano' }).click()
    await fillByLabel(page, 'Nome', planName)
    await fillByLabel(page, 'Slug', planSlug)
    await page.getByRole('button', { name: 'Criar Plano' }).click()
    await expect(page.getByText(planName)).toBeVisible({ timeout: 5_000 })

    // Find the plan row and click edit
    const planRow = page.locator('[data-testid^="plan-row-"]', { hasText: planName })
    await planRow.getByRole('button').click()

    // Dialog should open with "Editar Plano"
    await expect(page.getByRole('heading', { name: 'Editar Plano' })).toBeVisible()

    // Update name
    await fillByLabel(page, 'Nome', updatedName)
    await page.getByRole('button', { name: 'Salvar' }).click()

    // Updated name should appear
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(planName)).not.toBeVisible()
  })

  test('toggles plan active/inactive via badge', async ({ page }) => {
    const planName = uniqueName('plan')
    const planSlug = uniqueSlug('plan')

    // Create plan first
    await page.getByRole('button', { name: 'Novo Plano' }).click()
    await fillByLabel(page, 'Nome', planName)
    await fillByLabel(page, 'Slug', planSlug)
    await page.getByRole('button', { name: 'Criar Plano' }).click()
    await expect(page.getByText(planName)).toBeVisible({ timeout: 5_000 })

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

    // Create plan first
    await page.getByRole('button', { name: 'Novo Plano' }).click()
    await fillByLabel(page, 'Nome', planName)
    await fillByLabel(page, 'Slug', planSlug)
    await page.getByRole('button', { name: 'Criar Plano' }).click()
    await expect(page.getByText(planName)).toBeVisible({ timeout: 5_000 })

    // Search by name
    await fillByPlaceholder(page, /Buscar/i, planName)
    await page.waitForTimeout(500) // debounce

    // Plan should still be visible
    await expect(page.getByText(planName)).toBeVisible({ timeout: 5_000 })

    // Search with non-matching term
    await fillByPlaceholder(page, /Buscar/i, 'zzz_nonexistent_plan_zzz')
    await page.waitForTimeout(500) // debounce

    // Plan should not be visible
    await expect(page.getByText(planName)).not.toBeVisible({ timeout: 5_000 })
  })
})
