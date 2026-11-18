import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/test-utils'
import TermAutocomplete from '@/features/search/components/Autocomplete'
import { termOption } from '@/features/annotations/models/annotationForm'

const search = vi.hoisted(() => ({
  calls: [] as { args: { searchText: string }; skip: boolean }[],
  results: [] as unknown[],
  /** Results per search text, when a test needs them to differ. */
  byText: null as Record<string, unknown[]> | null,
  isError: false,
}))

vi.mock('@/features/search/slices/lookupApiSlice', () => ({
  useSearchTermsQuery: (args: { searchText: string }, options: { skip: boolean }) => {
    search.calls.push({ args, skip: options.skip })
    const results = search.byText ? search.byText[args.searchText] : search.results
    return {
      currentData: options.skip || search.isError ? undefined : results,
      isFetching: false,
      isError: !options.skip && search.isError,
    }
  },
}))

const activeSearches = () =>
  search.calls.filter(call => !call.skip).map(call => call.args.searchText)

beforeEach(() => {
  search.calls = []
  search.results = []
  search.byText = null
  search.isError = false
})

describe('TermAutocomplete', () => {
  it('does not search a pre-filled value', async () => {
    renderWithProviders(
      <TermAutocomplete
        label="GO Term"
        name="term"
        rootTypeIds={['GO:0003674']}
        value={termOption('GO:0004672', 'protein kinase activity')}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByRole('textbox', { name: 'GO Term' })).toHaveValue(
      'protein kinase activity (GO:0004672)'
    )
    await new Promise(resolve => setTimeout(resolve, 400))
    expect(activeSearches()).toEqual([])
  })

  it('searches what the user types and selects an option', async () => {
    search.results = [termOption('GO:0006915', 'apoptotic process')]
    const onChange = vi.fn()
    const { user } = renderWithProviders(
      <TermAutocomplete
        label="GO Term"
        name="term"
        rootTypeIds={['GO:0008150']}
        value={null}
        onChange={onChange}
      />
    )

    await user.type(screen.getByRole('textbox', { name: 'GO Term' }), 'apopt')
    await waitFor(() => expect(activeSearches()).toContain('apopt'))
    await user.click(await screen.findByRole('option', { name: /apoptotic process/ }))
    expect(onChange).toHaveBeenCalledWith(search.results[0])
  })

  it('clears the pick when the user edits the text', async () => {
    const onChange = vi.fn()
    const { user } = renderWithProviders(
      <TermAutocomplete
        label="GO Term"
        name="term"
        rootTypeIds={['GO:0003674']}
        value={termOption('GO:0004672', 'protein kinase activity')}
        onChange={onChange}
      />
    )
    await user.type(screen.getByRole('textbox', { name: 'GO Term' }), 'x')
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('never searches an empty range', async () => {
    const { user } = renderWithProviders(
      <TermAutocomplete
        label="GO Term"
        name="term"
        rootTypeIds={[]}
        value={null}
        onChange={vi.fn()}
      />
    )
    await user.type(screen.getByRole('textbox', { name: 'GO Term' }), 'apoptotic')
    await new Promise(resolve => setTimeout(resolve, 400))
    expect(activeSearches()).toEqual([])
    expect(screen.getByText('No terms can be searched here yet')).toBeInTheDocument()
  })

  it('shows no results for a search that finds nothing, not the previous list', async () => {
    search.byText = { kinase: [termOption('GO:0016301', 'kinase activity')], kinasexq: [] }
    const { user } = renderWithProviders(
      <TermAutocomplete
        label="GO Term"
        name="term"
        rootTypeIds={['GO:0003674']}
        value={null}
        onChange={vi.fn()}
      />
    )
    const box = screen.getByRole('textbox', { name: 'GO Term' })
    await user.type(box, 'kinase')
    expect(await screen.findByRole('option', { name: /kinase activity/ })).toBeInTheDocument()
    await user.type(box, 'xq')
    expect(await screen.findByText('No results found')).toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('says when the search failed', async () => {
    search.isError = true
    const { user } = renderWithProviders(
      <TermAutocomplete
        label="GO Term"
        name="term"
        rootTypeIds={['GO:0003674']}
        value={null}
        onChange={vi.fn()}
      />
    )
    await user.type(screen.getByRole('textbox', { name: 'GO Term' }), 'kinase')
    expect(await screen.findByText('The term search failed. Try again.')).toBeInTheDocument()
  })

  it('marks the input expanded while the list is open', async () => {
    const { user } = renderWithProviders(
      <TermAutocomplete
        label="GO Term"
        name="term"
        rootTypeIds={['GO:0003674']}
        value={null}
        onChange={vi.fn()}
      />
    )
    const box = screen.getByRole('textbox', { name: 'GO Term' })
    expect(box).toHaveAttribute('aria-expanded', 'false')
    await user.click(box)
    expect(box).toHaveAttribute('aria-expanded', 'true')
  })
})
