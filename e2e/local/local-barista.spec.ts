import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

/**
 * Real writes against a local Barista/Minerva and the real GOlr. Opt-in: it
 * creates a scratch model, edits it through the UI and reads Minerva back.
 *
 *   LOCAL=1 LOCAL_BARISTA_TOKEN=<token> npx playwright test e2e/local
 *
 * LOCAL_BARISTA (default http://localhost:3400) and LOCAL_MINERVA (default
 * minerva_local) point it elsewhere. Each run makes a new model; nothing else is
 * touched.
 */
const BARISTA = process.env.LOCAL_BARISTA ?? 'http://localhost:3400'
const MINERVA = process.env.LOCAL_MINERVA ?? 'minerva_local'
const TOKEN = process.env.LOCAL_BARISTA_TOKEN ?? ''

test.skip(
  !process.env.LOCAL || !TOKEN,
  'set LOCAL=1 and LOCAL_BARISTA_TOKEN to write to a local Barista'
)
test.describe.configure({ mode: 'serial', timeout: 120_000 })

interface RawType {
  type: string
  id?: string
  filler?: { id: string }
}

interface RawModel {
  id: string
  'modified-p': boolean
  individuals: { id: string; type: RawType[] }[]
  facts: { subject: string; property: string; object: string }[]
  annotations: { key: string; value: string }[]
}

const m3Batch = async (
  request: APIRequestContext,
  requests: unknown[],
  intention = 'action'
): Promise<RawModel> => {
  const response = await request.post(`${BARISTA}/api/${MINERVA}/m3BatchPrivileged`, {
    form: { token: TOKEN, intention, requests: JSON.stringify(requests) },
  })
  const body = await response.json()
  expect(body['message-type'], body.message).toBe('success')
  return body.data
}

const getModel = (request: APIRequestContext, modelId: string) =>
  m3Batch(
    request,
    [{ entity: 'model', operation: 'get', arguments: { 'model-id': modelId } }],
    'query'
  )

const classOf = (model: RawModel, id: string) => {
  const type = model.individuals.find(i => i.id === id)?.type.at(-1)
  return type?.type === 'complement' ? `NOT ${type.filler?.id}` : type?.id
}

const facts = (model: RawModel) =>
  model.facts
    .map(f => `${classOf(model, f.subject)} ${f.property} ${classOf(model, f.object)}`)
    .sort()

let modelId = ''

const open = async (page: Page) => {
  await page.addInitScript(
    ([barista, minerva]) => {
      const w = window as unknown as Record<string, string>
      w.global_barista_location = barista
      w.global_minerva_definition_name = minerva
      w.global_golr_neo_server = 'http://noctua-golr.berkeleybop.org/'
    },
    [BARISTA, MINERVA]
  )
  await page.goto(`/?model_id=${modelId}&barista_token=${TOKEN}`)
  await expect(page.getByTestId('annotations-table')).toBeVisible({ timeout: 30_000 })
}

/** Search the real GOlr by id (labels rank unpredictably) and pick the exact class. */
const pick = async (page: Page, label: string, id: string) => {
  const form = page.getByRole('form', { name: 'Create annotation' })
  await form.getByRole('textbox', { name: label, exact: true }).fill(id)
  await page
    .getByRole('option')
    .filter({ hasText: new RegExp(`${id}(?![-\\d])`) })
    .first()
    .click({ timeout: 30_000 })
}

test.beforeAll(async ({ request }) => {
  const created = await m3Batch(request, [{ entity: 'model', operation: 'add', arguments: {} }])
  modelId = created.id
})

test('creates a "located in" annotation that Minerva stores', async ({ page, request }) => {
  await open(page)
  const form = page.getByRole('form', { name: 'Create annotation' })
  await pick(page, 'Gene Product', 'UniProtKB:P07948')
  await pick(page, 'GO Term', 'GO:0005634')
  await form.getByRole('combobox', { name: 'GP to Term Relation' }).click()
  await page
    .getByRole('option')
    .filter({ hasText: /^located in\s*RO:/ })
    .click()
  await pick(page, 'Evidence', 'ECO:0000314')
  await form.getByRole('textbox', { name: 'Reference', exact: true }).fill('PMID:11606584')
  await form.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(page.getByTestId('annotation-row').filter({ hasText: 'located in' })).toHaveCount(
    1,
    { timeout: 30_000 }
  )
  const model = await getModel(request, modelId)
  expect(facts(model)).toEqual(['UniProtKB:P07948 RO:0001025 GO:0005634'])
  expect(model['modified-p']).toBe(false)
  expect(model.annotations).toContainEqual(
    expect.objectContaining({ key: 'title', value: 'enabled by LYN Hsap' })
  )
})

