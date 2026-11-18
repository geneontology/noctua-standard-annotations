import type React from 'react'
import { Button } from '@mantine/core'
import { useAppDispatch } from '@/app/hooks'
import { closeDialog } from '@/@noctua.core/components/dialog/dialogSlice'

interface ModelFormActionsProps {
  /** Logged out: Close only. */
  canEdit: boolean
  onSave: () => void
  saveDisabled: boolean
  isSaving: boolean
}

/** The Cancel/Save footer of the model forms. */
const ModelFormActions: React.FC<ModelFormActionsProps> = ({
  canEdit,
  onSave,
  saveDisabled,
  isSaving,
}) => {
  const dispatch = useAppDispatch()
  return (
    <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
      <Button variant="outline" size="sm" onClick={() => dispatch(closeDialog())}>
        {canEdit ? 'Cancel' : 'Close'}
      </Button>
      {canEdit && (
        <Button variant="filled" size="sm" onClick={onSave} disabled={saveDisabled || isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      )}
    </div>
  )
}

export default ModelFormActions
