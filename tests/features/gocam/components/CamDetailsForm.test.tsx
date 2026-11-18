import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/test-utils'
import { mockBarista } from '@tests/fixtures/barista'
import { stateWith } from '@tests/fixtures/state'
import { SAE_MODEL_ID } from '@tests/fixtures/saeModel'
import CamDetailsForm from '@/features/gocam/components/CamDetailsForm'

afterEach(() => vi.unstubAllGlobals())

describe('CamDetailsForm', () => {
  it('shows only the summary when logged out', () => {
    renderWithProviders(<CamDetailsForm />, { preloadedState: stateWith({ loggedIn: false }) })
    expect(screen.getByTestId('model-summary')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Group' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('no longer edits the title, state or comments (#94)', () => {
    renderWithProviders(<CamDetailsForm />, { preloadedState: stateWith() })
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'State' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Comment')).not.toBeInTheDocument()
  })

  it('switches the group edits are attributed to, without writing to the model', async () => {
    const { requests } = mockBarista()
    const { user, store } = renderWithProviders(<CamDetailsForm />, {
      preloadedState: stateWith(),
    })

    await user.click(screen.getByRole('combobox', { name: 'Group' }))
    await user.click(await screen.findByRole('option', { name: 'UniProt' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(store.getState().auth.user?.group?.id).toBe('https://www.uniprot.org')
    expect(store.getState().toast.message).toBe('Edits are now attributed to UniProt.')
    expect(requests).toHaveLength(0)
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
})
