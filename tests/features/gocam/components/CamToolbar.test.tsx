import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/test-utils'
import { stateWith } from '@tests/fixtures/state'
import CamToolbar from '@/features/gocam/components/CamToolbar'
import { DialogComponent } from '@/@noctua.core/components/dialog/dialogSlice'

describe('CamToolbar', () => {
  it('shows the title, state, date and model comment count', () => {
    renderWithProviders(<CamToolbar />, { preloadedState: stateWith() })
    expect(screen.getByTestId('model-title')).toHaveTextContent('Title:enabled by ALPHA1 Hsap')
    expect(screen.getByRole('button', { name: /development/i })).toBeInTheDocument()
    expect(screen.getByText('2024-05-02')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Model comments' })).toHaveTextContent('1')
  })

  it('offers the VIEW IN and EXPORT AS menus', () => {
    renderWithProviders(<CamToolbar />, { preloadedState: stateWith() })
    expect(screen.getByRole('button', { name: 'VIEW IN' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'EXPORT AS' })).toBeInTheDocument()
  })

  it('opens Model Details from the title', async () => {
    const { user, store } = renderWithProviders(<CamToolbar />, { preloadedState: stateWith() })
    await user.click(screen.getByTestId('edit-model-title'))
    expect(store.getState().dialog).toMatchObject({
      open: true,
      component: DialogComponent.CAM_DETAILS_FORM,
      title: 'Model Details',
    })
  })

  it('renders nothing without a model', () => {
    renderWithProviders(<CamToolbar />, { preloadedState: stateWith({ model: null }) })
    expect(screen.queryByTestId('model-title')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'VIEW IN' })).not.toBeInTheDocument()
  })
})
