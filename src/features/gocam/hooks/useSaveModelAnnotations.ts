import { useCallback } from 'react'
import { useAppDispatch } from '@/app/hooks'
import { closeDialog } from '@/@noctua.core/components/dialog/dialogSlice'
import { showToast } from '@/@noctua.core/components/toast/toastSlice'
import type { Operation } from '../models/operations'
import { getMutationErrorMessage, useUpdateGraphModelMutation } from '../slices/camApiSlice'

/**
 * Save a model form (title, state, comments): send the batch, toast the outcome
 * and close the dialog on success. A failed save leaves the form open.
 */
export const useSaveModelAnnotations = (successMessage: string) => {
  const dispatch = useAppDispatch()
  const [updateGraphModel, { isLoading }] = useUpdateGraphModelMutation()

  const save = useCallback(
    async (operations: Operation[]) => {
      const result = await updateGraphModel(operations)
      if ('error' in result) {
        dispatch(showToast({ message: getMutationErrorMessage(result.error), severity: 'error' }))
        return
      }
      dispatch(showToast({ message: successMessage }))
      dispatch(closeDialog())
    },
    [updateGraphModel, dispatch, successMessage]
  )

  return { save, isSaving: isLoading }
}
