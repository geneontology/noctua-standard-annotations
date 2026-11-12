import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/test-utils'
import { mockBarista, batchSuccess } from '@tests/fixtures/barista'
import { stateWith } from '@tests/fixtures/state'
import { rawEvidence, rawFact, rawIndividual, saeModelRaw, saeUid } from '@tests/fixtures/saeModel'
import { transformGraphData } from '@/features/gocam/services/graphServices'
import AnnotationsTable from '@/features/annotations/components/AnnotationsTable'
import { selectSortedAnnotations } from '@/features/annotations/slices/annotationsSlice'
import { selectSelectedCommentAnnotationId } from '@/features/annotations/slices/annotationsSlice'
import { selectRightDrawerOpen } from '@/@noctua.core/components/drawer/drawerSlice'
import { makeStore } from '@/app/store/store'
import type { AppStore } from '@/app/store/store'
import type { GraphModel } from '@/features/gocam/models/cam'
import { MAX_BULK_DELETE } from '@/features/annotations/data/selectionLimits'

vi.mock('@/features/search/components/Autocomplete', () => import('@tests/mocks/autocompleteMock'))

const renderTable = (options: { loggedIn?: boolean; model?: GraphModel } = {}) => {
  const store: AppStore = makeStore(
    stateWith({ loggedIn: options.loggedIn ?? true, model: options.model })
  )
  const view = renderWithProviders(<TableFromStore store={store} />, { store })
  return { ...view, store }
}

// Renders the table with the store's sorted annotations, like the page does.
const TableFromStore = ({ store }: { store: AppStore }) => (
  <AnnotationsTable annotations={selectSortedAnnotations(store.getState())} />
)

