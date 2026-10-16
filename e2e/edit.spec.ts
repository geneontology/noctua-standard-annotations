import { expect, test } from '@playwright/test'
import {
  editCell,
  expectToast,
  openModel,
  pickRelation,
  pickTerm,
  row,
  rowMenu,
  rows,
} from './helpers'

/**
 * Inline edits against a fake Minerva that behaves like the real one: a removed
 * fact takes its evidence with it, and naming a missing individual fails the batch.
 */

test('changes "located in" to "is active in" in place', async ({ page }) => {
  const minerva = await openModel(page)
  const target = row(page, 'LYN Hsap', 'located in')

  const editor = await editCell(page, target, 'cell-relation', 'Edit relation')
  await pickRelation(page, editor, 'GP To Term Relation', 'is active in')
  await editor.getByRole('button', { name: 'Save' }).click()

  await expectToast(page, 'Relation successfully updated.')
  await expect(row(page, 'LYN Hsap', 'nucleus', 'is active in')).toHaveCount(1)
  // Regression: the batch used to remove evidence Minerva had already deleted, so
  // it failed before its store.
  expect(minerva.batches.at(-1)?.error).toBeUndefined()
  expect(minerva.model['modified-p']).toBe(false)
  const [fact] = minerva.model.facts.filter(f => f.property === 'RO:0002432')
  expect(minerva.evidenceOf(fact)).toEqual([
    { code: 'ECO:0000314', sources: ['PMID:333'], with: [] },
  ])
})

test('changes "involved in" to "acts upstream of or within"', async ({ page }) => {
  const minerva = await openModel(page)
  const target = row(page, 'apoptotic process')

  const editor = await editCell(page, target, 'cell-relation', 'Edit relation')
  await pickRelation(page, editor, 'GP To Term Relation', 'acts upstream of or within')
  await editor.getByRole('button', { name: 'Save' }).click()

  await expect(row(page, 'apoptotic process').getByTestId('cell-relation')).toHaveText(
    'acts upstream of or within'
  )
  expect(minerva.factSummaries()).toContain('GO:0003674 RO:0002418 GO:0006915')
  expect(minerva.factSummaries()).not.toContain('GO:0003674 BFO:0000050 GO:0006915')
})

test('swaps the gene product and the GO term', async ({ page }) => {
  const minerva = await openModel(page)

  let editor = await editCell(
    page,
    row(page, 'protein tyrosine kinase activity'),
    'cell-gp',
    'Edit gene product'
  )
  await pickTerm(page, editor, 'Gene Product', 'HCK', 'UniProtKB:P08631')
  await editor.getByRole('button', { name: 'Save' }).click()
  await expect(row(page, 'HCK Hsap', 'protein tyrosine kinase activity')).toHaveCount(1)

  editor = await editCell(
    page,
    row(page, 'protein tyrosine kinase activity'),
    'cell-term',
    'Edit GO term'
  )
  await pickTerm(page, editor, 'GO Term', 'non-membrane', 'GO:0004715')
  await editor.getByRole('button', { name: 'Save' }).click()
  await expect(row(page, 'HCK Hsap', 'non-membrane spanning')).toHaveCount(1)

  expect(minerva.factSummaries()).toContain('GO:0004715 RO:0002333 UniProtKB:P08631')
})

test('edits the evidence code, reference and with/from of every fact', async ({ page }) => {
  const minerva = await openModel(page)
  const target = () => row(page, 'protein tyrosine kinase activity')

  let editor = await editCell(page, target(), 'cell-evidence', 'Edit evidence')
  await pickTerm(page, editor, 'Evidence', 'physical', 'ECO:0000353')
  await editor.getByRole('button', { name: 'Save' }).click()
  await expectToast(page, 'Evidence successfully updated.')

  editor = await editCell(page, target(), 'cell-reference', 'Edit reference')
  await editor.getByRole('textbox', { name: 'Reference', exact: true }).fill('PMID:2001| PMID:2002')
  await editor.getByRole('button', { name: 'Save' }).click()
  await expect(target().getByTestId('cell-reference')).toContainText('PMID:2002')

  editor = await editCell(page, target(), 'cell-with', 'Edit with/from')
  await editor.getByRole('textbox', { name: 'With/From', exact: true }).fill('uniprotkb:P06241')
  await editor.getByRole('button', { name: 'Save' }).click()
  await expect(target().getByTestId('cell-with')).toHaveText('UniProtKB:P06241')

  // Both facts of the annotation (enabled_by and the occurs_in extension).
  const facts = minerva.model.facts.filter(f => minerva.classOf(f.subject) === 'GO:0004713')
  expect(facts).toHaveLength(2)
  for (const fact of facts) {
    expect(minerva.evidenceOf(fact)).toEqual([
      { code: 'ECO:0000353', sources: ['PMID:2001', 'PMID:2002'], with: ['UniProtKB:P06241'] },
    ])
  }
})

test('the with/from picker refuses an accession without a database', async ({ page }) => {
  const minerva = await openModel(page)
  const editor = await editCell(page, row(page, 'cell migration'), 'cell-with', 'Edit with/from')
  await editor.getByRole('button', { name: 'Pick with/from' }).click()
  await page.getByPlaceholder('Accession').fill('P12345')
  await page.getByRole('button', { name: 'Ok' }).click()
  await expect(
    page.getByText('Please select a database for the accession value "P12345"')
  ).toBeVisible()
  expect(minerva.batches).toHaveLength(0)
})

