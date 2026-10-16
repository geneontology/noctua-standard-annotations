import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { ActionIcon, Button } from '@mantine/core'
import { FaPen } from 'react-icons/fa'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { setRightDrawerOpen } from '@/@noctua.core/components/drawer/drawerSlice'
import { formatDate } from '@/@noctua.core/services/dateUtils'
import { selectAuthUser } from '@/features/auth/slices/authSlice'
import type { StandardAnnotation } from '../models/annotation'
import {
  selectCommentAnnotation,
  selectSelectedCommentAnnotationId,
  selectSortedAnnotations,
} from '../slices/annotationsSlice'
import { useAnnotationActions } from '../hooks/useAnnotationActions'
import CommentsDialog from './dialogs/CommentsDialog'

/**
 * Every annotation's comments, in table order (Angular comments sidenav). The
 * annotation picked from the table is highlighted and scrolled into view.
 */
const CommentsPanel: React.FC = () => {
  const dispatch = useAppDispatch()
  const isLoggedIn = !!useAppSelector(selectAuthUser)
  const annotations = useAppSelector(selectSortedAnnotations)
  const selectedId = useAppSelector(selectSelectedCommentAnnotationId)
  const actions = useAnnotationActions()
  const [editing, setEditing] = useState<StandardAnnotation | null>(null)
  const selectedRef = useRef<HTMLDivElement>(null)

  const withComments = annotations.filter(annotation => annotation.comments.length > 0)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId])

  const close = () => dispatch(setRightDrawerOpen(false))

  return (
    <div className="flex h-full flex-col bg-gray-100" data-testid="comments-panel">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white p-4">
        <h2 className="text-xl font-semibold">Comments</h2>
        <Button variant="subtle" color="gray" onClick={close}>
          Close
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {withComments.length === 0 && (
          <div className="py-8 text-center text-sm italic text-gray-500">
            No annotation has comments yet
          </div>
        )}
        {withComments.map(annotation => {
          const selected = annotation.uid === selectedId
          return (
            <div
              key={annotation.uid}
              ref={selected ? selectedRef : undefined}
              data-testid="comments-box"
              data-selected={selected}
              className={`mb-4 rounded-lg border-2 p-2 ${selected ? 'border-accent-600 bg-accent-100' : 'border-transparent'}`}
            >
              <div className="mb-2 flex items-center gap-2 px-1 text-xs text-gray-600">
                <span className="truncate">
                  <strong>{annotation.gp.label}</strong>{' '}
                  {annotation.isComplement && 'NOT '}
                  {annotation.relation.label} <strong>{annotation.goTerm.label}</strong>
                </span>
                <span className="grow" />
                {isLoggedIn && (
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label="Edit comments"
                    onClick={() => setEditing(annotation)}
                  >
                    <FaPen size={12} />
                  </ActionIcon>
                )}
              </div>
              {annotation.comments.map(comment => (
                <div
                  key={comment}
                  role="button"
                  tabIndex={0}
                  onClick={() => dispatch(selectCommentAnnotation(annotation.uid))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') dispatch(selectCommentAnnotation(annotation.uid))
                  }}
                  className="mb-2 cursor-pointer rounded-lg bg-white p-3 shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  <div className="mb-1 text-xs text-gray-500">
                    {formatDate(annotation.evidence?.date ?? annotation.date)}
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-800">{comment}</p>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <footer className="flex justify-end border-t border-gray-200 bg-white p-4">
        <Button variant="filled" onClick={close}>
          Close
        </Button>
      </footer>

      <CommentsDialog
        open={editing !== null}
        comments={editing?.comments ?? []}
        onClose={() => setEditing(null)}
        onSave={async comments => {
          if (!editing) return
          const saved = await actions.replaceComments(editing, comments)
          if (saved) setEditing(null)
        }}
      />
    </div>
  )
}

export default CommentsPanel
