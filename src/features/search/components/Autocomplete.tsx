import type React from 'react'
import type { KeyboardEvent } from 'react'
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { FiFile } from 'react-icons/fi'
import { useSearchTermsQuery } from '../slices/lookupApiSlice'
import type { GOlrResponse } from '../models/search'
import { AutocompleteType } from '../models/search'
import { Loader, Portal } from '@mantine/core'
import FloatingTextarea from '@/@noctua.core/components/textarea/FloatingTextarea'
import {
  DEBOUNCE_MS,
  BLUR_CLOSE_DELAY_MS,
  MIN_SEARCH_LENGTH,
} from '@/@noctua.core/data/uiConstants'

interface TermAutocompleteProps {
  label: string
  name: string
  rootTypeIds?: string[]
  excludeRootTypeIds?: string[]
  /** GOlr `idspace`s to leave out (e.g. `GO` so a gene-product search skips GO complexes). */
  excludeIdspaces?: string[]
  autocompleteType?: AutocompleteType
  value: GOlrResponse | null | string
  onChange: (value: GOlrResponse | null | string) => void
  onBlur?: () => void
  disabled?: boolean
  variant?: 'standard' | 'outlined' | 'filled'
  onOpenTermDetails?: (event: React.MouseEvent, item: GOlrResponse) => void
  /** Pre-populated options shown on focus before the user types (e.g. terms already used in the model) */
  initialOptions?: GOlrResponse[]
}

const formatSelected = (option: { id?: string; label?: string }): string =>
  option.id ? `${option.label ?? option.id} (${option.id})` : (option.label ?? '')

