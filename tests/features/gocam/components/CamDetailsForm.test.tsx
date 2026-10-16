import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/test-utils'
import { mockBarista, batchSuccess } from '@tests/fixtures/barista'
import { stateWith } from '@tests/fixtures/state'
import { saeModelRaw, SAE_MODEL_ID } from '@tests/fixtures/saeModel'
import { loadModel } from '@tests/fixtures/models'
import CamDetailsForm from '@/features/gocam/components/CamDetailsForm'

afterEach(() => vi.unstubAllGlobals())

describe('CamDetailsForm', () => {
  it('is read-only when logged out', () => {
    renderWithProviders(<CamDetailsForm />, { preloadedState: stateWith({ loggedIn: false }) })
    expect(screen.getByText('Log in to edit the model details')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveAttribute('readonly')
  })

  it('saves title, state and comments in one batch', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const { user, store } = renderWithProviders(<CamDetailsForm />, {
      preloadedState: stateWith(),
    })

    const title = screen.getByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'New title')
    await user.click(screen.getByRole('button', { name: 'Add Another Comment' }))
    const comments = screen.getAllByLabelText('Comment')
    await user.type(comments[1], 'second')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(requests).toHaveLength(1))
    const values = requests[0].operations.map(op => [
      op.operation,
      JSON.stringify((op.arguments as { values?: unknown }).values ?? null),
    ])
    expect(values).toEqual([
      ['remove-annotation', JSON.stringify([{ key: 'title', value: 'enabled by ALPHA1 Hsap' }])],
      ['remove-annotation', JSON.stringify([{ key: 'state', value: 'development' }])],
      ['remove-annotation', JSON.stringify([{ key: 'comment', value: 'model comment' }])],
      ['add-annotation', JSON.stringify([{ key: 'title', value: 'New title' }])],
      ['add-annotation', JSON.stringify([{ key: 'state', value: 'development' }])],
      ['add-annotation', JSON.stringify([{ key: 'comment', value: 'model comment' }])],
      ['add-annotation', JSON.stringify([{ key: 'comment', value: 'second' }])],
      ['store', 'null'],
    ])
    expect(requests[0].operations[0].arguments['model-id']).toBe(SAE_MODEL_ID)
    await waitFor(() =>
      expect(store.getState().toast.message).toBe('Model details successfully updated.')
    )
  })

  it('removes every title and state the model carries', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const twoTitles = loadModel({
      ...saeModelRaw,
      annotations: [
        { key: 'title', value: 'first' },
        { key: 'title', value: 'second' },
        { key: 'state', value: 'review' },
      ],
    })
    const { user } = renderWithProviders(<CamDetailsForm />, {
      preloadedState: stateWith({ model: twoTitles }),
    })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(requests).toHaveLength(1))
    const removed = requests[0].operations
      .filter(op => op.operation === 'remove-annotation')
      .map(op => (op.arguments.values as { value: string }[])[0].value)
    expect(removed).toEqual(['first', 'second', 'review'])
  })

  it('switches the group edits are attributed to', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const { user, store } = renderWithProviders(<CamDetailsForm />, {
      preloadedState: stateWith(),
    })

    await user.click(screen.getByRole('combobox', { name: 'Group' }))
    await user.click(await screen.findByRole('option', { name: 'UniProt' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(requests).toHaveLength(1))
    expect(requests[0].params.get('provided-by')).toBe('https://www.uniprot.org')
    expect(store.getState().auth.user?.group?.id).toBe('https://www.uniprot.org')
  })

  it('lists contributors and groups, and opens the model in the other editors', () => {
    renderWithProviders(<CamDetailsForm />, { preloadedState: stateWith() })
    const summary = screen.getByTestId('model-summary')
    expect(summary).toHaveTextContent('Groups:')
    expect(summary).toHaveTextContent('Contributors:')
    const href = (name: string) => screen.getByRole('link', { name }).getAttribute('href')
    expect(href('Pathway Editor')).toContain(
      `noctua-visual-pathway-editor?model_id=${encodeURIComponent(SAE_MODEL_ID)}`
    )
    expect(href('Form Editor')).toContain('noctua-form?model_id=')
    expect(href('Graph Editor')).toContain(`/editor/graph/${SAE_MODEL_ID}?barista_token=`)
  })

  it('asks for a state when the model has none, rather than writing "development"', () => {
    const stateless = loadModel({
      ...saeModelRaw,
      annotations: saeModelRaw.annotations.filter(a => a.key !== 'state'),
    })
    renderWithProviders(<CamDetailsForm />, { preloadedState: stateWith({ model: stateless }) })
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})
