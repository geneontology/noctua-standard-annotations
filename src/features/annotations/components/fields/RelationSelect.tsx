import type React from 'react'
import { useMemo } from 'react'
import { Select } from '@mantine/core'
import type { Entity } from '@/features/gocam/models/cam'

interface RelationSelectProps {
  label: string
  value: Entity | null
  choices: Entity[]
  onChange: (value: Entity | null) => void
  /** Show a clear (×) control, the Angular "Clear" / "None" option. */
  clearable?: boolean
  disabled?: boolean
  name?: string
}

/** A relation picker that shows each relation's label with its RO/BFO id. */
const RelationSelect: React.FC<RelationSelectProps> = ({
  label,
  value,
  choices,
  onChange,
  clearable = false,
  disabled = false,
  name,
}) => {
  // Keep the current relation selectable even if the rules no longer list it.
  const options = useMemo(() => {
    const list = [...choices]
    if (value?.id && !list.some(choice => choice.id === value.id)) list.unshift(value)
    return list
  }, [choices, value])

  const byId = useMemo(() => new Map(options.map(option => [option.id, option])), [options])

  return (
    <Select
      label={label}
      size="xs"
      value={value?.id ?? null}
      data={options.map(option => ({ value: option.id, label: option.label || option.id }))}
      onChange={id => onChange(id ? (byId.get(id) ?? null) : null)}
      clearable={clearable}
      allowDeselect={clearable}
      disabled={disabled}
      placeholder={choices.length === 0 ? 'No relation applies' : undefined}
      data-pw={name ? `form-input-${name}` : undefined}
      renderOption={({ option }) => (
        <div className="flex w-full items-center gap-2 text-xs">
          <span className="grow">{option.label}</span>
          <span className="shrink-0 text-2xs text-gray-500">{option.value}</span>
        </div>
      )}
      comboboxProps={{ withinPortal: true, zIndex: 1300 }}
    />
  )
}

export default RelationSelect
