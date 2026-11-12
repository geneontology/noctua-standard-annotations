import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/test-utils'
import { stateWith } from '@tests/fixtures/state'
import { loadModel, saeModelRaw } from '@tests/fixtures/models'
import CamToolbar from '@/features/gocam/components/CamToolbar'
import GroupGuardProvider from '@/features/gocam/components/GroupGuardProvider'
import { DialogComponent } from '@/@noctua.core/components/dialog/dialogSlice'

const toolbar = (
  <GroupGuardProvider>
    <CamToolbar />
  </GroupGuardProvider>
)

const otherGroupsModel = () => ({
  ...loadModel(saeModelRaw),
  groups: [{ id: 'http://other.example.org', label: 'Other Group' }],
})

describe('CamToolbar', () => {
  it('shows the title, state, date and model comment count', () => {
    renderWithProviders(toolbar, { preloadedState: stateWith() })
    expect(screen.getByTestId('model-title')).toHaveTextContent('Title:enabled by ALPHA1 Hsap')
    expect(screen.getByRole('button', { name: /development/i })).toBeInTheDocument()
    expect(screen.getByText('2024-05-02')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Model comments' })).toHaveTextContent('1')
  })

  it('offers the VIEW and EXPORT AS menus', () => {
    renderWithProviders(toolbar, { preloadedState: stateWith() })
    expect(screen.getByRole('button', { name: 'VIEW' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'EXPORT AS' })).toBeInTheDocument()
  })

  it.each([
    ['the title pencil', 'Edit model title', DialogComponent.CAM_TITLE_FORM, 'Edit Title'],
    ['the state chip', /development/i, DialogComponent.CAM_STATE_FORM, 'Change State'],
    ['the comment icon', 'Model comments', DialogComponent.CAM_COMMENTS_FORM, 'Model Comments'],
    ['the date chip', /2024-05-02/, DialogComponent.CAM_DETAILS_FORM, 'Model Details'],
  ])('opens its own form from %s', async (_control, name, component, title) => {
    const { user, store } = renderWithProviders(toolbar, { preloadedState: stateWith() })
    await user.click(screen.getByRole('button', { name }))
    expect(store.getState().dialog).toMatchObject({ open: true, component, title })
  })

  it('offers no title or state edit when logged out, but shows the comments', async () => {
    const { user, store } = renderWithProviders(toolbar, {
      preloadedState: stateWith({ loggedIn: false }),
    })
    expect(screen.queryByTestId('edit-model-title')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /development/i })).not.toBeInTheDocument()
    expect(screen.getByText(/development/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Model comments' }))
    expect(store.getState().dialog.component).toBe(DialogComponent.CAM_COMMENTS_FORM)
  })

  it("warns before editing another group's model, and opens the form on Continue", async () => {
    const { user, store } = renderWithProviders(toolbar, {
      preloadedState: stateWith({ model: otherGroupsModel() }),
    })
    await user.click(screen.getByTestId('edit-model-title'))
    expect(screen.getByText(/different group\(s\) \(Other Group\)/)).toBeInTheDocument()
    expect(store.getState().dialog.open).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Continue and edit anyway' }))
    expect(store.getState().dialog).toMatchObject({
      open: true,
      component: DialogComponent.CAM_TITLE_FORM,
    })
  })

  it("doesn't open the form when the warning is cancelled", async () => {
    const { user, store } = renderWithProviders(toolbar, {
      preloadedState: stateWith({ model: otherGroupsModel() }),
    })
    await user.click(screen.getByRole('button', { name: /development/i }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(store.getState().dialog.open).toBe(false)
  })

  it('opens Model Details without a warning, since it writes nothing to the model', async () => {
    const { user, store } = renderWithProviders(toolbar, {
      preloadedState: stateWith({ model: otherGroupsModel() }),
    })
    await user.click(screen.getByRole('button', { name: /2024-05-02/ }))
    expect(store.getState().dialog.component).toBe(DialogComponent.CAM_DETAILS_FORM)
  })

  it('renders nothing without a model', () => {
    renderWithProviders(toolbar, { preloadedState: stateWith({ model: null }) })
    expect(screen.queryByTestId('model-title')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'VIEW' })).not.toBeInTheDocument()
  })
})
