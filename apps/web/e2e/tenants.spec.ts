import { test, expect } from '@playwright/test'
import { uniqueName, uniqueSlug, uniqueEmail } from './fixtures/test-data'
import { fillByLabel, fillByPlaceholder } from './helpers/input.helper'

test.describe('Tenants CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/tenants')
    await expect(page.getByRole('heading', { name: 'Tenants' })).toBeVisible()
  })

  test('displays tenants list', async ({ page }) => {
    // Should show the header and description
    await expect(page.getByText('Gerencie as empresas cadastradas na plataforma')).toBeVisible()
  })

  test('creates a tenant via dialog', async ({ page }) => {
    const tenantName = uniqueName('tenant')
    const tenantSlug = uniqueSlug('tenant')
    const adminEmail = uniqueEmail()

    await page.getByRole('button', { name: 'Novo Tenant' }).click()

    // Dialog should open
    await expect(page.getByRole('heading', { name: 'Novo Tenant' })).toBeVisible()

    // Fill company info
    await fillByLabel(page, 'Nome da empresa', tenantName)
    await fillByLabel(page, 'Slug', tenantSlug)

    // Fill admin info
    await fillByLabel(page, 'Nome do admin', 'Admin E2E')
    await fillByLabel(page, 'Email do admin', adminEmail)
    await fillByLabel(page, 'Senha do admin', 'senha123456')

    // Submit
    await page.getByRole('button', { name: 'Criar Tenant' }).click()

    // Tenant should appear in the list
    await expect(page.getByText(tenantName)).toBeVisible({ timeout: 5_000 })
  })

  test('edits a tenant via dialog', async ({ page }) => {
    const tenantName = uniqueName('tenant')
    const tenantSlug = uniqueSlug('tenant')
    const adminEmail = uniqueEmail()
    const updatedName = uniqueName('tenant_edited')

    // Create tenant first
    await page.getByRole('button', { name: 'Novo Tenant' }).click()
    await fillByLabel(page, 'Nome da empresa', tenantName)
    await fillByLabel(page, 'Slug', tenantSlug)
    await fillByLabel(page, 'Nome do admin', 'Admin E2E')
    await fillByLabel(page, 'Email do admin', adminEmail)
    await fillByLabel(page, 'Senha do admin', 'senha123456')
    await page.getByRole('button', { name: 'Criar Tenant' }).click()
    await expect(page.getByText(tenantName)).toBeVisible({ timeout: 5_000 })

    // Find the tenant row and click edit (pencil icon)
    const tenantRow = page.locator('[data-testid^="tenant-row-"]', { hasText: tenantName })
    await tenantRow.getByRole('button').first().click()

    // Dialog should open with "Editar Tenant"
    await expect(page.getByRole('heading', { name: 'Editar Tenant' })).toBeVisible()

    // Update name
    await fillByLabel(page, 'Nome', updatedName)
    await page.getByRole('button', { name: 'Salvar' }).click()

    // Updated name should appear
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(tenantName)).not.toBeVisible()
  })

  test('deletes a tenant via dialog', async ({ page }) => {
    const tenantName = uniqueName('tenant_del')
    const tenantSlug = uniqueSlug('tenant-del')
    const adminEmail = uniqueEmail()

    // Create tenant first
    await page.getByRole('button', { name: 'Novo Tenant' }).click()
    await fillByLabel(page, 'Nome da empresa', tenantName)
    await fillByLabel(page, 'Slug', tenantSlug)
    await fillByLabel(page, 'Nome do admin', 'Admin E2E')
    await fillByLabel(page, 'Email do admin', adminEmail)
    await fillByLabel(page, 'Senha do admin', 'senha123456')
    await page.getByRole('button', { name: 'Criar Tenant' }).click()
    await expect(page.getByText(tenantName)).toBeVisible({ timeout: 5_000 })

    // Find the tenant row and click delete (trash icon - second button)
    const tenantRow = page.locator('[data-testid^="tenant-row-"]', { hasText: tenantName })
    await tenantRow.getByRole('button').nth(1).click()

    // Confirm delete dialog
    await expect(page.getByRole('heading', { name: 'Excluir tenant' })).toBeVisible()
    await page.getByRole('button', { name: 'Excluir' }).click()

    // Tenant should disappear from the list
    await expect(page.locator('[data-testid^="tenant-row-"]', { hasText: tenantName })).not.toBeVisible({ timeout: 5_000 })
  })

  test('searches tenants by name', async ({ page }) => {
    const tenantName = uniqueName('searchtenant')
    const tenantSlug = uniqueSlug('searchtenant')
    const adminEmail = uniqueEmail()

    // Create tenant first
    await page.getByRole('button', { name: 'Novo Tenant' }).click()
    await fillByLabel(page, 'Nome da empresa', tenantName)
    await fillByLabel(page, 'Slug', tenantSlug)
    await fillByLabel(page, 'Nome do admin', 'Admin E2E')
    await fillByLabel(page, 'Email do admin', adminEmail)
    await fillByLabel(page, 'Senha do admin', 'senha123456')
    await page.getByRole('button', { name: 'Criar Tenant' }).click()
    await expect(page.getByText(tenantName)).toBeVisible({ timeout: 5_000 })

    // Search by name
    await fillByPlaceholder(page, 'Buscar por nome ou slug...', tenantName)
    await page.waitForTimeout(500) // debounce

    // Tenant should still be visible
    await expect(page.getByText(tenantName)).toBeVisible({ timeout: 5_000 })

    // Search with non-matching term
    await fillByPlaceholder(page, 'Buscar por nome ou slug...', 'zzz_nonexistent_tenant_zzz')
    await page.waitForTimeout(500) // debounce

    // Tenant should not be visible
    await expect(page.getByText(tenantName)).not.toBeVisible({ timeout: 5_000 })
  })
})
