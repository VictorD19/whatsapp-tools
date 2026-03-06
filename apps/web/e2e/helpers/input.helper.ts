import { type Page, type Locator } from '@playwright/test'

/**
 * Fill an input field using pressSequentially to trigger React onChange events.
 * Standard Playwright fill() does not dispatch React synthetic events on controlled inputs.
 */
export async function fillInput(locator: Locator, value: string) {
  await locator.click()
  await locator.clear()
  await locator.pressSequentially(value, { delay: 10 })
}

/**
 * Fill an input found by label text.
 */
export async function fillByLabel(page: Page, label: string | RegExp, value: string) {
  const locator = page.getByLabel(label)
  await fillInput(locator, value)
}

/**
 * Fill an input found by its id.
 */
export async function fillById(page: Page, id: string, value: string) {
  const locator = page.locator(`#${id}`)
  await fillInput(locator, value)
}

/**
 * Fill an input found by placeholder.
 */
export async function fillByPlaceholder(page: Page, placeholder: string | RegExp, value: string) {
  const locator = page.getByPlaceholder(placeholder)
  await fillInput(locator, value)
}
