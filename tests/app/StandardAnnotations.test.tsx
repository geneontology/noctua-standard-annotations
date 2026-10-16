import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { renderWithProviders } from '@tests/test-utils'
import { mockBarista, batchSuccess } from '@tests/fixtures/barista'
import { saeModelRaw, SAE_MODEL_ID } from '@tests/fixtures/saeModel'
import { CURATOR } from '@tests/fixtures/state'
import StandardAnnotations from '@/app/StandardAnnotations'
import NotSavedBar from '@/app/layout/NotSavedBar'
import apiService from '@/app/store/apiService'

vi.mock('@/features/search/components/Autocomplete', () => import('@tests/mocks/autocompleteMock'))

const renderPage = (search: string, loggedIn = true, userChecked = true) =>
  renderWithProviders(
    <MemoryRouter initialEntries={[`/${search}`]}>
      <NotSavedBar />
      <StandardAnnotations />
    </MemoryRouter>,
    {
      preloadedState: {
        auth: {
          user: loggedIn ? CURATOR : null,
          baristaToken: loggedIn ? 'tok-123' : null,
          userChecked,
        },
      },
    }
  )

afterEach(() => vi.unstubAllGlobals())

describe('StandardAnnotations page', () => {
  it('asks for a model when there is no model_id', () => {
    renderPage('')
    expect(screen.getByText(/No model selected/)).toBeInTheDocument()
  })

  it('loads the model and shows the form and the table', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    renderPage(`?model_id=${SAE_MODEL_ID}`)

    expect(await screen.findByText('( 9 )')).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Create annotation' })).toBeInTheDocument()
    expect(requests[0].operations[0].arguments).toEqual({ 'model-id': SAE_MODEL_ID })
  })

  it('shows why a model could not be loaded', async () => {
    mockBarista(() => ({
      'message-type': 'error',
      message: 'UnknownIdentifierException: Could not find a model',
    }))
    renderPage('?model_id=gomodel:missing')
    expect(await screen.findByText(/The model could not be found/)).toBeInTheDocument()
  })

  it('offers Reset and Save for a model with unsaved changes', async () => {
    const { requests } = mockBarista(request =>
      request.operations[0]?.operation === 'get'
        ? batchSuccess({ ...saeModelRaw, 'modified-p': true })
        : batchSuccess(saeModelRaw)
    )
    const { user } = renderPage(`?model_id=${SAE_MODEL_ID}`)

    expect(await screen.findByText('Not Saved')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(await screen.findByText(/All your changes will be discarded/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'OK' }))

    await waitFor(() =>
      expect(requests.some(r => r.operations[0]?.operation === 'reset')).toBe(true)
    )
  })

  it('waits for Barista to confirm a stored token before reading the model', async () => {
    const { requests } = mockBarista(() => batchSuccess(saeModelRaw))
    renderPage(`?model_id=${SAE_MODEL_ID}`, true, false)
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(requests).toHaveLength(0)
  })

  it('keeps the model on the page when a refresh fails', async () => {
    let fail = false
    mockBarista(() =>
      fail ? { 'message-type': 'error', message: 'Minerva is down' } : batchSuccess(saeModelRaw)
    )
    const { store } = renderPage(`?model_id=${SAE_MODEL_ID}`)
    expect(await screen.findAllByTestId('annotation-row')).toHaveLength(9)

    fail = true
    // The tag is added by camApiSlice's enhanceEndpoints, which the base api type doesn't know.
    store.dispatch(apiService.util.invalidateTags(['graph' as never]))

    await waitFor(() =>
      expect(store.getState().toast.message).toBe('Could not refresh the model: Minerva is down')
    )
    expect(screen.getAllByTestId('annotation-row')).toHaveLength(9)
    expect(screen.queryByText(/Could not load/)).not.toBeInTheDocument()
  })
})