const rowFor = (gpLabel: string) =>
  screen.getAllByTestId('annotation-row').find(row => within(row).queryByText(gpLabel))!

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('AnnotationsTable', () => {
  it('lists every annotation with its count', () => {
    renderTable()
    expect(screen.getByText('( 9 )')).toBeInTheDocument()
    expect(screen.getAllByTestId('annotation-row')).toHaveLength(9)
  })

  it('shows relation (with NOT), term, evidence, reference, with, extensions and date', () => {
    renderTable()
    const row = rowFor('ALPHA1 Hsap')
    expect(within(row).getByTestId('cell-relation')).toHaveTextContent('NOTenables')
    expect(within(row).getByTestId('cell-term')).toHaveTextContent('protein kinase activity')
    expect(within(row).getByText('GO:0004672').closest('a')).toHaveAttribute(
      'href',
      'http://amigo.geneontology.org/amigo/term/GO:0004672'
    )
    expect(within(row).getByTestId('cell-evidence')).toHaveTextContent(
      'direct assay evidence used in manual assertion'
    )
    expect(within(row).getByTestId('cell-reference')).toHaveTextContent('PMID:111')
    expect(within(row).getByTestId('cell-with')).toHaveTextContent('UniProtKB:Q00001')
    expect(within(row).getByTestId('cell-extensions')).toHaveTextContent('has input')
    expect(within(row).getByTestId('cell-extensions')).toHaveTextContent('SUBSTRATE1 Hsap')
    expect(within(row).getByTestId('cell-date')).toHaveTextContent('Jan 10, 2024')
  })

  it('shows each contributor as a link to their ORCID', () => {
    renderTable()
    const cell = within(rowFor('ALPHA1 Hsap')).getByTestId('cell-contributor')
    // No Barista name in the fixture: the bare ORCID id stands in.
    const link = within(cell).getByRole('link', { name: '0000-0000-0000-0001' })
    expect(link).toHaveAttribute('href', 'https://orcid.org/0000-0000-0000-0001')
    expect(screen.getByRole('columnheader', { name: /Contributor/ })).toBeInTheDocument()
  })

  it('links each reference of a multi-reference evidence', () => {
    renderTable()
    const cell = within(rowFor('DELTA4 Hsap')).getByTestId('cell-reference')
    expect(within(cell).getByText('PMID:555').closest('a')).toHaveAttribute(
      'href',
      'https://www.ncbi.nlm.nih.gov/pubmed/555'
    )
    expect(within(cell).getByText('PMID:444').closest('a')).toHaveAttribute(
      'href',
      'https://www.ncbi.nlm.nih.gov/pubmed/444'
    )
  })

  it('is read-only when not logged in', () => {
    renderTable({ loggedIn: false })
    expect(screen.queryByRole('button', { name: 'Annotation actions' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit gene product' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Delete extension/ })).not.toBeInTheDocument()
  })

  it('offers edit buttons and the row menu when logged in', () => {
    renderTable()
    expect(screen.getAllByRole('button', { name: 'Annotation actions' })).toHaveLength(9)
    expect(
      within(rowFor('ALPHA1 Hsap')).getByRole('button', { name: 'Edit GO term' })
    ).toBeInTheDocument()
  })

  it('sorts by a column header: ascending, descending, then back to default', async () => {
    const { user, store } = renderTable()
    const header = screen.getByRole('button', { name: /Date Modified/ })
    await user.click(header)
    expect(store.getState().annotations.sort).toEqual({ field: 'date', ascending: true })
    await user.click(header)
    expect(store.getState().annotations.sort).toEqual({ field: 'date', ascending: false })
    await user.click(header)
    expect(store.getState().annotations.sort).toEqual({ field: 'gp', ascending: true })
  })

  it('opens the comments panel on the annotation', async () => {
    const { user, store } = renderTable()
    await user.click(within(rowFor('THETA9 Hsap')).getByRole('button', { name: 'Comments (2)' }))
    expect(selectRightDrawerOpen(store.getState())).toBe(true)
    expect(selectSelectedCommentAnnotationId(store.getState())).toBe(
      `${saeUid('mf9')}|RO:0002333|${saeUid('gp9')}`
    )
  })

  it('shows an empty state', () => {
    renderWithProviders(<AnnotationsTable annotations={[]} />)
    expect(screen.getByText('No annotations available to display')).toBeInTheDocument()
  })
})

describe('AnnotationRow actions', () => {
  it('deletes an annotation after confirming', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const { user } = renderTable()

    await user.click(
      within(rowFor('BETA2 Hsap')).getByRole('button', { name: 'Annotation actions' })
    )
    await user.click(await screen.findByRole('menuitem', { name: /Delete Annotation/ }))
    expect(await screen.findByText('You are about to delete an annotation.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(requests).toHaveLength(1))
    const ops = requests[0].operations
    expect(ops[0]).toMatchObject({
      entity: 'edge',
      operation: 'remove',
      arguments: { subject: saeUid('mf2'), predicate: 'RO:0002333', object: saeUid('gp2') },
    })
    expect(ops.filter(op => op.operation === 'remove' && op.entity === 'individual')).toHaveLength(
      4
    )
    expect(ops.at(-1)?.operation).toBe('store')
  })

  it('toggles the NOT qualifier after confirming', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const { user } = renderTable()

    await user.click(
      within(rowFor('ALPHA1 Hsap')).getByRole('button', { name: 'Annotation actions' })
    )
    await user.click(await screen.findByRole('menuitem', { name: /Remove NOT Qualifier/ }))
    await user.click(await screen.findByRole('button', { name: 'Update' }))

    await waitFor(() => expect(requests).toHaveLength(1))
    expect(requests[0].operations[1]).toMatchObject({
      operation: 'add-type',
      arguments: { individual: saeUid('mf1'), expressions: [{ type: 'class', id: 'GO:0004672' }] },
    })
  })

  it('deletes an extension after confirming', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const { user } = renderTable()

    await user.click(
      within(rowFor('ALPHA1 Hsap')).getByRole('button', {
        name: 'Delete extension has input SUBSTRATE1 Hsap',
      })
    )
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(requests).toHaveLength(1))
    expect(requests[0].operations.map(op => `${op.entity}:${op.operation}`)).toEqual([
      'edge:remove',
      'individual:remove',
      'model:store',
    ])
  })

  it('shows the Minerva error when a write fails', async () => {
    mockBarista(() => ({
      'message-type': 'error',
      message: 'org.geneontology.minerva...InsufficientPermissionsException',
    }))
    const { user, store } = renderTable()
    await user.click(
      within(rowFor('BETA2 Hsap')).getByRole('button', { name: 'Annotation actions' })
    )
    await user.click(await screen.findByRole('menuitem', { name: /Delete Annotation/ }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(store.getState().toast.severity).toBe('error'))
    expect(store.getState().toast.message).toMatch(/permission/)
  })
})

describe('AnnotationsTable — rows read from other editors', () => {
  it('does not offer to change a relation SAE cannot name (root MF occurs_in)', async () => {
    const model = transformGraphData({
      'modified-p': false,
      id: 'gomodel:vpe',
      individuals: [
        rawIndividual('mf', 'GO:0003674', 'molecular_function', ['GO:0003674']),
        rawIndividual('gp', 'UniProtKB:P1', 'VPE1 Hsap', ['CHEBI:33695', 'CHEBI:24431']),
        rawIndividual('cc', 'GO:0005634', 'nucleus', ['UBERON:0001062', 'GO:0005575']),
      ],
      facts: [
        rawFact('mf', 'RO:0002333', 'enabled by', 'gp'),
        rawFact('mf', 'BFO:0000066', 'occurs in', 'cc'),
      ],
      annotations: [],
    })
    const store = makeStore(stateWith({ model }))
    const { user } = renderWithProviders(<TableFromStore store={store} />, { store })
    const row = rowFor('VPE1 Hsap')
    expect(within(row).getByTestId('cell-relation')).toHaveTextContent('occurs in')
    await user.hover(within(row).getByTestId('cell-relation'))
    expect(within(row).queryByRole('button', { name: 'Edit relation' })).not.toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Edit GO term' })).toBeInTheDocument()
  })

  it('links each part of a pipe-joined reference on its own', () => {
    const model = transformGraphData({
      'modified-p': false,
      id: 'gomodel:pipe',
      individuals: [
        rawIndividual('mf', 'GO:0016301', 'kinase activity', ['GO:0003674']),
        rawIndividual('gp', 'PomBase:SPAC1F5.04c', 'cdc42 Spom', ['CHEBI:33695', 'CHEBI:24431']),
        rawEvidence('ev', 'ECO:0000318', 'biological aspect of ancestor', [
          'PANTHER:PTN005332947|PomBase:SPAC1F5.04c',
        ]),
      ],
      facts: [rawFact('mf', 'RO:0002333', 'enabled by', 'gp', { evidence: ['ev'] })],
      annotations: [],
    })
    const store = makeStore(stateWith({ model }))
    renderWithProviders(<TableFromStore store={store} />, { store })
    const cell = within(rowFor('cdc42 Spom')).getByTestId('cell-reference')
    expect(
      within(cell)
        .getAllByRole('link')
        .map(link => link.textContent)
    ).toEqual(['PomBase:SPAC1F5.04c', 'PANTHER:PTN005332947'])
  })
})

describe('AnnotationsTable — delete selected (#96)', () => {
  type User = ReturnType<typeof renderTable>['user']

  const tick = (user: User, gpLabel: string) =>
    user.click(within(rowFor(gpLabel)).getByRole('checkbox'))
  const selectionBar = () => screen.getByRole('toolbar', { name: 'Selected annotations' })
  const deleteSelected = (user: User) =>
    user.click(within(selectionBar()).getByRole('button', { name: /Delete/ }))

  /** `n` "located in" annotations, one gene product each. */
  const manyAnnotations = (n: number) =>
    transformGraphData({
      'modified-p': false,
      id: 'gomodel:many',
      individuals: Array.from({ length: n }).flatMap((_, i) => [
        rawIndividual(`gp${i}`, `UniProtKB:Q${i}`, `GENE${i} Hsap`, ['CHEBI:33695', 'CHEBI:24431']),
        rawIndividual(`cc${i}`, 'GO:0005737', 'cytoplasm', ['UBERON:0001062', 'GO:0005575']),
      ]),
      facts: Array.from({ length: n }).map((_, i) =>
        rawFact(`gp${i}`, 'RO:0001025', 'located in', `cc${i}`)
      ),
      annotations: [],
    })

  it('has no checkboxes when logged out', () => {
    renderTable({ loggedIn: false })
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('deletes the ticked rows in one batch after confirming', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const { user, store } = renderTable()

    await tick(user, 'BETA2 Hsap')
    await tick(user, 'DELTA4 Hsap')
    expect(selectionBar()).toHaveTextContent('2 selected')
    await deleteSelected(user)

    const list = await screen.findByRole('list', { name: 'Annotations to delete' })
    expect(
      within(list)
        .getAllByRole('listitem')
        .map(item => item.textContent)
    ).toEqual([expect.stringContaining('BETA2 Hsap'), expect.stringContaining('DELTA4 Hsap')])
    await user.click(screen.getByRole('button', { name: 'Delete 2' }))

    await waitFor(() => expect(requests).toHaveLength(1))
    const kinds = requests[0].operations.map(op => `${op.entity} ${op.operation}`)
    expect(kinds.slice(0, 2)).toEqual(['edge remove', 'edge remove'])
    expect(kinds.filter(kind => kind.endsWith('store'))).toEqual(['model store'])
    await waitFor(() => expect(store.getState().toast.message).toBe('Deleted 2 annotations.'))
  })

  // (The SAE fixture keeps an unconnected chemical, so deleting its rows is allowed.)
  it('selects every row from the header, and will not empty the model', async () => {
    const { requests } = mockBarista()
    const { user, store } = renderTable({ model: manyAnnotations(3) })

    await user.click(screen.getByRole('checkbox', { name: 'Select all annotations' }))
    expect(selectionBar()).toHaveTextContent('3 selected')
    await deleteSelected(user)
    await user.click(await screen.findByRole('button', { name: 'Delete 3' }))

    expect(store.getState().toast.message).toMatch(/all of the model's annotations/)
    expect(requests).toHaveLength(0)

    await user.click(screen.getByRole('checkbox', { name: 'Clear selection' }))
    expect(screen.queryByRole('toolbar', { name: 'Selected annotations' })).toBeNull()
  })

  it(`allows at most ${MAX_BULK_DELETE} at a time`, async () => {
    const { user } = renderTable({ model: manyAnnotations(MAX_BULK_DELETE + 1) })

    await user.click(screen.getByRole('checkbox', { name: 'Select all annotations' }))
    expect(selectionBar()).toHaveTextContent(
      `${MAX_BULK_DELETE + 1} selected — max ${MAX_BULK_DELETE}`
    )
    expect(within(selectionBar()).getByRole('button', { name: /Delete/ })).toBeDisabled()

    await tick(user, 'GENE0 Hsap')
    expect(selectionBar()).toHaveTextContent(`${MAX_BULK_DELETE} selected`)
    expect(within(selectionBar()).getByRole('button', { name: /Delete/ })).toBeEnabled()
  })

  it("warns before deleting from another group's model", async () => {
    const model = transformGraphData(JSON.parse(JSON.stringify(saeModelRaw)))
    model.groups = [{ id: 'http://example.org/other', label: 'Other Group' }]
    const { user } = renderTable({ model })

    await tick(user, 'BETA2 Hsap')
    await deleteSelected(user)
    expect(await screen.findByText("Warning: Editing another group's model")).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Annotations to delete' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Continue and edit anyway' }))
    expect(await screen.findByRole('button', { name: 'Delete 1' })).toBeInTheDocument()
  })
})
