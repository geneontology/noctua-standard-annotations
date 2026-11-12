import type React from 'react'
import { useMemo, useState } from 'react'
import { Select } from '@mantine/core'
import type { SelectProps } from '@mantine/core'
import classes from './FloatingTextarea.module.css'

type FloatingSelectProps = Omit<SelectProps, 'classNames'>

/** The label of the selected option, from flat `{ value, label }` or string data. */
const selectedLabel = (data: SelectProps['data'], value: string | null | undefined) => {
  if (!value || !Array.isArray(data)) return ''
  for (const item of data) {
    if (typeof item === 'string') {
      if (item === value) return item
    } else if ('value' in item && item.value === value) {
      return item.label
    }
  }
  return value
}

/**
 * A Select with the same floating label and outline as `FloatingTextarea`. Its
 * input can't wrap, so the chosen label is shown over it across two lines.
 */
const FloatingSelect: React.FC<FloatingSelectProps> = ({ value, onFocus, onBlur, ...props }) => {
  const [focused, setFocused] = useState(false)
  const floating = focused || !!value || !!props.placeholder
  const display = useMemo(() => selectedLabel(props.data, value), [props.data, value])

  return (
    <div className={classes.wrap} data-floating={floating ? 'true' : 'false'}>
      <Select
        {...props}
        value={value}
        onFocus={e => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={e => {
          setFocused(false)
          onBlur?.(e)
        }}
        classNames={{ label: classes.label, input: classes.selectInput }}
        styles={display ? { input: { color: 'transparent' } } : undefined}
      />
      {display && (
        <div className={classes.selectValue} title={display} aria-hidden>
          {display}
        </div>
      )}
    </div>
  )
}

export default FloatingSelect
