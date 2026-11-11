import type React from 'react'
import { useState } from 'react'
import { Textarea } from '@mantine/core'
import { useAppSelector } from '@/app/hooks'
import { selectCamModel } from '@/features/gocam/slices/camSlice'
import { selectAuthUser } from '@/features/auth/slices/authSlice'
import { buildSaveModelTitleOperations } from '../services/modelOperations'
import { useSaveModelAnnotations } from '../hooks/useSaveModelAnnotations'
import ModelFormActions from './ModelFormActions'

/** Edit Title, as in the VPE (#94): the model title only. */
const CamTitleForm: React.FC = () => {
  const cam = useAppSelector(selectCamModel)
  const isLoggedIn = !!useAppSelector(selectAuthUser)
  const { save, isSaving } = useSaveModelAnnotations('Model title successfully updated.')
  const [title, setTitle] = useState(cam?.title ?? '')

  if (!cam) return null

  const trimmed = title.trim()
  // Blank: Minerva can't store an untitled model. Unchanged: nothing to write.
  const unchanged = trimmed === cam.title && cam.titles.length === 1

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <Textarea
          label="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          readOnly={!isLoggedIn}
          size="sm"
          autosize
          minRows={3}
          maxRows={6}
        />
      </div>
      <ModelFormActions
        canEdit={isLoggedIn}
        onSave={() => save(buildSaveModelTitleOperations(cam.id, cam.titles, trimmed))}
        saveDisabled={!trimmed || unchanged}
        isSaving={isSaving}
      />
    </div>
  )
}

export default CamTitleForm
