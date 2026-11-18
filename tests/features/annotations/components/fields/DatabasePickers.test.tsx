import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/test-utils'
import { stateWith } from '@tests/fixtures/state'
import ReferenceDropdown from '@/features/annotations/components/fields/ReferenceDropdown'
import WithDropdown from '@/features/annotations/components/fields/WithDropdown'

vi.mock('@/features/search/slices/lookupApiSlice', () => ({
  useLazyGetPubmedInfoQuery: () => [vi.fn(), { data: undefined, isFetching: false }],
}))

const anchor = () => {
  const el = document.createElement('button')
  // jsdom lays nothing out; AnchoredPopover stays hidden for a 0×0 anchor.
  el.getBoundingClientRect = () =>
    ({ x: 10, y: 10, top: 10, left: 10, right: 30, bottom: 30, width: 20, height: 20 }) as DOMRect
  return document.body.appendChild(el)
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ReferenceDropdown', () => {
  it('saves DB:accession on Enter', async () => {
    const onSave = vi.fn()
    const { user } = renderWithProviders(
      <ReferenceDropdown anchorEl={anchor()} onClose={vi.fn()} onSave={onSave} />,
      { preloadedState: stateWith() }
    )
    await user.type(screen.getByPlaceholderText('Accession'), '424242{Enter}')
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith('PMID:424242'))
  })

  it('picks a highlighted suggestion on Enter instead of saving the typed part', async () => {
    const onSave = vi.fn()
    const { user } = renderWithProviders(
      <ReferenceDropdown anchorEl={anchor()} onClose={vi.fn()} onSave={onSave} />,
      { preloadedState: stateWith() }
    )
    const box = screen.getByPlaceholderText('Accession')
    // The SAE model's references include PMID:222 — type part of it, pick it.
    await user.type(box, '22')
    await user.keyboard('{ArrowDown}{Enter}')
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(onSave).not.toHaveBeenCalled()
    expect(box).toHaveValue('222')
    await user.keyboard('{Enter}')
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith('PMID:222'))
  })

  it('requires an accession', async () => {
    const onSave = vi.fn()
    const { user } = renderWithProviders(
      <ReferenceDropdown anchorEl={anchor()} onClose={vi.fn()} onSave={onSave} />,
      { preloadedState: stateWith() }
    )
    await user.type(screen.getByPlaceholderText('Accession'), '{Enter}')
    expect(await screen.findByText('PMID accession is required')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('opens blank for a reference DB it does not offer', () => {
    renderWithProviders(
      <ReferenceDropdown
        anchorEl={anchor()}
        currentValue="WB:WBPaper00001234"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
      { preloadedState: stateWith() }
    )
    expect(screen.getByPlaceholderText('Accession')).toHaveValue('')
  })
})

describe('WithDropdown', () => {
  it('blocks a save with an accession but no database, and says why', async () => {
    const onSave = vi.fn()
    const { user } = renderWithProviders(
      <WithDropdown anchorEl={anchor()} currentValue="" onClose={vi.fn()} onSave={onSave} />,
      { preloadedState: stateWith() }
    )
    await user.type(screen.getByPlaceholderText('Accession'), 'P12345')
    await user.click(screen.getByRole('button', { name: 'Ok' }))
    expect(
      await screen.findByText('Please select a database for the accession value "P12345"')
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('saves complete entries', async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const { user } = renderWithProviders(
      <WithDropdown
        anchorEl={anchor()}
        currentValue="uniprotkb:P1"
        onClose={onClose}
        onSave={onSave}
      />,
      { preloadedState: stateWith() }
    )
    await user.click(screen.getByRole('button', { name: 'Ok' }))
    expect(onSave).toHaveBeenCalledWith('UniProtKB:P1')
    expect(onClose).toHaveBeenCalled()
  })
})
