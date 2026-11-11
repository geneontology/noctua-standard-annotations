import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/test-utils'
import { mockBarista, batchSuccess } from '@tests/fixtures/barista'
import type { RecordedRequest } from '@tests/fixtures/barista'
import { stateWith } from '@tests/fixtures/state'
import { saeModelRaw, SAE_MODEL_ID } from '@tests/fixtures/saeModel'
import { loadModel } from '@tests/fixtures/models'
import CamTitleForm from '@/features/gocam/components/CamTitleForm'
import CamStateForm from '@/features/gocam/components/CamStateForm'
import CamCommentsForm from '@/features/gocam/components/CamCommentsForm'

afterEach(() => vi.unstubAllGlobals())

/** [operation, key, value] per op of the one recorded batch. */
const batch = (requests: RecordedRequest[]) =>
  requests[0].operations.map(op => {
    const value = (op.arguments as { values?: { key: string; value: string }[] }).values?.[0]
    return value ? [op.operation, value.key, value.value] : [op.operation]
  })

describe('CamTitleForm', () => {
  it('saves the title alone', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const { user, store } = renderWithProviders(<CamTitleForm />, { preloadedState: stateWith() })

    const title = screen.getByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'New title')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(requests).toHaveLength(1))
    expect(batch(requests)).toEqual([
      ['remove-annotation', 'title', 'enabled by ALPHA1 Hsap'],
      ['add-annotation', 'title', 'New title'],
      ['store'],
    ])
    expect(requests[0].operations[0].arguments['model-id']).toBe(SAE_MODEL_ID)
    await waitFor(() =>
      expect(store.getState().toast.message).toBe('Model title successfully updated.')
    )
  })

  it("won't save a blank or unchanged title", async () => {
    const { user } = renderWithProviders(<CamTitleForm />, { preloadedState: stateWith() })
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), '   ')
    expect(save).toBeDisabled()
  })

  it('is read-only when logged out', () => {
    renderWithProviders(<CamTitleForm />, { preloadedState: stateWith({ loggedIn: false }) })
    expect(screen.getByLabelText('Title')).toHaveAttribute('readonly')
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })
})

describe('CamStateForm', () => {
  it('saves the state alone', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const { user } = renderWithProviders(<CamStateForm />, { preloadedState: stateWith() })

    await user.click(screen.getByRole('combobox', { name: 'State' }))
    await user.click(await screen.findByRole('option', { name: 'Production' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(requests).toHaveLength(1))
    expect(batch(requests)).toEqual([
      ['remove-annotation', 'state', 'development'],
      ['add-annotation', 'state', 'production'],
      ['store'],
    ])
  })

  it('asks for a state when the model has none, rather than writing "development"', () => {
    const stateless = loadModel({
      ...saeModelRaw,
      annotations: saeModelRaw.annotations.filter(a => a.key !== 'state'),
    })
    renderWithProviders(<CamStateForm />, { preloadedState: stateWith({ model: stateless }) })
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('removes every state the model carries', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const twoStates = loadModel({
      ...saeModelRaw,
      annotations: [
        { key: 'title', value: 't' },
        { key: 'state', value: 'review' },
        { key: 'state', value: 'development' },
      ],
    })
    const { user } = renderWithProviders(<CamStateForm />, {
      preloadedState: stateWith({ model: twoStates }),
    })
    // Two states: saving the shown one still cleans up the other.
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(requests).toHaveLength(1))
    expect(batch(requests)).toEqual([
      ['remove-annotation', 'state', 'review'],
      ['remove-annotation', 'state', 'development'],
      ['add-annotation', 'state', 'review'],
      ['store'],
    ])
  })
})

describe('CamCommentsForm', () => {
  it('saves the model comments alone', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    const { user, store } = renderWithProviders(<CamCommentsForm />, {
      preloadedState: stateWith(),
    })

    await user.click(screen.getByRole('button', { name: 'Add Another Comment' }))
    await user.type(screen.getAllByLabelText('Comment')[1], 'second')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(requests).toHaveLength(1))
    expect(batch(requests)).toEqual([
      ['remove-annotation', 'comment', 'model comment'],
      ['add-annotation', 'comment', 'model comment'],
      ['add-annotation', 'comment', 'second'],
      ['store'],
    ])
    await waitFor(() =>
      expect(store.getState().toast.message).toBe('Model comments successfully updated.')
    )
  })

  it('keeps the form open and reports a failed save', async () => {
    mockBarista(() => ({ 'message-type': 'error', message: 'boom' }))
    const { user, store } = renderWithProviders(<CamCommentsForm />, {
      preloadedState: { ...stateWith(), dialog: { ...openDialogState } },
    })
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(store.getState().toast.severity).toBe('error'))
    expect(store.getState().dialog.open).toBe(true)
  })

  it('shows the comments read-only when logged out', () => {
    renderWithProviders(<CamCommentsForm />, { preloadedState: stateWith({ loggedIn: false }) })
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })
})

const openDialogState = {
  open: true,
  title: 'Model Comments',
  size: 'sm' as const,
  fullWidth: true,
  showActions: false,
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  preventBackdropClose: false,
  bodyScroll: 'none' as const,
  component: null,
  customProps: {},
}
