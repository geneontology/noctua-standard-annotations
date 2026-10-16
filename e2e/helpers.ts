import { expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { mockBaristaMetadata, mockLoggedIn } from './mocks/barista'
import { FakeMinerva, routeGolr, routeMinerva, routePubmed } from './mocks/minerva'
import type { RawModel } from './mocks/minerva'
import { CATALOG, CURATOR_ORCID, MODEL_ID, RELATION_LABELS, seededModel } from './fixtures/world'

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Open SAE on a fake Minerva model, with GOlr and PubMed answered from the catalog. */
export const openModel = async (
  page: Page,
  options: { model?: RawModel; loggedIn?: boolean } = {}
): Promise<FakeMinerva> => {
  const { model = seededModel(), loggedIn = true } = options
  const minerva = new FakeMinerva(model, CATALOG, CURATOR_ORCID, RELATION_LABELS)
  await mockBaristaMetadata(page)
  if (loggedIn) await mockLoggedIn(page)
  await routeMinerva(page, minerva)
  await routeGolr(page, CATALOG)
  await routePubmed(page)
  await page.goto(`/?${loggedIn ? 'barista_token=test-barista-token&' : ''}model_id=${MODEL_ID}`)
  // A cold Vite server transforms the app on the first load.
  await expect(page.getByTestId('annotations-table')).toBeVisible({ timeout: 20_000 })
  return minerva
}

export const rows = (page: Page) => page.getByTestId('annotation-row')

/** The row whose text matches every part (e.g. GP and GO term). */
export const row = (page: Page, ...parts: string[]): Locator =>
  parts.reduce((locator, part) => locator.filter({ hasText: part }), rows(page))

export const createForm = (page: Page) => page.getByRole('form', { name: 'Create annotation' })

/** Type into a term autocomplete and pick the option whose text matches. */
export const pickTerm = async (
  page: Page,
  scope: Locator,
  label: string,
  query: string,
  option: string | RegExp
) => {
  await scope.getByRole('textbox', { name: label, exact: true }).fill(query)
  await page.getByRole('option').filter({ hasText: option }).first().click()
}

/** Pick a relation from a relation select (options read "label RO:…"). */
export const pickRelation = async (page: Page, scope: Locator, label: string, relation: string) => {
  await scope.getByRole('combobox', { name: label }).click()
  await page
    .getByRole('option')
    .filter({ hasText: new RegExp(`^${escape(relation)}\\s*[A-Z]+:`) })
    .first()
    .click()
}

/** Hover a row's cell and click its edit pencil; returns the inline editor. */
export const editCell = async (page: Page, target: Locator, testId: string, label: string) => {
  const cell = target.getByTestId(testId)
  await cell.hover()
  await cell.getByRole('button', { name: label }).click()
  return page.getByTestId('annotation-editor')
}

/** Open a row's ⋮ menu and choose an item. */
export const rowMenu = async (page: Page, target: Locator, item: string | RegExp) => {
  await target.getByRole('button', { name: 'Annotation actions' }).click()
  await page.getByRole('menuitem', { name: item }).click()
}

export const expectToast = (page: Page, message: string | RegExp) =>
  expect(page.getByText(message).first()).toBeVisible()
