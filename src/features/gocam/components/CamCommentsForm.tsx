import type React from 'react'
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useAppSelector } from '@/app/hooks'
import { selectCamModel } from '@/features/gocam/slices/camSlice'
import { selectAuthUser } from '@/features/auth/slices/authSlice'
import CommentListEditor from '@/@noctua.core/components/form/CommentListEditor'
import type { CommentItem } from '@/@noctua.core/components/form/CommentListEditor'
import { buildSaveModelCommentsOperations } from '../services/modelOperations'
import { useSaveModelAnnotations } from '../hooks/useSaveModelAnnotations'
import ModelFormActions from './ModelFormActions'

const newItem = (text = ''): CommentItem => ({ uid: uuidv4(), text })

/** Model Comments (#94): the model's own comments only. Read-only when logged out. */
const CamCommentsForm: React.FC = () => {
  const cam = useAppSelector(selectCamModel)
  const isLoggedIn = !!useAppSelector(selectAuthUser)
  const { save, isSaving } = useSaveModelAnnotations('Model comments successfully updated.')
  const [comments, setComments] = useState<CommentItem[]>(() =>
    (cam?.comments ?? []).map(text => newItem(text))
  )

  if (!cam) return null

  const onSave = () =>
    save(
      buildSaveModelCommentsOperations(
        cam.id,
        cam.comments,
        comments.map(c => c.text)
      )
    )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <CommentListEditor
          comments={comments}
          onChange={setComments}
          createItem={() => newItem()}
          readOnly={!isLoggedIn}
        />
      </div>
      <ModelFormActions
        canEdit={isLoggedIn}
        onSave={onSave}
        saveDisabled={false}
        isSaving={isSaving}
      />
    </div>
  )
}

export default CamCommentsForm
