import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/test-utils'
import { mockBarista, batchSuccess } from '@tests/fixtures/barista'
import { stateWith } from '@tests/fixtures/state'
import { loadModel, saeModelRaw } from '@tests/fixtures/models'
import { autocompleteOptions, resetAutocompleteOptions } from '@tests/mocks/autocompleteMock'
import AnnotationForm from '@/features/annotations/components/AnnotationForm'
import { termOption } from '@/features/annotations/models/annotationForm'

vi.mock('@/features/search/components/Autocomplete', () => import('@tests/mocks/autocompleteMock'))

const GP = termOption('UniProtKB:P12345', 'NEW1 Hsap', [
  { id: 'CHEBI:36080', label: 'protein' },
  { id: 'CHEBI:33695', label: 'information biomacromolecule' },
])
const BP = termOption('GO:0006915', 'apoptotic process', [
  { id: 'GO:0008150', label: 'biological_process' },
])
const IMP = termOption('ECO:0000315', 'mutant phenotype evidence used in manual assertion')

const untitledModel = () => ({ ...loadModel(saeModelRaw), title: undefined })

const renderForm = (loggedIn = true) =>
  renderWithProviders(<AnnotationForm />, {
    preloadedState: stateWith({ model: untitledModel(), loggedIn }),
  })

beforeEach(() => {
  autocompleteOptions.gp = [GP]
  autocompleteOptions.goterm = [BP]
  autocompleteOptions.evidenceCode = [IMP]
})

afterEach(() => {
  resetAutocompleteOptions()
  vi.unstubAllGlobals()
})

describe('AnnotationForm', () => {
  it('asks to log in when logged out', () => {
    renderForm(false)
    expect(screen.getByText('Log in to Continue')).toBeInTheDocument()
  })

  it('searches gene products (not GO complexes) and leaves the GO term unsearchable until a GP is picked', async () => {
    const { user } = renderForm()
    expect(screen.getByTestId('autocomplete-idspaces-gp')).toHaveTextContent('["GO"]')
    expect(screen.getByTestId('autocomplete-range-goterm')).toHaveTextContent('[]')

    await user.click(screen.getByTestId('pick-gp-UniProtKB:P12345'))
    expect(screen.getByTestId('autocomplete-range-goterm')).toHaveTextContent('GO:0008150')
  })

  it('explains why Save is disabled, once the curator has started', async () => {
    const { user } = renderForm()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    // A pristine form doesn't nag (Angular computed errors on the first change).
    expect(
      screen.queryByRole('button', { name: /Why is the "Save" button disabled/ })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'NOT' }))
    await user.click(screen.getByRole('button', { name: /Why is the "Save" button disabled/ }))
    const dialog = await screen.findByText('Errors')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('GP is required')).toBeInTheDocument()
    expect(screen.getByText('Reference is required @ 1')).toBeInTheDocument()
  })

  it('picks the relation for the pair and saves an "involved in" annotation', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const { user, store } = renderForm()

    await user.click(screen.getByTestId('pick-gp-UniProtKB:P12345'))
    await user.click(screen.getByTestId('pick-goterm-GO:0006915'))
    expect(screen.getByRole('combobox', { name: 'GP to Term Relation' })).toHaveValue('involved in')

    await user.click(screen.getByTestId('pick-evidenceCode-0-ECO:0000315'))
    const evidenceRow = screen.getByTestId('evidence-row')
    await user.type(within(evidenceRow).getByLabelText('Reference'), 'PMID:12345')
    await user.type(within(evidenceRow).getByLabelText('With/From'), 'zfin:ZDB-MRPHLNO-1')

    const save = screen.getByRole('button', { name: 'Save' })
    await waitFor(() => expect(save).toBeEnabled())
    await user.click(save)

    await waitFor(() => expect(requests).toHaveLength(1))
    const ops = requests[0].operations
    const edges = ops.filter(op => op.entity === 'edge' && op.operation === 'add')
    expect(edges.map(op => op.arguments.predicate)).toEqual(['RO:0002333', 'BFO:0000050'])
    const withValues = ops
      .filter(op => op.operation === 'add-annotation' && op.entity === 'individual')
      .flatMap(op => op.arguments.values as { key: string; value: string }[])
    expect(withValues).toContainEqual({ key: 'with', value: 'ZFIN:ZDB-MRPHLNO-1' })
    expect(withValues).toContainEqual({ key: 'source', value: 'PMID:12345' })
    // The untitled model is named after the gene product.
    expect(ops).toContainEqual({
      entity: 'model',
      operation: 'add-annotation',
      arguments: {
        'model-id': 'gomodel:sae000000001',
        values: [{ key: 'title', value: 'enabled by NEW1 Hsap' }],
      },
    })

    await waitFor(() =>
      expect(store.getState().toast.message).toBe('Annotation successfully created.')
    )
    // The form is cleared after a save.
    expect(screen.getByTestId('autocomplete-value-gp')).toHaveTextContent('')
  })

  it('fills the root term with ND evidence', async () => {
    const { user } = renderForm()
    await user.click(screen.getByRole('button', { name: 'Term options' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Add BP Root' }))

    expect(screen.getByTestId('autocomplete-value-goterm')).toHaveTextContent('GO:0008150')
    expect(screen.getByTestId('autocomplete-value-evidenceCode-0')).toHaveTextContent('ECO:0000307')
    expect(within(screen.getByTestId('evidence-row')).getByLabelText('Reference')).toHaveValue(
      'GO_REF:0000015'
    )
  })

  it('fills ISS evidence from the evidence menu', async () => {
    const { user } = renderForm()
    await user.click(screen.getByRole('button', { name: 'Evidence options' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Add ISS Evidence' }))
    expect(screen.getByTestId('autocomplete-value-evidenceCode-0')).toHaveTextContent('ECO:0000250')
    expect(within(screen.getByTestId('evidence-row')).getByLabelText('Reference')).toHaveValue(
      'GO_REF:0000024'
    )
  })

  it('adds and removes extension and comment rows', async () => {
    const { user } = renderForm()
    await user.click(screen.getByRole('button', { name: 'Add Extension' }))
    expect(screen.getAllByTestId('extension-row')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Add Another Extension' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete extension' }))
    expect(screen.queryByTestId('extension-row')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add Comment' }))
    await user.type(screen.getByLabelText('Comment'), 'hello')
    await user.click(screen.getByRole('button', { name: 'Delete comment' }))
    expect(screen.queryByLabelText('Comment')).not.toBeInTheDocument()
  })
})
