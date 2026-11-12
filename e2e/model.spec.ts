import { expect, test } from '@playwright/test'
import { seededModel } from './fixtures/world'
import { openModel, rows } from './helpers'

/** Model-level features: details, the Not Saved bar, sorting and the toolbar links. */

const modelValues =
  (minerva: { model: { annotations: { key: string; value: string }[] } }) => (key: string) =>
    minerva.model.annotations.filter(a => a.key === key).map(a => a.value)

// #94: each toolbar control opens its own form, as in the VPE.
test('edits the model title in Edit Title', async ({ page }) => {
  const minerva = await openModel(page)
  await page.getByTestId('edit-model-title').click()
  const dialog = page.getByRole('dialog').filter({ hasText: 'Edit Title' })
  await expect(dialog.getByRole('combobox', { name: 'State' })).toHaveCount(0)

  await dialog.getByLabel('Title').fill('LYN kinase annotations')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByTestId('model-title')).toContainText('LYN kinase annotations')
  const values = modelValues(minerva)
  expect(values('title')).toEqual(['LYN kinase annotations'])
  expect(values('state')).toEqual(['development'])
})

test('changes the model state in Change State', async ({ page }) => {
  const minerva = await openModel(page)
  await page.getByRole('button', { name: /development/i }).click()
  const dialog = page.getByRole('dialog').filter({ hasText: 'Change State' })
  await expect(dialog.getByLabel('Title')).toHaveCount(0)

  await dialog.getByRole('combobox', { name: 'State' }).click()
  await page.getByRole('option', { name: 'Production' }).click()
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('button', { name: /production/i })).toBeVisible()
  const values = modelValues(minerva)
  expect(values('state')).toEqual(['production'])
  expect(values('title')).toEqual(['e2e model'])
})

test('adds a model comment in Model Comments', async ({ page }) => {
  const minerva = await openModel(page)
  await page.getByRole('button', { name: 'Model comments' }).click()
  const dialog = page.getByRole('dialog').filter({ hasText: 'Model Comments' })

  await dialog.getByRole('button', { name: /Add (Another )?Comment/ }).click()
  await dialog.getByRole('textbox', { name: 'Comment' }).last().fill('model note')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('button', { name: 'Model comments' })).toContainText('1')
  expect(modelValues(minerva)('comment')).toEqual(['model note'])
})

test('shows the group and summary in Model Details', async ({ page }) => {
  await openModel(page)
  await page.getByRole('button', { name: /2025-01-10/ }).click()
  const dialog = page.getByRole('dialog').filter({ hasText: 'Model Details' })
  await expect(dialog.getByRole('combobox', { name: 'Group' })).toBeVisible()
  await expect(dialog.getByTestId('model-summary')).toContainText('Open In:')
})

test("warns before editing another group's model", async ({ page }) => {
  const model = seededModel()
  model.annotations = model.annotations.map(a =>
    a.key === 'providedBy' ? { ...a, value: 'http://other.example.org' } : a
  )
  await openModel(page, { model })
  await page.getByTestId('edit-model-title').click()

  const warning = page.getByRole('dialog').filter({ hasText: "Editing another group's model" })
  await expect(warning).toBeVisible()
  await warning.getByRole('button', { name: 'Continue and edit anyway' }).click()
  await expect(page.getByRole('dialog').filter({ hasText: 'Edit Title' })).toBeVisible()
})

test('resets a model with unsaved changes', async ({ page }) => {
  const minerva = await openModel(page, { model: { ...seededModel(), 'modified-p': true } })
  // The unsaved change: an extra row Minerva has not stored.
  const stored = JSON.parse(JSON.stringify(minerva.model))
  minerva.model.facts = minerva.model.facts.slice(0, -2)
  await page.reload()
  await expect(rows(page)).toHaveCount(3)

  await page.getByRole('button', { name: 'Reset' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'OK' }).click()
  await expect(rows(page)).toHaveCount(4)
  expect(minerva.model.facts).toEqual(stored.facts)
  await expect(page.getByText('Not Saved')).toHaveCount(0)
})

test('saves a model with unsaved changes', async ({ page }) => {
  const minerva = await openModel(page, { model: { ...seededModel(), 'modified-p': true } })
  // The Not Saved bar's Save (above the form's).
  await page.getByRole('button', { name: 'Save', exact: true }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('Not Saved')).toHaveCount(0)
  expect(minerva.model['modified-p']).toBe(false)
  expect(minerva.batches.at(-1)?.intention).toBe('query')
})

test('sorts by a column and remembers it after a reload', async ({ page }) => {
  await openModel(page)
  const terms = () => rows(page).getByTestId('cell-term').allTextContents()

  const header = page.getByRole('columnheader', { name: 'Term' })
  await header.getByRole('button').click()
  await expect(header).toHaveAttribute('aria-sort', 'ascending')
  const ascending = await terms()
  expect(ascending.map(t => t.replace(/GO:\d+$/, ''))).toEqual(
    [...ascending.map(t => t.replace(/GO:\d+$/, ''))].sort((a, b) => a.localeCompare(b))
  )
  await page.reload()
  await expect(rows(page)).toHaveCount(4)
  expect(await terms()).toEqual(ascending)
})

test('links the model to the other Noctua tools', async ({ page }) => {
  await openModel(page)
  await page.getByRole('button', { name: 'VIEW', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Pathway Viewer' })).toHaveCount(0)
  const link = page.getByRole('link', { name: 'Annotation Preview' })
  await expect(link).toHaveAttribute('href', /annpreview\?model_id=gomodel%3Ae2e000000001/)
  await expect(link).toHaveAttribute('target', '_blank')
})

test('picks up a login from another tab when the tab regains focus', async ({ page }) => {
  await openModel(page, { loggedIn: false })
  await expect(
    page.getByText('Not Logged In: You can only view existing annotations')
  ).toBeVisible()
  await page.route('**/user_info_by_token/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'other-tab-token',
        uri: 'https://orcid.org/0000-0000-0000-0099',
        nickname: 'Test Curator',
        groups: [{ id: 'http://geneontology.org', label: 'GO Central' }],
      }),
    })
  )
  await page.evaluate(() => {
    localStorage.setItem('barista_token', 'other-tab-token')
    window.dispatchEvent(new Event('focus'))
  })
  await expect(page.getByText('Not Logged In: You can only view existing annotations')).toHaveCount(
    0
  )
  await expect(page.getByRole('button', { name: 'Annotation actions' }).first()).toBeVisible()
})
