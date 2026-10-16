import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useUserContext } from '@/app/hooks/useUserContext'
import { showToast } from '@/@noctua.core/components/toast/toastSlice'
import { selectCamModel } from '@/features/gocam/slices/camSlice'
import {
  getMutationErrorMessage,
  useResetGraphModelMutation,
  useUpdateGraphModelMutation,
} from '@/features/gocam/slices/camApiSlice'
import type { GraphNode } from '@/features/gocam/models/cam'
import { AnnotationKey } from '@/features/gocam/models/operations'
import type { Operation } from '@/features/gocam/models/operations'
import type { AnnotationExtension, StandardAnnotation } from '../models/annotation'
import type { AnnotationFormState } from '../models/annotationForm'
import { selectAnnotations } from '../slices/annotationsSlice'
import {
  canRemoveExtensionTerm,
  getDeletableNodeUids,
  leavesModelEmpty,
} from '../services/annotationExtraction'
import { defaultModelTitle, toCreateAnnotationInputs } from '../services/annotationFormRules'
import {
  buildAddExtensionOperations,
  buildCopyAnnotationToGenesOperations,
  buildCreateAnnotationsOperations,
  buildDeleteAnnotationOperations,
  buildDeleteExtensionOperations,
  buildEditEvidenceAnnotationOperations,
  buildEditEvidenceCodeOperations,
  buildEditNodeTypeOperations,
  buildEditRelationOperations,
  buildReplaceCommentsOperations,
  buildStoreModelOperations,
  buildToggleComplementOperations,
  getAnnotationEvidence,
} from '../services/annotationOperations'

/**
 * Every write the standard-annotations UI makes, as one m3Batch each, with the
 * toast the Angular app showed on success and the Barista/Minerva message on failure.
 * Each resolves to whether the write succeeded.
 */
