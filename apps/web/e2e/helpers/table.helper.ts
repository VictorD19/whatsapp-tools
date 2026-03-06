import { type Page, expect } from '@playwright/test'
import { fillInput } from './input.helper'

/**
 * Find the search input and type a query, waiting for debounce.
 */
export async function searchInList(page: Page, query: string) {
  const searchInput = page
    .getByRole('searchbox')
    .or(page.getByPlaceholder(/Buscar/i))
  await fillInput(searchInput, query)
  // Wait for debounce (typically 500ms)
  await page.waitForTimeout(600)
}

/**
 * Assert that a row/item with the given text is visible on the page.
 */
export async function expectRowWithText(page: Page, text: string) {
  await expect(page.getByText(text, { exact: false })).toBeVisible()
}

/**
 * Assert that a row/item with the given text is NOT visible on the page.
 */
export async function expectNoRowWithText(page: Page, text: string) {
  await expect(page.getByText(text, { exact: false })).toBeHidden()
}

/**
 * Clear the search input.
 */
export async function clearSearch(page: Page) {
  const searchInput = page
    .getByRole('searchbox')
    .or(page.getByPlaceholder(/Buscar/i))
  await searchInput.clear()
  await page.waitForTimeout(600)
}
