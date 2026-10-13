import type React from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@mantine/core'
import { useAppDispatch, useAppSelector } from './hooks'
import ConfirmDialog from '@/@noctua.core/components/dialog/ConfirmDialog'
import { selectAuthUser, selectBaristaToken } from '@/features/auth/slices/authSlice'
import { getMutationErrorMessage, useGetGraphModelQuery } from '@/features/gocam/slices/camApiSlice'
import { selectCamModel, setModel } from '@/features/gocam/slices/camSlice'
import { selectSortedAnnotations } from '@/features/annotations/slices/annotationsSlice'
import { useAnnotationActions } from '@/features/annotations/hooks/useAnnotationActions'
import AnnotationForm from '@/features/annotations/components/AnnotationForm'
import AnnotationsTable from '@/features/annotations/components/AnnotationsTable'

type ModelAction = 'reset' | 'store' | null

/**
 * The Standard Annotations page (Angular `NoctuaAnnotationsComponent`): the
 * create form above the model's annotations, for the `model_id` in the URL.
 */
const StandardAnnotations: React.FC = () => {
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()
  const modelId = searchParams.get('model_id')
  const user = useAppSelector(selectAuthUser)
  const baristaToken = useAppSelector(selectBaristaToken)
  const model = useAppSelector(selectCamModel)
  const annotations = useAppSelector(selectSortedAnnotations)
  const actions = useAnnotationActions()
  const [modelAction, setModelAction] = useState<ModelAction>(null)

  const { data, error, isSuccess } = useGetGraphModelQuery(
    { modelId: modelId || '', baristaToken: baristaToken || '' },
    { skip: !modelId }
  )

  useEffect(() => {
    if (isSuccess) dispatch(setModel(data?.data ?? null))
  }, [data, isSuccess, dispatch])

  const confirmModelAction = async () => {
    const action = modelAction
    setModelAction(null)
    if (action === 'reset') await actions.resetModel()
    else if (action === 'store') await actions.storeModel()
  }

  if (!modelId) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-gray-600">
        No model selected. Open Standard Annotations from Noctua with a model_id.
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-red-800">
        Could not load {modelId}: {getMutationErrorMessage(error)}
      </div>
    )
  }

  const title = model?.title ?? ''

  return (
    <div className="flex w-full flex-col">
      {user && model?.modified && annotations.length > 0 && (
        <div className="flex h-10 w-full items-center justify-center gap-2 bg-red-200 px-3 text-xs">
          <small className="mr-4">Not Saved</small>
          <Button size="xs" color="red" onClick={() => setModelAction('reset')}>
            Reset
          </Button>
          <Button size="xs" onClick={() => setModelAction('store')}>
            Save
          </Button>
        </div>
      )}

      {model && (
        <>
          <AnnotationForm />
          <AnnotationsTable annotations={annotations} />
        </>
      )}

      <ConfirmDialog
        open={modelAction !== null}
        onClose={() => setModelAction(null)}
        onConfirm={confirmModelAction}
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

export default StandardAnnotations