export function useAnnotationActions() {
  const dispatch = useAppDispatch()
  const model = useAppSelector(selectCamModel)
  const annotations = useAppSelector(selectAnnotations)
  const userContext = useUserContext()
  const [updateGraphModel, { isLoading: isUpdating }] = useUpdateGraphModelMutation()
  const [resetGraphModel, { isLoading: isResetting }] = useResetGraphModelMutation()
  const modelId = model?.id ?? ''

  const run = useCallback(
    async (operations: Operation[], successMessage: string): Promise<boolean> => {
      if (!modelId || operations.length === 0) return false
      const result = await updateGraphModel(operations)
      if ('error' in result) {
        dispatch(showToast({ message: getMutationErrorMessage(result.error), severity: 'error' }))
        return false
      }
      dispatch(showToast({ message: successMessage }))
      return true
    },
    [modelId, updateGraphModel, dispatch]
  )

  const createAnnotations = useCallback(
    (form: AnnotationFormState) =>
      run(
        buildCreateAnnotationsOperations(toCreateAnnotationInputs(form), modelId, {
          title: defaultModelTitle(form),
          currentModelTitle: model?.title,
        }),
        'Annotation successfully created.'
      ),
    [run, modelId, model?.title]
  )

  const copyToGenes = useCallback(
    async (annotation: StandardAnnotation, gpIds: string[]) => {
      const operations = buildCopyAnnotationToGenesOperations(annotation, gpIds, modelId)
      if (operations.length === 0) {
        // A relation SAE can't write (e.g. one read from a GO-CAM) — nothing to copy.
        const relation = annotation.relation.label || annotation.termEdge.label
        dispatch(
          showToast({
            message: `"${relation}" annotations can't be copied to other genes.`,
            severity: 'warning',
          })
        )
        return false
      }
      return run(operations, `${gpIds.length} Annotation(s) successfully created.`)
    },
    [run, modelId, dispatch]
  )

  const editNodeType = useCallback(
    (node: GraphNode, newClassId: string, label: string) =>
      run(buildEditNodeTypeOperations(node, newClassId, modelId), `${label} successfully updated.`),
    [run, modelId]
  )

  const editEvidenceCode = useCallback(
    (annotation: StandardAnnotation, evidenceCodeId: string) =>
      run(
        buildEditEvidenceCodeOperations(
          getAnnotationEvidence(annotation),
          evidenceCodeId,
          modelId,
          userContext
        ),
        'Evidence successfully updated.'
      ),
    [run, modelId, userContext]
  )

  const editReference = useCallback(
    (annotation: StandardAnnotation, reference: string) =>
      run(
        buildEditEvidenceAnnotationOperations(
          getAnnotationEvidence(annotation),
          AnnotationKey.SOURCE,
          reference,
          modelId,
          userContext
        ),
        'Reference successfully updated.'
      ),
    [run, modelId, userContext]
  )

  const editWith = useCallback(
    (annotation: StandardAnnotation, withFrom: string) =>
      run(
        buildEditEvidenceAnnotationOperations(
          getAnnotationEvidence(annotation),
          AnnotationKey.WITH,
          withFrom,
          modelId,
          userContext
        ),
        'With successfully updated.'
      ),
    [run, modelId, userContext]
  )

  const editRelation = useCallback(
    async (annotation: StandardAnnotation, relationId: string) => {
      const operations = buildEditRelationOperations(annotation, relationId, modelId)
      if (operations.length === 0) {
        dispatch(
          showToast({
            message:
              "This relation can't be changed in place. Delete the annotation and create it again.",
            severity: 'warning',
          })
        )
        return false
      }
      return run(operations, 'Relation successfully updated.')
    },
    [run, modelId, dispatch]
  )

  const addExtension = useCallback(
    (annotation: StandardAnnotation, relationId: string, termId: string) =>
      run(
        buildAddExtensionOperations(annotation, relationId, termId, modelId),
        'Extension successfully added.'
      ),
    [run, modelId]
  )

  const deleteExtension = useCallback(
    (extension: AnnotationExtension) =>
      run(
        buildDeleteExtensionOperations(
          extension,
          modelId,
          canRemoveExtensionTerm(extension, annotations, model)
        ),
        'Annotation Extension successfully deleted.'
      ),
    [run, modelId, annotations, model]
  )

  const addComment = useCallback(
    (annotation: StandardAnnotation, comment: string) =>
      run(
        buildReplaceCommentsOperations(
          annotation.edges,
          [...annotation.comments, comment],
          modelId
        ),
        'Comment successfully added.'
      ),
    [run, modelId]
  )

  const replaceComments = useCallback(
    (annotation: StandardAnnotation, comments: string[]) =>
      run(
        buildReplaceCommentsOperations(annotation.edges, comments, modelId),
        'Comment(s) successfully updated.'
      ),
    [run, modelId]
  )

  const toggleNot = useCallback(
    (annotation: StandardAnnotation) =>
      run(
        buildToggleComplementOperations(annotation.goTerm, modelId),
        'NOT Qualifier successfully updated.'
      ),
    [run, modelId]
  )

  const deleteAnnotation = useCallback(
    async (annotation: StandardAnnotation) => {
      const nodeUids = getDeletableNodeUids(annotation, annotations)
      // Minerva won't store a model with no individuals left; the delete would
      // fail at its store and leave an unsaved, emptied model behind.
      if (model && leavesModelEmpty(model, annotation, nodeUids)) {
        dispatch(
          showToast({
            message:
              "This is the model's last annotation, and Minerva can't save an empty model. Delete the model from Noctua instead.",
            severity: 'warning',
            duration: 8000,
          })
        )
        return false
      }
      return run(
        buildDeleteAnnotationOperations(annotation, nodeUids, modelId),
        'Annotation successfully deleted.'
      )
    },
    [run, modelId, annotations, model, dispatch]
  )

  const storeModel = useCallback(
    () => run(buildStoreModelOperations(modelId), 'Model successfully saved.'),
    [run, modelId]
  )

  const resetModel = useCallback(async () => {
    if (!modelId) return false
    const result = await resetGraphModel(modelId)
    if ('error' in result) {
      dispatch(showToast({ message: getMutationErrorMessage(result.error), severity: 'error' }))
      return false
    }
    dispatch(showToast({ message: 'Unsaved changes discarded.' }))
    return true
  }, [modelId, resetGraphModel, dispatch])

  return {
    isSaving: isUpdating || isResetting,
    createAnnotations,
    copyToGenes,
    editNodeType,
    editEvidenceCode,
    editReference,
    editWith,
    editRelation,
    addExtension,
    deleteExtension,
    addComment,
    replaceComments,
    toggleNot,
    deleteAnnotation,
    storeModel,
    resetModel,
  }
}
