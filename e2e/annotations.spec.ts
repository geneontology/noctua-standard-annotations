import { expect, test } from '@playwright/test'
import { saeModelRaw, SAE_MODEL_ID } from '../tests/fixtures/saeModel'
import { mockBaristaMetadata, mockGolr, mockLoggedIn, mockM3Batch } from './mocks/barista'

const golrDoc = (id: string, label: string, closure: string[]) => ({
  annotation_class: id,
  annotation_class_label: label,
  isa_closure: [id, ...closure],
  isa_closure_label: [label, ...closure],
  subset: [],
  is_obsolete: false,
})

test.beforeEach(async ({ page }) => {
  await mockBaristaMetadata(page)
})

test('shows a model read-only when logged out', async ({ page }) => {
  await mockM3Batch(page, saeModelRaw)
  await page.goto(`/?model_id=${SAE_MODEL_ID}`)

  await expect(page.getByText('Not Logged In: You can only view existing annotations')).toBeVisible()
  await expect(page.getByText('Log in to Continue')).toBeVisible()
  await expect(page.getByTestId('annotation-row')).toHaveCount(9)
  await expect(page.getByTestId('model-title')).toContainText('enabled by ALPHA1 Hsap')
  await expect(page.getByRole('button', { name: 'Annotation actions' })).toHaveCount(0)
})

test('creates an "involved in" annotation from the form', async ({ page }) => {
  await mockLoggedIn(page)
  const writes = await mockM3Batch(page, saeModelRaw)
  await mockGolr(page, params => {
    const filters = params.getAll('fq').join(' ')
    if (filters.includes('ECO:0000352')) {
      return [golrDoc('ECO:0000315', 'mutant phenotype evidence used in manual assertion', ['ECO:0000352'])]
    }
    if (filters.includes('CHEBI:33695')) {
      return [golrDoc('UniProtKB:P12345', 'NEW1 Hsap', ['CHEBI:36080', 'CHEBI:33695'])]
    }
    return [golrDoc('GO:0006915', 'apoptotic process', ['GO:0008150'])]
  })

  await page.goto(`/?barista_token=test-barista-token&model_id=${SAE_MODEL_ID}`)
  await expect(page.getByRole('button', { name: 'Annotation actions' }).first()).toBeVisible()

  const form = page.getByRole('form', { name: 'Create annotation' })
  const field = (name: string) => form.getByRole('textbox', { name, exact: true })

  await field('Gene Product').fill('NEW1')
  await page.getByRole('option', { name: /NEW1 Hsap/ }).click()
  await field('GO Term').fill('apoptotic')
  await page.getByRole('option', { name: /apoptotic process/ }).click()
  await expect(page.getByRole('combobox', { name: 'GP to Term Relation' })).toHaveValue('involved in')

  await field('Evidence').fill('mutant')
  await page.getByRole('option', { name: /mutant phenotype evidence/ }).click()
  await field('Reference').fill('PMID:12345')

  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Annotation successfully created.')).toBeVisible()

  expect(writes).toHaveLength(1)
  const added = writes[0].operations.filter(op => op.entity === 'edge' && op.operation === 'add')
  expect(added.map(op => op.arguments.predicate)).toEqual(['RO:0002333', 'BFO:0000050'])
})

test('edits a reference inline', async ({ page }) => {
  await mockLoggedIn(page)
  const writes = await mockM3Batch(page, saeModelRaw)
  await page.goto(`/?barista_token=test-barista-token&model_id=${SAE_MODEL_ID}`)

  const row = page.getByTestId('annotation-row').filter({ hasText: 'EPSILON5 Hsap' })
  await row.getByTestId('cell-reference').hover()
  await row.getByRole('button', { name: 'Edit reference' }).click()
  const editor = page.getByTestId('annotation-editor')
  await editor.getByRole('textbox', { name: 'Reference', exact: true }).fill('PMID:424242')
  await editor.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('Reference successfully updated.')).toBeVisible()
  const values = writes[0].operations.flatMap(
    op => (op.arguments.values as { key: string; value: string }[] | undefined) ?? []
  )
  expect(values).toContainEqual({ key: 'source', value: 'PMID:424242' })
})
