import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { renderWithProviders } from '@tests/test-utils'
import { mockBarista, batchSuccess } from '@tests/fixtures/barista'
import { saeModelRaw, SAE_MODEL_ID } from '@tests/fixtures/saeModel'
import { CURATOR } from '@tests/fixtures/state'
import StandardAnnotations from '@/app/StandardAnnotations'

vi.mock('@/features/search/components/Autocomplete', () => import('@tests/mocks/autocompleteMock'))

const renderPage = (search: string, loggedIn = true) =>
  renderWithProviders(
    <MemoryRouter initialEntries={[`/${search}`]}>
      <StandardAnnotations />
    </MemoryRouter>,
    {
      preloadedState: {
        auth: { user: loggedIn ? CURATOR : null, baristaToken: loggedIn ? 'tok-123' : null },
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
      request.params.get('intention') === 'query' && request.method === 'GET'
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
})
