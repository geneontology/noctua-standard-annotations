import type React from 'react'
import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react'
import { Portal } from '@mantine/core'
import { FaFileMedical } from 'react-icons/fa'
import FloatingTextarea from '@/@noctua.core/components/textarea/FloatingTextarea'
import ReferenceDropdown from './ReferenceDropdown'
import WithDropdown from './WithDropdown'
import { useAppSelector } from '@/app/hooks'
import { selectModelReferences, selectModelWiths } from '@/features/gocam/slices/camSlice'
import { BLUR_CLOSE_DELAY_MS } from '@/@noctua.core/data/uiConstants'

interface DatabaseFieldProps {
  value: string
  onChange: (value: string) => void
  type: 'reference' | 'with'
}

const DatabaseField: React.FC<DatabaseFieldProps> = ({ value, onChange, type }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const anchorRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  const Dropdown = type === 'reference' ? ReferenceDropdown : WithDropdown
  const label = type === 'reference' ? 'Reference' : 'With/From'

  const modelReferences = useAppSelector(selectModelReferences)
  const modelWiths = useAppSelector(selectModelWiths)
  const suggestions = type === 'reference' ? modelReferences : modelWiths

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase()
    const seen = new Set<string>()
    const out: string[] = []
    for (const s of suggestions) {
      if (!s || seen.has(s)) continue
      if (q && !s.toLowerCase().includes(q)) continue
      seen.add(s)
      out.push(s)
    }
    return out
  }, [suggestions, value])

  useEffect(() => {
    if (!open) setHighlightedIndex(-1)
  }, [open])

  // Track the anchor's viewport rect so the portaled suggestion list can
  // position itself with fixed coordinates and escape the Annotation dialog's
  // overflow-clipped scroll containers. Recompute on scroll/resize.
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.max(rect.width, 400)
      const left = Math.min(rect.left, window.innerWidth - width - 4)
      setDropdownPos({ top: rect.bottom, left: Math.max(4, left), width })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  const handleSelect = (val: string) => {
    onChange(val)
    setOpen(false)
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1))
        break
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          e.preventDefault()
          handleSelect(filtered[highlightedIndex])
        }
        break
      case 'Escape':
        setOpen(false)
        break
    }
  }

  return (
    <>
      <div ref={anchorRef} className="w-full" onKeyDown={handleKeyDown}>
        <FloatingTextarea
          size="xs"
          label={label}
          value={value}
          onChange={e => {
            onChange(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={e => {
            setTimeout(() => setOpen(false), BLUR_CLOSE_DELAY_MS)
            const trimmed = e.target.value.trim()
            if (trimmed !== e.target.value) onChange(trimmed)
          }}
          rows={2}
          aria-expanded={open && filtered.length > 0}
          rightSection={
            <button
              type="button"
              aria-label={type === 'reference' ? 'Pick a reference' : 'Pick with/from'}
              title={type === 'reference' ? 'Pick a reference' : 'Pick with/from'}
              onMouseDown={e => e.preventDefault()}
              onClick={e => {
                e.stopPropagation()
                setAnchorEl(e.currentTarget)
              }}
              className="self-end rounded-full p-1 hover:bg-gray-100"
            >
              <FaFileMedical size={14} />
            </button>
          }
        />

        {open && filtered.length > 0 && dropdownPos && (
          <Portal>
            <div
              className="max-h-60 overflow-y-auto rounded-md !bg-accent-50 bg-white shadow-lg"
              style={{
                position: 'fixed',
                top: dropdownPos.top + 4,
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 1300,
              }}
            >
              {filtered.map((option, index) => (
                <div
                  key={option}
                  className={`flex min-h-[40px] cursor-pointer items-center border-b border-primary-100 bg-accent-50 px-4 py-2 text-xs hover:bg-primary-50 ${index === highlightedIndex ? 'bg-primary-100' : ''}`}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="min-w-0 shrink font-normal">{option}</div>
                </div>
              ))}
            </div>
          </Portal>
        )}
      </div>

      <Dropdown
        anchorEl={anchorEl}
        currentValue={value}
        onClose={() => setAnchorEl(null)}
        onSave={val => onChange(val)}
      />
    </>
  )
}

export default DatabaseField