const TermAutocomplete: React.FC<TermAutocompleteProps> = ({
  label = '',
  name,
  rootTypeIds = [],
  excludeRootTypeIds,
  excludeIdspaces,
  autocompleteType = AutocompleteType.TERM,
  value,
  onChange,
  onBlur,
  disabled = false,
  onOpenTermDetails,
  initialOptions = [],
}) => {
  const [inputValue, setInputValue] = useState<string>('')
  const [open, setOpen] = useState<boolean>(false)
  const [options, setOptions] = useState<GOlrResponse[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('')
  const anchorRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  // Set when typing clears the selection, so the value→input sync below doesn't
  // wipe the text the user is in the middle of typing.
  const clearedByTyping = useRef(false)
  // Only text the user typed is searched — not a pre-filled value (e.g. the
  // current term when an inline editor opens).
  const typed = useRef(false)
  const [dropdownPos, setDropdownPos] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  const useAutocomplete =
    autocompleteType === AutocompleteType.TERM ||
    autocompleteType === AutocompleteType.EVIDENCE_CODE

  // An empty range means "nothing can go here yet" (e.g. the GO term before a gene
  // product is chosen), so there is nothing to search.
  const hasRange = rootTypeIds.length > 0

  const { data, isLoading, isFetching } = useSearchTermsQuery(
    {
      searchText: debouncedSearchTerm,
      closureIds: rootTypeIds,
      excludeClosureIds: excludeRootTypeIds,
      excludeIdspaces,
    },
    {
      skip:
        !useAutocomplete ||
        !hasRange ||
        !debouncedSearchTerm ||
        debouncedSearchTerm.length < MIN_SEARCH_LENGTH,
      selectFromResult: ({ data, isLoading, isFetching }) => ({
        data: data || [],
        isLoading,
        isFetching,
      }),
    }
  )

  const searching = isLoading || isFetching

  useEffect(() => {
    if (useAutocomplete && data && data.length > 0) {
      setOptions(data)
      setHighlightedIndex(-1)
    }
  }, [data, useAutocomplete])

  // Clear stale remote options when search becomes inactive so prelookups can show again
  useEffect(() => {
    if (!debouncedSearchTerm || debouncedSearchTerm.length < MIN_SEARCH_LENGTH) {
      setOptions(prev => (prev.length === 0 ? prev : []))
      setHighlightedIndex(prev => (prev === -1 ? prev : -1))
    }
  }, [debouncedSearchTerm])

  // Show initialOptions (prelookups) whenever no remote results are loaded
  const showInitial = open && options.length === 0 && !searching
  const displayOptions = showInitial ? initialOptions : options

  // Track the anchor's viewport rect so the portaled dropdown can position
  // itself with fixed coordinates. Recompute on scroll/resize.
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      setDropdownPos({ top: rect.bottom, left: rect.left, width: Math.max(rect.width, 400) })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  useEffect(() => {
    if (!useAutocomplete) return
    if (!typed.current) {
      setDebouncedSearchTerm('')
      return
    }

    const handler = setTimeout(() => {
      setDebouncedSearchTerm(inputValue)
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(handler)
    }
  }, [inputValue, useAutocomplete])

  // Sync inputValue with external value prop (e.g., when the form is reset or filled)
  useEffect(() => {
    if (clearedByTyping.current) {
      clearedByTyping.current = false
      return
    }
    typed.current = false
    if (value && typeof value === 'object' && (value.label || value.id)) {
      setInputValue(formatSelected(value))
    } else if (typeof value === 'string') {
      setInputValue(value)
    } else if (value === null) {
      setInputValue('')
    }
  }, [value])

  useEffect(() => {
    if (!open) {
      setOptions([])
      setHighlightedIndex(-1)
    }
  }, [open])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setHighlightedIndex(prev => (prev < displayOptions.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        event.preventDefault()
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : displayOptions.length - 1))
        break
      case 'Enter':
        event.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < displayOptions.length) {
          const option = displayOptions[highlightedIndex]
          if (!isDisabled(option)) handleOptionSelect(option)
        }
        break
      case 'Escape':
        setOpen(false)
        break
    }
  }

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const element = listRef.current.children[highlightedIndex] as HTMLElement
      element?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex])

  const handleOptionSelect = (option: GOlrResponse) => {
    typed.current = false
    onChange(option)
    setInputValue(formatSelected(option))
    setOpen(false)
    setHighlightedIndex(-1)
  }

  const handleTyping = (text: string) => {
    typed.current = true
    setInputValue(text)
    if (!open) setOpen(true)
    // Editing the text abandons the previous pick, as the Angular form control did.
    if (value && typeof value === 'object') {
      clearedByTyping.current = true
      onChange(null)
    }
  }

  const hint = !hasRange
    ? 'No terms can be searched here yet'
    : inputValue.length < MIN_SEARCH_LENGTH
      ? `Type at least ${MIN_SEARCH_LENGTH} characters to search`
      : 'No results found'

  return (
    <div className="w-full">
      <div
        ref={anchorRef}
        onKeyDown={handleKeyDown}
        onMouseDown={() => useAutocomplete && !disabled && setOpen(true)}
      >
        <FloatingTextarea
          id={`autocomplete-${name}`}
          name={name}
          label={label}
          size="xs"
          value={inputValue}
          onChange={e => handleTyping(e.target.value)}
          onFocus={() => useAutocomplete && setOpen(true)}
          onBlur={() => {
            setTimeout(() => setOpen(false), BLUR_CLOSE_DELAY_MS)
            onBlur?.()
          }}
          disabled={disabled}
          rows={2}
          rightSection={searching ? <Loader size={20} /> : null}
          data-pw={`form-input-${name}`}
        />
      </div>

      {open && dropdownPos && (
        <Portal>
          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto rounded-md !bg-accent-50 bg-white shadow-lg"
            style={{
              position: 'fixed',
              top: dropdownPos.top + 4,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 1300,
            }}
          >
            {!searching && displayOptions.length === 0 && (
              <div className="p-4 text-center text-xs text-gray-500">{hint}</div>
            )}

            {displayOptions.map((option, index) => {
              const doNotAnnotate = option.notAnnotatable === false
              const disabledOption = isDisabled(option)
              const bgClass = doNotAnnotate
                ? 'bg-red-200'
                : index === highlightedIndex
                  ? 'bg-primary-100'
                  : 'bg-accent-50 hover:bg-primary-50'
              return (
                <div
                  key={option.id}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  aria-disabled={disabledOption}
                  className={`flex min-h-[40px] cursor-pointer items-center border-b border-primary-100 px-4 py-2 text-xs ${bgClass} ${disabledOption ? 'pointer-events-none' : ''} ${option.isObsolete ? 'line-through opacity-40' : ''}`}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => !disabledOption && handleOptionSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  title={doNotAnnotate ? 'Do not annotate' : undefined}
                >
                  <div className="min-w-0 shrink font-normal">{option.label}</div>
                  <span className="grow" />
                  {autocompleteType === AutocompleteType.EVIDENCE_CODE && option.xref && (
                    <div className="ml-2 shrink-0 font-bold">{option.xref}</div>
                  )}
                  <div className="ml-2 shrink-0 text-2xs text-black/60">
                    {option.link ? (
                      <a
                        href={option.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center hover:text-blue-500"
                      >
                        {option.id}
                      </a>
                    ) : (
                      <span>{option.id}</span>
                    )}
                  </div>

                  {onOpenTermDetails && (
                    <button
                      className="ml-2 shrink-0 rounded-full border p-1 hover:bg-gray-200"
                      onClick={e => {
                        e.stopPropagation()
                        onOpenTermDetails(e, option)
                      }}
                    >
                      <FiFile className="ml-1" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </Portal>
      )}
    </div>
  )
}

const isDisabled = (option: GOlrResponse) => option.isObsolete || option.notAnnotatable === false

export default TermAutocomplete
