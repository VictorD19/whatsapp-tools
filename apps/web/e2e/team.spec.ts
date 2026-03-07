import { test, expect } from '@playwright/test'
import { uniqueName, uniqueEmail } from './fixtures/test-data'
import { fillByLabel } from './helpers/input.helper'

test.describe('Team CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/team')
    await expect(page.getByRole('heading', { name: 'Equipe' })).toBeVisible()
  })

  test('displays team members list', async ({ page }) => {
    await expect(page.locator('p', { hasText: /\d+ membros?/ })).toBeVisible()
  })

  test('creates a member via Sheet', async ({ page }) => {
    const name = uniqueName('member')
    const email = uniqueEmail()

    await page.getByRole('button', { name: 'Novo Membro' }).click()

    // Sheet should open
    await expect(page.getByRole('heading', { name: 'Novo Membro' })).toBeVisible()

    // Fill form
    await fillByLabel(page, 'Nome', name)
    await fillByLabel(page, 'Email', email)
    await fillByLabel(page, 'Senha', 'test123456')

    // Select role (Admin)
    await page.getByRole('button', { name: 'Admin' }).click()

    // Submit
    await page.getByRole('button', { name: 'Criar' }).click()

    // Member should appear in the list (may fail if plan limit reached)
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 8_000 })
  })

  test('edits a member via Sheet', async ({ page }) => {
    const name = uniqueName('member')
    const email = uniqueEmail()
    const updatedName = uniqueName('member_edited')

    // Create member first
    await page.getByRole('button', { name: 'Novo Membro' }).click()
    await fillByLabel(page, 'Nome', name)
    await fillByLabel(page, 'Email', email)
    await fillByLabel(page, 'Senha', 'test123456')
    await page.getByRole('button', { name: 'Criar' }).click()
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 8_000 })

    // Find the member row and click edit (pencil icon - first action button)
    const memberRow = page.locator('[data-testid^="member-row-"]', { hasText: name })
    await memberRow.getByRole('button').first().click()

    // Sheet should open with "Editar Membro"
    await expect(page.getByRole('heading', { name: 'Editar Membro' })).toBeVisible()

    // Update name
    await fillByLabel(page, 'Nome', updatedName)

    // Change role to Visualizador
    await page.getByRole('button', { name: 'Visualizador' }).click()

    // Submit
    await page.getByRole('button', { name: 'Salvar' }).click()

    // Updated name should appear
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(name, { exact: true })).not.toBeVisible({ timeout: 5_000 })
  })

  test('changes password via Sheet', async ({ page }) => {
    const name = uniqueName('member')
    const email = uniqueEmail()

    // Create member first
    await page.getByRole('button', { name: 'Novo Membro' }).click()
    await fillByLabel(page, 'Nome', name)
    await fillByLabel(page, 'Email', email)
    await fillByLabel(page, 'Senha', 'test123456')
    await page.getByRole('button', { name: 'Criar' }).click()
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 8_000 })

    // Find the member row and click password button (second action button)
    const memberRow = page.locator('[data-testid^="member-row-"]', { hasText: name })
    await memberRow.getByRole('button').nth(1).click()

    // Sheet should open with "Alterar Senha"
    await expect(page.getByRole('heading', { name: 'Alterar Senha' })).toBeVisible()

    // Fill password fields
    await fillByLabel(page, 'Nova senha', 'newpass123456')
    await fillByLabel(page, 'Confirmar senha', 'newpass123456')

    // Submit
    await page.getByRole('button', { name: 'Alterar senha' }).click()

    // Sheet should close (success toast)
    await expect(page.getByRole('heading', { name: 'Alterar Senha' })).not.toBeVisible({ timeout: 5_000 })
  })

  test('deactivates a member via Dialog', async ({ page }) => {
    const name = uniqueName('member')
    const email = uniqueEmail()

    // Create member first
    await page.getByRole('button', { name: 'Novo Membro' }).click()
    await fillByLabel(page, 'Nome', name)
    await fillByLabel(page, 'Email', email)
    await fillByLabel(page, 'Senha', 'test123456')
    await page.getByRole('button', { name: 'Criar' }).click()
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 8_000 })

    // Find the member row and click deactivate (third action button - UserX icon)
    const memberRow = page.locator('[data-testid^="member-row-"]', { hasText: name })
    await memberRow.getByRole('button').nth(2).click()

    // Confirm dialog should open
    await expect(page.getByRole('heading', { name: 'Desativar membro' })).toBeVisible()

    // Click destructive button
    await page.getByRole('button', { name: 'Desativar' }).click()

    // Member should show as deactivated
    await expect(memberRow.getByText('Desativado')).toBeVisible({ timeout: 5_000 })
  })

  test('cannot deactivate self', async ({ page }) => {
    // The current logged-in user row should have the "Voce" badge
    const selfRow = page.locator('[data-testid^="member-row-"]', { hasText: 'Voce' })
    await expect(selfRow).toBeVisible({ timeout: 5_000 })

    // The deactivate button (UserX) should be disabled for self
    // It's the last action button in the row
    const deactivateButton = selfRow.locator('button:has(svg)').last()
    await expect(deactivateButton).toBeDisabled()
  })
})
