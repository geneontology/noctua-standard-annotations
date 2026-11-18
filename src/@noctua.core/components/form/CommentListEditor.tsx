import type React from 'react'
import { ActionIcon, Button, Textarea } from '@mantine/core'
import { FaRegTrashAlt } from 'react-icons/fa'

export interface CommentItem {
  uid: string
  text: string
}

interface CommentListEditorProps {
  comments: CommentItem[]
  onChange: (comments: CommentItem[]) => void
  /** Creates a new, empty item (with its own uid). */
  createItem: () => CommentItem
  readOnly?: boolean
  label?: string
}

/** A list of free-text comments with Add and per-row delete. */
const CommentListEditor: React.FC<CommentListEditorProps> = ({
  comments,
  onChange,
  createItem,
  readOnly = false,
  label = 'Comment',
}) => (
  <div className="flex flex-col gap-3">
    {comments.length === 0 && (
      <div className="py-4 text-center text-sm italic text-gray-500">No comments yet</div>
    )}
    {comments.map(comment => (
      <div key={comment.uid} className="flex items-start gap-2">
        <Textarea
          className="flex-1"
          label={label}
          value={comment.text}
          readOnly={readOnly}
          autosize
          minRows={2}
          maxRows={8}
          onChange={e =>
            onChange(comments.map(c => (c.uid === comment.uid ? { ...c, text: e.target.value } : c)))
          }
        />
        {!readOnly && (
          <ActionIcon
            variant="subtle"
            color="red"
            className="mt-6"
            aria-label="Delete comment"
            onClick={() => onChange(comments.filter(c => c.uid !== comment.uid))}
          >
            <FaRegTrashAlt size={14} />
          </ActionIcon>
        )}
      </div>
    ))}
    {!readOnly && (
      <div>
        <Button variant="subtle" onClick={() => onChange([...comments, createItem()])}>
          Add {comments.length > 0 ? 'Another ' : ''}Comment
        </Button>
      </div>
    )}
  </div>
)

export default CommentListEditor
