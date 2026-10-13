import { describe, it, expect, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/test-utils'
import { termOption } from '@/features/annotations/models/annotationForm'
import AddGenesDialog from '@/features/annotations/components/dialogs/AddGenesDialog'

// GOlr lookups are JSONP <script> loads; stand in for the lazy query.
const lookup = vi.hoisted(() => ({ trigger: vi.fn() }))
vi.mock('@/features/search/slices/lookupApiSlice', () => ({
  useLazyGetGenesDetailsQuery: () => [lookup.trigger, { isFetching: false }],
}))

describe('AddGenesDialog', () => {
  it('looks up pasted ids and saves the matched genes', async () => {
    lookup.trigger.mockResolvedValue({
      data: [termOption('UniProtKB:Q9P258', 'RCC2 Hsap'), termOption('WB:WBGene00000001', '')],
    })
    const onSave = vi.fn()
    const { user } = renderWithProviders(
      <AddGenesDialog open onClose={vi.fn()} onSave={onSave} />
    )

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await user.type(
      screen.getByLabelText('Gene Ids (max 150)'),
      'UniProtKB:Q9P258, WB:WBGene00000001\nMGI:MGI:0000001'
    )
    await user.click(screen.getByRole('button', { name: 'Load Genes' }))

    expect(lookup.trigger).toHaveBeenCalledWith([
      'UniProtKB:Q9P258',
      'WB:WBGene00000001',
      'MGI:MGI:0000001',
    ])
    expect(await screen.findByRole('tab', { name: 'Matched (1)' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Unmatched (1)' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Not Found (1)' })).toBeInTheDocument()
    expect(screen.getByText('RCC2 Hsap')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith([{ id: 'UniProtKB:Q9P258', label: 'RCC2 Hsap' }])
    )
  })

  it('refuses more than 150 ids', async () => {
    const ids = Array.from({ length: 151 }, (_, i) => `UniProtKB:P${String(i).padStart(5, '0')}`)
    const { user, store } = renderWithProviders(
      <AddGenesDialog open onClose={vi.fn()} onSave={vi.fn()} />
    )
    fireEvent.change(screen.getByLabelText('Gene Ids (max 150)'), {
      target: { value: ids.join('\n') },
    })
    await user.click(screen.getByRole('button', { name: 'Load Genes' }))
    expect(store.getState().toast.message).toBe(
      'Too many genes to search. Please enter less than 150 genes.'
    )
    expect(lookup.trigger).not.toHaveBeenCalled()
  })
})
