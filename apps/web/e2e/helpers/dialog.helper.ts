import { type Page } from '@playwright/test'

/**
 * Click the destructive confirmation button in a dialog.
 */
export async function confirmDelete(page: Page, buttonText = 'Excluir') {
  const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'))
  await dialog.getByRole('button', { name: buttonText }).click()
}

/**
 * Click any action button inside a dialog.
 */
export async function confirmAction(page: Page, buttonText: string) {
  const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'))
  await dialog.getByRole('button', { name: buttonText }).click()
}

/**
 * Click the cancel button inside a dialog.
 */
export async function cancelDialog(page: Page) {
  const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'))
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
}
