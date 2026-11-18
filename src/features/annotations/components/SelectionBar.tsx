import type React from 'react'
import { Button, Tooltip } from '@mantine/core'
import { FaRegTrashAlt } from 'react-icons/fa'
import { MAX_BULK_DELETE } from '../data/selectionLimits'

interface SelectionBarProps {
  count: number
  onDelete: () => void
  onClear: () => void
}

/**
 * "N selected" with Delete and Clear, while rows are ticked (#96, after the VPE's
 * selection pill). Past the cap it turns red and Delete is disabled.
 */
const SelectionBar: React.FC<SelectionBarProps> = ({ count, onDelete, onClear }) => {
  const overLimit = count > MAX_BULK_DELETE
  return (
    <div
      role="toolbar"
      aria-label="Selected annotations"
      className={`ml-auto flex h-8 items-center gap-1 rounded-full p-0.5 pl-3 ${
        overLimit ? 'bg-red-50' : 'bg-blue-50'
      }`}
    >
      <span
        className={`mr-1 text-xs font-semibold whitespace-nowrap ${
          overLimit ? 'text-red-700' : 'text-blue-900'
        }`}
      >
        {count} selected{overLimit && ` — max ${MAX_BULK_DELETE}`}
      </span>
      <Tooltip
        label={
          overLimit ? `Select ${MAX_BULK_DELETE} or fewer to delete` : 'Delete selected annotations'
        }
      >
        {/* A disabled button fires no hover events; the span keeps the tooltip. */}
        <span>
          <Button
            size="compact-xs"
            color="red"
            variant="subtle"
            radius="xl"
            leftSection={<FaRegTrashAlt size={11} />}
            disabled={overLimit}
            onClick={onDelete}
          >
            Delete
          </Button>
        </span>
      </Tooltip>
      <Button size="compact-xs" color="gray" variant="subtle" radius="xl" onClick={onClear}>
        Clear
      </Button>
    </div>
  )
}

export default SelectionBar
