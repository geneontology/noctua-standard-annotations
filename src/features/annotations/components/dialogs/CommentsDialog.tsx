import type React from 'react'
import { useEffect, useState } from 'react'
import { Button } from '@mantine/core'
import { v4 as uuidv4 } from 'uuid'
import SimpleDialog from '@/@noctua.core/components/dialog/SimpleDialog'
import CommentListEditor from '@/@noctua.core/components/form/CommentListEditor'
import type { CommentItem } from '@/@noctua.core/components/form/CommentListEditor'

interface CommentsDialogProps {
  open: boolean
  comments: string[]
  onClose: () => void
  /** Receives the edited list; the dialog stays open until the caller closes it. */
  onSave: (comments: string[]) => void | Promise<void>
}

/** Edit an annotation's comments as a list (Angular `CommentsDialogComponent`). */
const CommentsDialog: React.FC<CommentsDialogProps> = ({ open, comments, onClose, onSave }) => {
  const [items, setItems] = useState<CommentItem[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setItems(comments.map(text => ({ uid: uuidv4(), text })))
  }, [open, comments])

  const save = async () => {
    setSaving(true)
    try {
      await onSave(items.map(item => item.text))
    } finally {
      setSaving(false)
    }
  }

  return (
    <SimpleDialog open={open} onClose={onClose} title="Comments" size="sm">
      <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
        <CommentListEditor
          comments={items}
          onChange={setItems}
          createItem={() => ({ uid: uuidv4(), text: '' })}
        />
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="filled" onClick={save} loading={saving}>
          Save
        </Button>
      </div>
    </SimpleDialog>
  )
}

export default CommentsDialog