test('changes the relation in place and stores it', async ({ page, request }) => {
  await open(page)
  const cell = page.getByTestId('annotation-row').first().getByTestId('cell-relation')
  await cell.hover()
  await cell.getByRole('button', { name: 'Edit relation' }).click()
  const editor = page.getByTestId('annotation-editor')
  await editor.getByRole('combobox').click()
  await page
    .getByRole('option')
    .filter({ hasText: /^is active in\s*RO:/ })
    .click()
  await editor.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('Relation successfully updated.')).toBeVisible({ timeout: 30_000 })
  const model = await getModel(request, modelId)
  expect(facts(model)).toEqual(['UniProtKB:P07948 RO:0002432 GO:0005634'])
  expect(model['modified-p']).toBe(false)
  // The evidence was copied onto the new fact; the old copy went with the old fact.
  expect(model.individuals.filter(i => classOf(model, i.id) === 'ECO:0000314')).toHaveLength(1)
})

const deleteRow = async (page: Page, text: string) => {
  await page
    .getByTestId('annotation-row')
    .filter({ hasText: text })
    .getByRole('button', { name: 'Annotation actions' })
    .click()
  await page.getByRole('menuitem', { name: 'Delete Annotation' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
}

test("refuses to delete the model's last annotation, which Minerva couldn't save", async ({
  page,
  request,
}) => {
  await open(page)
  await deleteRow(page, 'LYN Hsap')
  await expect(page.getByText(/Minerva can't save an empty model/)).toBeVisible()
  await expect(page.getByTestId('annotation-row')).toHaveCount(1)
  const model = await getModel(request, modelId)
  expect(facts(model)).toEqual(['UniProtKB:P07948 RO:0002432 GO:0005634'])
  expect(model['modified-p']).toBe(false)
})

test('copies the annotation to another gene, then deletes the original', async ({
  page,
  request,
}) => {
  await open(page)
  await page.getByRole('button', { name: 'Annotation actions' }).first().click()
  await page.getByRole('menuitem', { name: 'Add More Gene(s)' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').fill('UniProtKB:P12931')
  await dialog.getByRole('button', { name: 'Load Genes' }).click()
  await expect(dialog.getByRole('tab', { name: 'Matched (1)' })).toBeVisible({ timeout: 30_000 })
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('annotation-row')).toHaveCount(2, { timeout: 30_000 })

  await deleteRow(page, 'LYN Hsap')
  await expect(page.getByTestId('annotation-row')).toHaveCount(1, { timeout: 30_000 })
  const model = await getModel(request, modelId)
  expect(facts(model)).toEqual(['UniProtKB:P12931 RO:0002432 GO:0005634'])
  expect(model['modified-p']).toBe(false)
})

test('tells the other tab about an edit through the Barista socket, not the tab that made it', async ({
  page,
  browser,
  request,
}) => {
  const MODEL_UPDATED = 'This model has been modified'
  // A second window: its own context, so its own socket connection.
  const otherWindow = await browser.newContext({ baseURL: test.info().project.use.baseURL })
  const other = await otherWindow.newPage()
  await open(page)
  await open(other)

  await page.getByRole('button', { name: 'Annotation actions' }).first().click()
  await page.getByRole('menuitem', { name: 'Add Comment' }).click()
  const editor = page.getByTestId('annotation-editor')
  await editor.getByRole('textbox', { name: 'Comment' }).fill('from the first tab')
  await editor.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Comment successfully added.')).toBeVisible({ timeout: 30_000 })

  await expect(other.getByText(MODEL_UPDATED)).toBeVisible({ timeout: 10_000 })
  // Barista relays the write to the writer too; SAE knows its own packet.
  await page.waitForTimeout(1_500)
  await expect(page.getByText(MODEL_UPDATED)).toHaveCount(0)

  await other.getByRole('button', { name: 'Refresh' }).click()
  await expect(other.getByText(MODEL_UPDATED)).toHaveCount(0)
  await expect(other.getByRole('button', { name: 'Comments (1)' })).toBeVisible()

  // Another client's write (here the API) reaches both tabs.
  await m3Batch(request, [
    {
      entity: 'model',
      operation: 'add-annotation',
      arguments: { 'model-id': modelId, values: [{ key: 'comment', value: 'from another tool' }] },
    },
    { entity: 'model', operation: 'store', arguments: { 'model-id': modelId } },
  ])
  await expect(page.getByText(MODEL_UPDATED)).toBeVisible({ timeout: 10_000 })
  await expect(other.getByText(MODEL_UPDATED)).toBeVisible({ timeout: 10_000 })
  await otherWindow.close()
})
