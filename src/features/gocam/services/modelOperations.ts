import { AnnotationKey, OperationEntity, OperationType } from '../models/operations'
import type { Operation } from '../models/operations'

/** What the model carries now: every title, state and comment annotation. */
export interface CurrentModelDetails {
  titles: string[]
  states: string[]
  comments: string[]
}

/** What Model Details saves. */
export interface ModelDetails {
  title?: string
  state?: string
  comments: string[]
}

const modelAnnotation = (
  operation: OperationType.ADD_ANNOTATION | OperationType.REMOVE_ANNOTATION,
  modelId: string,
  key: AnnotationKey,
  value: string
): Operation => ({
  entity: OperationEntity.MODEL,
  operation,
  arguments: { 'model-id': modelId, values: [{ key, value }] },
})

/**
 * Save the Model Details form (Angular `saveCamAnnotations`): remove every
 * current title, state and comment, add the new ones, then store. Empty values
 * are left out rather than written as blank annotations.
 */
export const buildSaveModelDetailsOperations = (
  modelId: string,
  current: CurrentModelDetails,
  updated: ModelDetails
): Operation[] => {
  const operations: Operation[] = []
  const remove = OperationType.REMOVE_ANNOTATION
  const add = OperationType.ADD_ANNOTATION

  for (const title of current.titles) {
    operations.push(modelAnnotation(remove, modelId, AnnotationKey.TITLE, title))
  }
  for (const state of current.states) {
    operations.push(modelAnnotation(remove, modelId, AnnotationKey.STATE, state))
  }
  for (const comment of current.comments) {
    operations.push(modelAnnotation(remove, modelId, AnnotationKey.COMMENT, comment))
  }

  const title = updated.title?.trim()
  if (title) operations.push(modelAnnotation(add, modelId, AnnotationKey.TITLE, title))
  if (updated.state) operations.push(modelAnnotation(add, modelId, AnnotationKey.STATE, updated.state))
  const comments = Array.from(new Set(updated.comments.map(c => c.trim()).filter(Boolean)))
  for (const comment of comments) {
    operations.push(modelAnnotation(add, modelId, AnnotationKey.COMMENT, comment))
  }

  operations.push({
    entity: OperationEntity.MODEL,
    operation: OperationType.STORE,
    arguments: { 'model-id': modelId },
  })

  return operations
}
