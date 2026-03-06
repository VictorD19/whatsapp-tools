import { test, expect } from '@playwright/test'
import { fillInput } from './helpers/input.helper'

test.describe('Auth', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('login with valid credentials redirects to inbox', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await fillInput(page.locator('#email'), 'admin@admin.com')
    await fillInput(page.locator('#password'), 'admin123')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await page.waitForURL('**/inbox', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/inbox/)
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await fillInput(page.locator('#email'), 'wrong@email.com')
    await fillInput(page.locator('#password'), 'wrongpassword')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page.getByText('Email ou senha incorretos')).toBeVisible({ timeout: 10_000 })
  })
})
