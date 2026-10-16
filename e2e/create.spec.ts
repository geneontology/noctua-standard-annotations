import { expect, test } from '@playwright/test'
import { emptyModel } from './fixtures/world'
import { createForm, expectToast, openModel, pickRelation, pickTerm, row, rows } from './helpers'

/**
 * The create form against a fake Minerva: what the curator fills in, what lands
 * in the model, and the row that appears.
 */

test('creates an "enables" annotation with with/from, an extension and a comment', async ({
  page,
}) => {
  const minerva = await openModel(page, { model: emptyModel() })
  const form = createForm(page)

  await pickTerm(page, form, 'Gene Product', 'HCK', 'UniProtKB:P08631')
  await pickTerm(page, form, 'GO Term', 'protein tyrosine', 'GO:0004713')
  await expect(form.getByRole('combobox', { name: 'GP to Term Relation' })).toHaveValue('enables')
  await pickTerm(page, form, 'Evidence', 'direct assay', 'ECO:0000314')
  await form.getByRole('textbox', { name: 'Reference', exact: true }).fill('PMID:1001')
  await form.getByRole('textbox', { name: 'With/From', exact: true }).fill('UniProtKB:P12931')

  await form.getByRole('button', { name: 'Add Extension' }).click()
  await pickRelation(page, form, 'Extension Relation', 'occurs in')
  await pickTerm(page, form, 'Extension Term', 'cytoplasm', 'GO:0005737')

  await form.getByRole('button', { name: 'Add Comment' }).click()
  await form.getByRole('textbox', { name: 'Comment' }).fill('created in e2e')

  await form.getByRole('button', { name: 'Save', exact: true }).click()
  await expectToast(page, 'Annotation successfully created.')

  // The row the table reads back from the model.
  const created = row(page, 'HCK Hsap')
  await expect(created).toHaveCount(1)
  await expect(created.getByTestId('cell-relation')).toHaveText('enables')
  await expect(created.getByTestId('cell-term')).toContainText('protein tyrosine kinase activity')
  await expect(created.getByTestId('cell-reference')).toHaveText('PMID:1001')
  await expect(created.getByTestId('cell-with')).toHaveText('UniProtKB:P12931')
  await expect(created.getByTestId('cell-extensions')).toContainText('occurs in')
  await expect(created.getByTestId('cell-extensions')).toContainText('cytoplasm')
  await expect(created.getByRole('button', { name: 'Comments (1)' })).toBeVisible()

  // What Minerva stored: MF enabled_by GP and the extension, both with evidence and the comment.
  expect(minerva.factSummaries().sort()).toEqual([
    'GO:0004713 BFO:0000066 GO:0005737',
    'GO:0004713 RO:0002333 UniProtKB:P08631',
  ])
  for (const fact of minerva.model.facts) {
    expect(minerva.evidenceOf(fact)).toEqual([
      { code: 'ECO:0000314', sources: ['PMID:1001'], with: ['UniProtKB:P12931'] },
    ])
    expect(fact.annotations).toContainEqual({ key: 'comment', value: 'created in e2e' })
  }
  // An untitled model is named after its first gene product, and the edit is stored.
  expect(minerva.model.annotations).toContainEqual({ key: 'title', value: 'enabled by HCK Hsap' })
  expect(minerva.model['modified-p']).toBe(false)
  await expect(page.getByTestId('model-title')).toContainText('enabled by HCK Hsap')

  // The form is cleared for the next annotation.
  await expect(form.getByRole('textbox', { name: 'Gene Product', exact: true })).toHaveValue('')
})

test('derives "involved in" for a BP and stores it through a root MF', async ({ page }) => {
  const minerva = await openModel(page)
  const form = createForm(page)

  await pickTerm(page, form, 'Gene Product', 'FYN', 'UniProtKB:P06241')
  await pickTerm(page, form, 'GO Term', 'signal trans', 'GO:0007165')
  await expect(form.getByRole('combobox', { name: 'GP to Term Relation' })).toHaveValue(
    'involved in'
  )
  await pickTerm(page, form, 'Evidence', 'mutant', 'ECO:0000315')
  await form.getByRole('textbox', { name: 'Reference', exact: true }).fill('PMID:1002')
  await form.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(row(page, 'FYN Hsap').getByTestId('cell-relation')).toHaveText('involved in')
  expect(minerva.factSummaries()).toEqual(
    expect.arrayContaining([
      'GO:0003674 RO:0002333 UniProtKB:P06241',
      'GO:0003674 BFO:0000050 GO:0007165',
    ])
  )
})

