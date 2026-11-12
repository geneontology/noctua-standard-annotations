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
import { findRelation } from '@/features/annotations/services/shapeRules'
import { RootTypes } from '@/features/gocam/models/cam'
import { Relations } from '@/@noctua.core/models/relations'
import { ANATOMICAL_STRUCTURE_DEVELOPMENT, THYMUS, isaClosure } from '@tests/fixtures/terms'

vi.mock('@/features/search/components/Autocomplete', () => import('@tests/mocks/autocompleteMock'))

// GOlr is JSONP; stand in for the GO term ancestry lookup of Add Extension.
const closure = vi.hoisted(() => ({
  data: undefined as string[] | undefined,
  calls: [] as { id: string; skip?: boolean }[],
}))
vi.mock('@/features/search/slices/lookupApiSlice', async importOriginal => ({
  ...(await importOriginal<object>()),
  useGetTermClosureQuery: (id: string, options?: { skip?: boolean }) => {
    closure.calls.push({ id, skip: options?.skip })
    return { data: options?.skip ? undefined : closure.data }
  },
}))

/** Relation options read "label id"; match on the label. */
const relationOption = (id: string) => ({ name: new RegExp(`^${findRelation(id).label}`) })

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
  closure.data = undefined
  closure.calls = []
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
    expect(screen.getByTestId('autocomplete-value-editor-term')).toHaveTextContent(
      'UniProtKB:P00001'
    )
  })

  it('swaps the GO term class, keeping NOT', async () => {
    autocompleteOptions['editor-term'] = [
      termOption('GO:0004674', 'protein serine/threonine kinase activity'),
    ]
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
      op =>
        op.operation === 'add-annotation' && JSON.stringify(op.arguments.values).includes('source')
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

  // Issue #85: `results in development of` is a rule of anatomical structure
  // development, but Minerva gives the BP only the BP root type.
  describe('extension relations of a BP subclass', () => {
    // Its GO term is anatomical structure development (saeModel `bp3`).
    const DEVELOPMENT_GP = 'gamma3 Drer'

    const openRelations = async (user: ReturnType<typeof renderEditor>['user']) => {
      await user.click(screen.getByRole('combobox', { name: 'New Extension Relation' }))
      return screen.findByRole('option', relationOption(Relations.HAS_INPUT))
    }

    it("looks up the GO term's ancestry for Add Extension only", () => {
      renderEditor(EditorCategory.ADD_EXTENSION, DEVELOPMENT_GP).unmount()
      expect(closure.calls.at(-1)).toEqual({ id: ANATOMICAL_STRUCTURE_DEVELOPMENT.id, skip: false })
      closure.calls = []
      renderEditor(EditorCategory.TERM, DEVELOPMENT_GP)
      expect(closure.calls.every(call => call.skip)).toBe(true)
    })

    it('offers them once the ancestry is known', async () => {
      closure.data = isaClosure(ANATOMICAL_STRUCTURE_DEVELOPMENT)
      const { user } = renderEditor(EditorCategory.ADD_EXTENSION, DEVELOPMENT_GP)
      await openRelations(user)
      expect(
        screen.getByRole('option', relationOption(Relations.RESULTS_IN_DEVELOPMENT_OF))
      ).toBeInTheDocument()
      // Another subclass's rule stays out.
      expect(
        screen.queryByRole('option', relationOption(Relations.RESULTS_IN_MOVEMENT_OF))
      ).toBeNull()
    })

    it('keeps to the root rules while the ancestry is unknown', async () => {
      const { user } = renderEditor(EditorCategory.ADD_EXTENSION, DEVELOPMENT_GP)
      await openRelations(user)
      expect(
        screen.queryByRole('option', relationOption(Relations.RESULTS_IN_DEVELOPMENT_OF))
      ).toBeNull()
    })

    it('limits the term to the relation range and saves the extension', async () => {
      closure.data = isaClosure(ANATOMICAL_STRUCTURE_DEVELOPMENT)
      autocompleteOptions['editor-term'] = [termOption(THYMUS.id, THYMUS.label)]
      const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
      const { user, onClose } = renderEditor(EditorCategory.ADD_EXTENSION, DEVELOPMENT_GP)

      await openRelations(user)
      await user.click(
        screen.getByRole('option', relationOption(Relations.RESULTS_IN_DEVELOPMENT_OF))
      )
      expect(screen.getByTestId('autocomplete-range-editor-term')).toHaveTextContent(
        JSON.stringify([RootTypes.ANATOMICAL_ENTITY])
      )
      await user.click(screen.getByTestId(`pick-editor-term-${THYMUS.id}`))
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => expect(onClose).toHaveBeenCalled())
      expect(requests[0].operations).toContainEqual(
        expect.objectContaining({
          entity: 'edge',
          operation: 'add',
          arguments: expect.objectContaining({
            subject: saeUid('bp3'),
            predicate: Relations.RESULTS_IN_DEVELOPMENT_OF,
          }),
        })
      )
    })
  })
})
