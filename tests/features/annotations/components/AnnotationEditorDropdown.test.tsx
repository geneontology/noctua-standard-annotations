import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/test-utils'
import { mockBarista, batchSuccess } from '@tests/fixtures/barista'
import { stateWith } from '@tests/fixtures/state'
import { loadModel, saeModelRaw } from '@tests/fixtures/models'
import { saeUid } from '@tests/fixtures/saeModel'
import { autocompleteOptions, resetAutocompleteOptions } from '@tests/mocks/autocompleteMock'
import AnnotationEditorDropdown, {
  EditorCategory,
} from '@/features/annotations/components/AnnotationEditorDropdown'
import { extractAnnotations } from '@/features/annotations/services/annotationExtraction'
import { termOption } from '@/features/annotations/models/annotationForm'

vi.mock('@/features/search/components/Autocomplete', () => import('@tests/mocks/autocompleteMock'))

const model = loadModel(saeModelRaw)
const annotations = extractAnnotations(model)
const byGp = (label: string) => annotations.find(a => a.gp.label === label)!

const renderEditor = (category: EditorCategory, gpLabel = 'ALPHA1 Hsap') => {
  const onClose = vi.fn()
  const anchor = document.createElement('button')
  // jsdom lays nothing out; AnchoredPopover stays hidden for a 0×0 anchor.
  anchor.getBoundingClientRect = () =>
    ({ x: 10, y: 10, top: 10, left: 10, right: 30, bottom: 30, width: 20, height: 20 }) as DOMRect
  document.body.appendChild(anchor)
  const view = renderWithProviders(
    <AnnotationEditorDropdown
      anchorEl={anchor}
      category={category}
      annotation={byGp(gpLabel)}
      onClose={onClose}
    />,
    { preloadedState: stateWith({ model }) }
  )
  return { ...view, onClose }
}

afterEach(() => {
  resetAutocompleteOptions()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('AnnotationEditorDropdown', () => {
  it('limits a GO term edit to the range of its relation', () => {
    renderEditor(EditorCategory.TERM, 'DELTA4 Hsap')
    expect(screen.getByTestId('autocomplete-range-editor-term')).toHaveTextContent('["GO:0005575"]')
  })

  it('searches gene products without GO complexes for a GP edit', () => {
    renderEditor(EditorCategory.GP)
    expect(screen.getByTestId('autocomplete-idspaces-editor-term')).toHaveTextContent('["GO"]')
    expect(screen.getByTestId('autocomplete-value-editor-term')).toHaveTextContent('UniProtKB:P00001')
  })

  it('swaps the GO term class, keeping NOT', async () => {
    autocompleteOptions['editor-term'] = [termOption('GO:0004674', 'protein serine/threonine kinase activity')]
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const { user, onClose } = renderEditor(EditorCategory.TERM)

    await user.click(screen.getByTestId('pick-editor-term-GO:0004674'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(requests[0].operations[1]).toMatchObject({
      operation: 'add-type',
      arguments: {
        individual: saeUid('mf1'),
        expressions: [{ type: 'complement', filler: { type: 'class', id: 'GO:0004674' } }],
      },
    })
  })

  it('warns instead of saving a term that was not picked', async () => {
    const { requests } = mockBarista()
    const { user, store } = renderEditor(EditorCategory.TERM)
    await user.click(screen.getByTestId('clear-editor-term'))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(store.getState().toast.message).toBe('Please select term from autocomplete.')
    expect(requests).toHaveLength(0)
  })

  it('rejects a reference without DB:accession', async () => {
    const { requests } = mockBarista()
    const { user, store } = renderEditor(EditorCategory.REFERENCE)
    const field = screen.getByLabelText('Reference')
    await user.clear(field)
    await user.type(field, '12345')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(store.getState().toast.message).toBe('Use DB:accession format for reference.')
    expect(requests).toHaveLength(0)
  })

  it('updates the reference on every evidence of the annotation', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const { user, onClose } = renderEditor(EditorCategory.REFERENCE)
    const field = screen.getByLabelText('Reference')
    await user.clear(field)
    await user.type(field, 'PMID:999')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const added = requests[0].operations.filter(
      op => op.operation === 'add-annotation' && JSON.stringify(op.arguments.values).includes('source')
    )
    expect(added).toHaveLength(3)
  })

  it('rejects a with/from outside the allowed namespaces', async () => {
    const { requests } = mockBarista()
    const { user, store } = renderEditor(EditorCategory.WITH)
    const field = screen.getByLabelText('With/From')
    await user.clear(field)
    await user.type(field, 'NCBI:1')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(store.getState().toast.message).toMatch(/Invalid database prefix: "NCBI"/)
    expect(requests).toHaveLength(0)
  })

  it('offers the relations allowed for the pair', async () => {
    const { user } = renderEditor(EditorCategory.RELATION)
    expect(screen.getByRole('combobox', { name: 'GP To Term Relation' })).toHaveValue('enables')
    await user.click(screen.getByRole('combobox', { name: 'GP To Term Relation' }))
    expect(await screen.findByRole('option', { name: /contributes to/ })).toBeInTheDocument()
  })

  it('adds a comment to every fact of the annotation', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const { user, onClose } = renderEditor(EditorCategory.ADD_COMMENT)
    await user.type(screen.getByLabelText('Comment'), 'new note')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const added = requests[0].operations.filter(
      op => op.entity === 'edge' && op.operation === 'add-annotation'
    )
    expect(added).toHaveLength(3)
    expect(added[0].arguments.values).toEqual([
      { key: 'comment', value: 'checked' },
      { key: 'comment', value: 'new note' },
    ])
  })

  it('requires both halves of a new extension', async () => {
    const { requests } = mockBarista()
    const { user, store } = renderEditor(EditorCategory.ADD_EXTENSION)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(store.getState().toast.message).toBe(
      'Please select both an extension relation and an extension term.'
    )
    expect(requests).toHaveLength(0)
  })
})