test('chooses "located in" and NOT for a CC annotation', async ({ page }) => {
  const minerva = await openModel(page)
  const form = createForm(page)

  await pickTerm(page, form, 'Gene Product', 'FYN', 'UniProtKB:P06241')
  await form.getByRole('checkbox', { name: 'NOT' }).check()
  await pickTerm(page, form, 'GO Term', 'cytoplasm', 'GO:0005737')
  await pickRelation(page, form, 'GP to Term Relation', 'located in')
  await pickTerm(page, form, 'Evidence', 'direct assay', 'ECO:0000314')
  await form.getByRole('textbox', { name: 'Reference', exact: true }).fill('PMID:1003')
  await form.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(row(page, 'FYN Hsap').getByTestId('cell-relation')).toHaveText(/^NOTs*located in$/)
  expect(minerva.factSummaries()).toContain('UniProtKB:P06241 RO:0001025 NOT GO:0005737')
})

test('"Add MF Root" fills the root term and ND evidence', async ({ page }) => {
  const minerva = await openModel(page)
  const form = createForm(page)

  await pickTerm(page, form, 'Gene Product', 'FYN', 'UniProtKB:P06241')
  await form.getByRole('button', { name: 'Term options' }).click()
  await page.getByRole('menuitem', { name: 'Add MF Root' }).click()
  // Angular's ND label and code.
  await expect(form.getByRole('textbox', { name: 'Evidence', exact: true })).toHaveValue(
    'no biological data found used in manual assertion (ECO:0000307)'
  )
  await expect(form.getByRole('textbox', { name: 'Reference', exact: true })).toHaveValue(
    'GO_REF:0000015'
  )
  await form.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(row(page, 'FYN Hsap').getByTestId('cell-term')).toContainText('molecular_function')
  const [fact] = minerva.model.facts.filter(f => minerva.classOf(f.object) === 'UniProtKB:P06241')
  expect(minerva.evidenceOf(fact)).toEqual([
    { code: 'ECO:0000307', sources: ['GO_REF:0000015'], with: [] },
  ])
})

test('"Add ISS Evidence" fills ISS and its GO_REF', async ({ page }) => {
  await openModel(page)
  const form = createForm(page)
  await form.getByRole('button', { name: 'Evidence options' }).click()
  await page.getByRole('menuitem', { name: 'Add ISS Evidence' }).click()
  await expect(form.getByRole('textbox', { name: 'Evidence', exact: true })).toHaveValue(
    /sequence similarity evidence/
  )
  await expect(form.getByRole('textbox', { name: 'Reference', exact: true })).toHaveValue(
    'GO_REF:0000024'
  )
})

test('explains why Save is disabled', async ({ page }) => {
  const minerva = await openModel(page)
  const form = createForm(page)

  await pickTerm(page, form, 'Gene Product', 'FYN', 'UniProtKB:P06241')
  await form.getByRole('textbox', { name: 'Reference', exact: true }).fill('not a reference')
  await expect(form.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()

  await form.getByRole('button', { name: 'Why is the "Save" button disabled?' }).click()
  const dialog = page.getByRole('dialog').filter({ hasText: 'Errors' })
  await expect(dialog).toContainText('GO Term is required')
  await expect(dialog).toContainText('Evidence is required @ 1')
  await expect(dialog).toContainText('Use DB:accession format for reference @ 1')
  await dialog.getByRole('button', { name: 'Close' }).last().click()
  expect(minerva.batches).toHaveLength(0)
})

test('Clear empties the form, text typed but never picked included', async ({ page }) => {
  await openModel(page)
  const form = createForm(page)
  await form.getByRole('textbox', { name: 'Gene Product', exact: true }).fill('half typed')
  await form.getByRole('textbox', { name: 'Reference', exact: true }).fill('PMID:1')
  await form.getByRole('button', { name: 'Clear' }).click()
  await expect(form.getByRole('textbox', { name: 'Gene Product', exact: true })).toHaveValue('')
  await expect(form.getByRole('textbox', { name: 'Reference', exact: true })).toHaveValue('')
})

test('picks a reference through the reference picker, with the PubMed preview', async ({
  page,
}) => {
  await openModel(page)
  const form = createForm(page)
  const field = form.getByRole('textbox', { name: 'Reference', exact: true })
  await form.getByRole('button', { name: 'Pick a reference' }).click()

  const accession = page.getByPlaceholder('Accession')
  await accession.fill('424242')
  await expect(page.getByRole('link', { name: 'Paper 424242' })).toBeVisible()
  await accession.press('Enter')
  await expect(field).toHaveValue('PMID:424242')
})

test('shows the model read-only when logged out', async ({ page }) => {
  await openModel(page, { loggedIn: false })
  await expect(
    page.getByText('Not Logged In: You can only view existing annotations')
  ).toBeVisible()
  await expect(page.getByText('Log in to Continue')).toBeVisible()
  await expect(rows(page)).toHaveCount(4)
  await expect(page.getByRole('button', { name: 'Annotation actions' })).toHaveCount(0)
})
