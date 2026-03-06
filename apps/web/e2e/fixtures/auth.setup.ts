import { test as setup, expect } from '@playwright/test'

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  const emailInput = page.locator('#email')
  const passwordInput = page.locator('#password')

  await emailInput.click()
  await emailInput.pressSequentially('admin@admin.com', { delay: 30 })

  await passwordInput.click()
  await passwordInput.pressSequentially('admin123', { delay: 30 })

  await page.getByRole('button', { name: 'Entrar' }).click()

  await page.waitForURL('**/inbox', { timeout: 15_000 })
  await expect(page).toHaveURL(/\/inbox/)

  await page.context().storageState({ path: 'e2e/.auth/admin.json' })
})
