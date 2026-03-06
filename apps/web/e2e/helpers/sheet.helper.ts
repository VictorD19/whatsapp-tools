import { type Page, expect } from '@playwright/test'

/**
 * Wait for a sheet (side panel) with the given title to be visible.
 * Sheets use role="dialog" from Radix UI.
 */
export async function expectSheetOpen(page: Page, title: string) {
  const sheet = page.getByRole('dialog')
  await expect(sheet).toBeVisible()
  await expect(sheet.getByText(title, { exact: false })).toBeVisible()
  return sheet
}

/**
 * Click the submit button inside the sheet.
 */
export async function submitSheet(page: Page, buttonText = 'Salvar') {
  const sheet = page.getByRole('dialog')
  await sheet.getByRole('button', { name: buttonText }).click()
}

/**
 * Verify that the sheet is no longer visible.
 */
export async function expectSheetClosed(page: Page) {
  await expect(page.getByRole('dialog')).toBeHidden()
}
