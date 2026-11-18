import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/test-utils'
import AddReferencesDialog from '@/features/annotations/components/dialogs/AddReferencesDialog'

// Stand in for the PubMed esummary lookup.
const lookup = vi.hoisted(() => ({ trigger: vi.fn() }))
vi.mock('@/features/search/slices/lookupApiSlice', () => ({
  useLazyGetPubmedSummariesQuery: () => [lookup.trigger, { isFetching: false }],
}))

beforeEach(() => lookup.trigger.mockReset())

describe('AddReferencesDialog', () => {
  it('looks up pasted PMIDs and saves the ones found and not yet cited', async () => {
    lookup.trigger.mockResolvedValue({
      data: {
        '100': { title: 'Kinase paper', authors: 'Curie M', date: '2020' },
        '200': null,
        '111': { title: 'Cited', authors: '', date: '' },
      },
    })
    const onSave = vi.fn()
    const { user } = renderWithProviders(
      <AddReferencesDialog open onClose={vi.fn()} citedSources={['PMID:111']} onSave={onSave} />
    )

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await user.type(screen.getByLabelText('PMIDs (max 50)'), 'PMID:100\n200, 111 GO_REF:1')
    await user.click(screen.getByRole('button', { name: 'Load References' }))

    expect(lookup.trigger).toHaveBeenCalledWith(['100', '200', '111'])
    expect(await screen.findByRole('tab', { name: 'Found (1)' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Not Found (2)' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Already Cited (1)' })).toBeInTheDocument()
    expect(screen.getByText('Kinase paper')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'PMID:100' })).toHaveAttribute(
      'href',
      expect.stringContaining('/100')
    )

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(['PMID:100']))
  })

  it('refuses more than 50 PMIDs', async () => {
    const { user, store } = renderWithProviders(
      <AddReferencesDialog open onClose={vi.fn()} citedSources={[]} onSave={vi.fn()} />
    )
    fireEvent.change(screen.getByLabelText('PMIDs (max 50)'), {
      target: { value: Array.from({ length: 51 }, (_, i) => i + 1).join('\n') },
    })
    await user.click(screen.getByRole('button', { name: 'Load References' }))
    expect(store.getState().toast.message).toBe(
      'Too many references to search. Please enter at most 50 PMIDs.'
    )
    expect(lookup.trigger).not.toHaveBeenCalled()
  })

  it('reports a failed PubMed lookup', async () => {
    lookup.trigger.mockResolvedValue({ error: { status: 500 } })
    const { user, store } = renderWithProviders(
      <AddReferencesDialog open onClose={vi.fn()} citedSources={[]} onSave={vi.fn()} />
    )
    await user.type(screen.getByLabelText('PMIDs (max 50)'), '100')
    await user.click(screen.getByRole('button', { name: 'Load References' }))
    expect(store.getState().toast).toMatchObject({
      message: 'PubMed lookup failed. Please try again.',
      severity: 'error',
    })
  })
})
