import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/test-utils'
import { stateWith } from '@tests/fixtures/state'
import { loadModel, mfWithBpExtensionRaw, singleMfRaw } from '@tests/fixtures/models'
import ModelErrorsPanel from '@/features/annotations/components/ModelErrorsPanel'
import { makeStore } from '@/app/store/store'
import { setRightDrawerOpen } from '@/@noctua.core/components/drawer/drawerSlice'

describe('ModelErrorsPanel', () => {
  it('lists the individuals no annotation uses', () => {
    renderWithProviders(<ModelErrorsPanel />, { preloadedState: stateWith() })
    const standalone = screen.getByTestId('standalone-nodes')
    expect(within(standalone).getByText('water')).toBeInTheDocument()
    expect(within(standalone).getByText('CHEBI:15377')).toBeInTheDocument()
    expect(screen.queryByTestId('hidden-edge')).not.toBeInTheDocument()
  })

  it('lists a relation the table does not show, with the term it uses', () => {
    renderWithProviders(<ModelErrorsPanel />, {
      preloadedState: stateWith({ model: loadModel(mfWithBpExtensionRaw) }),
    })
    expect(screen.getByTestId('hidden-edge')).toHaveTextContent(
      'DNA-templated DNA replication —— part of ——> G0 to G1 transition'
    )
    expect(
      within(screen.getByTestId('relation-nodes')).getByText('G0 to G1 transition')
    ).toBeInTheDocument()
  })

  it('says so when the table shows the whole model', () => {
    renderWithProviders(<ModelErrorsPanel />, {
      preloadedState: stateWith({ model: loadModel(singleMfRaw) }),
    })
    expect(screen.getByText(/No errors/)).toBeInTheDocument()
    expect(screen.queryByTestId('hidden-node')).not.toBeInTheDocument()
  })

  it('closes the drawer', async () => {
    const store = makeStore(stateWith())
    store.dispatch(setRightDrawerOpen(true))
    const { user } = renderWithProviders(<ModelErrorsPanel />, { store })
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(store.getState().drawer.rightDrawerOpen).toBe(false)
  })
})