test('adds and deletes an extension', async ({ page }) => {
  const minerva = await openModel(page)
  const target = () => row(page, 'apoptotic process')

  await rowMenu(page, target(), 'Add Extension')
  const editor = page.getByTestId('annotation-editor')
  await pickRelation(page, editor, 'New Extension Relation', 'occurs in')
  await pickTerm(page, editor, 'New Extension Term', 'cytoplasm', 'GO:0005737')
  await editor.getByRole('button', { name: 'Save' }).click()
  await expect(target().getByTestId('cell-extensions')).toContainText('cytoplasm')
  expect(minerva.factSummaries()).toContain('GO:0006915 BFO:0000066 GO:0005737')

  await target()
    .getByRole('button', { name: /^Delete extension occurs in cytoplasm/ })
    .click({ force: true })
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await expect(target().getByTestId('cell-extensions')).toHaveText('')
  expect(minerva.factSummaries()).not.toContain('GO:0006915 BFO:0000066 GO:0005737')
  expect(minerva.model.individuals.some(i => minerva.classOf(i.id) === 'GO:0005737')).toBe(false)
})

test('toggles NOT after confirming', async ({ page }) => {
  const minerva = await openModel(page)
  await rowMenu(page, row(page, 'cell migration'), /Add NOT Qualifier/)
  await page.getByRole('dialog').getByRole('button', { name: 'Update' }).click()
  await expect(row(page, 'cell migration').getByTestId('cell-relation')).toHaveText(
    /^NOTs*acts upstream of or within$/
  )
  expect(minerva.factSummaries()).toContain('GO:0003674 RO:0002418 NOT GO:0016477')
})

test('adds a comment to every fact, and edits it in the comments panel', async ({ page }) => {
  const minerva = await openModel(page)
  await rowMenu(page, row(page, 'apoptotic process'), 'Add Comment')
  const editor = page.getByTestId('annotation-editor')
  await editor.getByRole('textbox', { name: 'Comment' }).fill('needs review')
  await editor.getByRole('button', { name: 'Save' }).click()

  const target = row(page, 'apoptotic process')
  await target.getByRole('button', { name: 'Comments (1)' }).click()
  const panel = page.getByTestId('comments-panel')
  const box = panel.getByTestId('comments-box').filter({ hasText: 'apoptotic process' })
  await expect(box).toContainText('needs review')
  await expect(box).toHaveAttribute('data-selected', 'true')

  await box.getByRole('button', { name: 'Edit comments' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').first().fill('reviewed')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(box).toContainText('reviewed')

  const facts = minerva.model.facts
    .filter(f => minerva.classOf(f.subject) === 'GO:0003674')
    .filter(f => ['GO:0006915', 'UniProtKB:P07948'].includes(minerva.classOf(f.object) ?? ''))
  expect(facts.length).toBe(2)
  for (const fact of facts) {
    expect(fact.annotations.filter(a => a.key === 'comment')).toEqual([
      { key: 'comment', value: 'reviewed' },
    ])
  }
})

test('deletes an annotation and all its individuals', async ({ page }) => {
  const minerva = await openModel(page)
  const before = minerva.model.individuals.length
  await rowMenu(page, row(page, 'cell migration'), 'Delete Annotation')
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await expect(rows(page)).toHaveCount(3)
  await expect(row(page, 'cell migration')).toHaveCount(0)
  // MF, GP, BP and both evidence individuals are gone.
  expect(minerva.model.individuals.length).toBe(before - 5)
})

test('Add More Gene(s) copies an annotation onto other genes', async ({ page }) => {
  const minerva = await openModel(page)
  await rowMenu(page, row(page, 'apoptotic process'), 'Add More Gene(s)')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').fill('UniProtKB:P06241\nUniProtKB:P08631, UniProtKB:Q00000')
  await dialog.getByRole('button', { name: 'Load Genes' }).click()
  await expect(dialog.getByRole('tab', { name: 'Matched (2)' })).toBeVisible()
  await expect(dialog.getByRole('tab', { name: 'Not Found (1)' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expectToast(page, '2 Annotation(s) successfully created.')
  await expect(row(page, 'FYN Hsap', 'involved in', 'apoptotic process')).toHaveCount(1)
  await expect(row(page, 'HCK Hsap', 'involved in', 'apoptotic process')).toHaveCount(1)
  expect(minerva.factSummaries()).toContain('GO:0003674 RO:0002333 UniProtKB:P06241')
})

test('Escape closes the term suggestions before the inline editor', async ({ page }) => {
  await openModel(page)
  const editor = await editCell(page, row(page, 'apoptotic process'), 'cell-term', 'Edit GO term')
  await editor.getByRole('textbox', { name: 'GO Term' }).fill('cell')
  await expect(page.getByRole('option').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('option')).toHaveCount(0)
  await expect(editor).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(editor).toBeHidden()
})

test('shows the Minerva error when a write fails, and keeps the table', async ({ page }) => {
  const minerva = await openModel(page)
  minerva.failNext = 'InsufficientPermissionsException: not allowed'
  await rowMenu(page, row(page, 'cell migration'), 'Delete Annotation')
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await expectToast(page, /do not have permission/)
  await expect(rows(page)).toHaveCount(4)
})
