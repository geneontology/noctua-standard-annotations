import type { GOlrResponse } from '@/features/search/models/search'

/**
 * Options the stand-in offers, keyed by the autocomplete's `name` (or a name
 * prefix such as `evidenceCode`). Tests fill this before rendering.
 */
export const autocompleteOptions: Record<string, GOlrResponse[]> = {}

export const resetAutocompleteOptions = () => {
  for (const key of Object.keys(autocompleteOptions)) delete autocompleteOptions[key]
}

const optionsFor = (name: string): GOlrResponse[] => {
  if (autocompleteOptions[name]) return autocompleteOptions[name]
  const prefix = Object.keys(autocompleteOptions).find(key => name.startsWith(key))
  return prefix ? autocompleteOptions[prefix] : []
}

interface Props {
  label: string
  name: string
  value: GOlrResponse | string | null
  onChange: (value: GOlrResponse | null) => void
  rootTypeIds?: string[]
  excludeIdspaces?: string[]
}

/**
 * Stand-in for `features/search/components/Autocomplete`: shows the current
 * value and the search filter, and offers one "pick" button per option.
 * Use with `vi.mock('@/features/search/components/Autocomplete', () => import('@tests/mocks/autocompleteMock'))`.
 */
const AutocompleteMock = ({ label, name, value, onChange, rootTypeIds, excludeIdspaces }: Props) => {
  const current = value && typeof value === 'object' ? value : null
  return (
    <div data-testid={`autocomplete-${name}`}>
      <span>{label}</span>
      <span data-testid={`autocomplete-value-${name}`}>{current?.id ?? ''}</span>
      <span data-testid={`autocomplete-range-${name}`}>{JSON.stringify(rootTypeIds ?? [])}</span>
      <span data-testid={`autocomplete-idspaces-${name}`}>
        {JSON.stringify(excludeIdspaces ?? [])}
      </span>
      {optionsFor(name).map(option => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option)}
          data-testid={`pick-${name}-${option.id}`}
        >
          pick {option.label}
        </button>
      ))}
      <button type="button" onClick={() => onChange(null)} data-testid={`clear-${name}`}>
        clear
      </button>
    </div>
  )
}

export default AutocompleteMock
