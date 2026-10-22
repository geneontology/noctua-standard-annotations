import type React from 'react'
import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@mantine/core'
import { useAppDispatch, useAppSelector } from './hooks'
import SimpleDialog from '@/@noctua.core/components/dialog/SimpleDialog'
import { showToast } from '@/@noctua.core/components/toast/toastSlice'
import { selectAuthResolved, selectBaristaToken } from '@/features/auth/slices/authSlice'
import { getMutationErrorMessage, useGetGraphModelQuery } from '@/features/gocam/slices/camApiSlice'
import { selectCamModel, setModel } from '@/features/gocam/slices/camSlice'
import { useBaristaModelWatch } from '@/features/gocam/hooks/useBaristaModelWatch'
import { selectSortedAnnotations } from '@/features/annotations/slices/annotationsSlice'
import AnnotationForm from '@/features/annotations/components/AnnotationForm'
import AnnotationsTable from '@/features/annotations/components/AnnotationsTable'

/**
 * The Standard Annotations page (Angular `NoctuaAnnotationsComponent`): the
 * create form above the model's annotations, for the `model_id` in the URL.
 */
const StandardAnnotations: React.FC = () => {
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()
  const modelId = searchParams.get('model_id')
  const baristaToken = useAppSelector(selectBaristaToken)
  // Like Angular, wait to know who is logged in: a stored token that Barista
  // no longer accepts would otherwise fail the (privileged) read.
  const authResolved = useAppSelector(selectAuthResolved)
  const model = useAppSelector(selectCamModel)
  const annotations = useAppSelector(selectSortedAnnotations)

  const { data, error, isSuccess, refetch } = useGetGraphModelQuery(
    { modelId: modelId || '', baristaToken: baristaToken || '' },
    { skip: !modelId || !authResolved }
  )

  useEffect(() => {
    if (isSuccess) dispatch(setModel(data?.data ?? null))
  }, [data, isSuccess, dispatch])

  // Another tab or user changed the model: editing the stale copy would act on
  // individuals that may no longer exist (geneontology/noctua#1077).
  const { externalChangePending, acknowledge } = useBaristaModelWatch(modelId)
  const refreshModel = useCallback(() => {
    acknowledge()
    refetch()
  }, [acknowledge, refetch])

  // A failed refresh (e.g. after an edit) keeps the last model on the page.
  const hasModel = !!model
  useEffect(() => {
    if (error && hasModel) {
      dispatch(
        showToast({
          message: `Could not refresh the model: ${getMutationErrorMessage(error)}`,
          severity: 'error',
        })
      )
    }
  }, [error, hasModel, dispatch])

  if (!modelId) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-gray-600">
        No model selected. Open Standard Annotations from Noctua with a model_id.
      </div>
    )
  }

  if (error && !model) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-red-800">
        Could not load {modelId}: {getMutationErrorMessage(error)}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col">
      {model && (
        <>
          <AnnotationForm />
          <AnnotationsTable annotations={annotations} />
        </>
      )}

      {/* Closing it refreshes too: there is no carrying on with the stale model. */}
      <SimpleDialog
        open={externalChangePending}
        onClose={refreshModel}
        title="Model Updated"
        size="sm"
        preventBackdropClose
      >
        <div className="px-4 py-4 text-sm text-gray-700">
          This model has been modified in another window or by another user. Refresh to get the
          latest version.
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
          <Button variant="filled" onClick={refreshModel}>
            Refresh
          </Button>
        </div>
      </SimpleDialog>
    </div>
  )
}

export default StandardAnnotations
