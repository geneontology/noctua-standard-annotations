import type React from 'react'
import { useState } from 'react'
import { Button } from '@mantine/core'
import { useAppSelector } from '../hooks'
import ConfirmDialog from '@/@noctua.core/components/dialog/ConfirmDialog'
import { selectAuthUser } from '@/features/auth/slices/authSlice'
import { selectCamModel } from '@/features/gocam/slices/camSlice'
import { selectAnnotations } from '@/features/annotations/slices/annotationsSlice'
import { useAnnotationActions } from '@/features/annotations/hooks/useAnnotationActions'

type ModelAction = 'reset' | 'store' | null

/**
 * The "Not Saved" bar above the model toolbar (Angular `noc-not-loggedin` bar):
 * the model has changes Minerva hasn't stored, e.g. from another editor.
 */
const NotSavedBar: React.FC = () => {
  const user = useAppSelector(selectAuthUser)
  const model = useAppSelector(selectCamModel)
  const annotations = useAppSelector(selectAnnotations)
  const actions = useAnnotationActions()
  const [modelAction, setModelAction] = useState<ModelAction>(null)

  const confirm = async () => {
    const action = modelAction
    setModelAction(null)
    if (action === 'reset') await actions.resetModel()
    else if (action === 'store') await actions.storeModel()
  }

  if (!user || !model?.modified || annotations.length === 0) return null

  const title = model.title ?? ''

  return (
    <div className="flex h-10 w-full shrink-0 items-center justify-center gap-2 bg-red-200 px-3 text-xs">
      <small className="mr-4">Not Saved</small>
      <Button size="xs" color="red" onClick={() => setModelAction('reset')}>
        Reset
      </Button>
      <Button size="xs" onClick={() => setModelAction('store')}>
        Save
      </Button>

      <ConfirmDialog
        open={modelAction !== null}
        onClose={() => setModelAction(null)}
        onConfirm={confirm}
        title={modelAction === 'reset' ? 'Discard Unsaved Changes' : 'Save Changes?'}
        message={
          modelAction === 'reset'
            ? `All your changes will be discarded for model. Model Name:"${title}"`
            : `All your changes will be saved for model. Model Name:"${title}"`
        }
        confirmLabel={modelAction === 'reset' ? 'OK' : 'Submit'}
        cancelLabel={modelAction === 'reset' ? 'Cancel' : 'Go Back'}
        confirmColor={modelAction === 'reset' ? 'red' : 'primary'}
        size="sm"
      />
    </div>
  )
}

export default NotSavedBar
