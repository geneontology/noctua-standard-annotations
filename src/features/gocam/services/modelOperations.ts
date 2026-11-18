import { AnnotationKey, OperationEntity, OperationType } from '../models/operations'
import type { Operation } from '../models/operations'

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
 * Replace one kind of model annotation (Angular `saveCamAnnotations`, one field
 * at a time): remove every current value of `key`, add the new ones, then store.
 * Values are trimmed, blanks dropped and duplicates written once. The model's
 * other annotations are left alone.
 */
const buildReplaceModelAnnotationOperations = (
  modelId: string,
  key: AnnotationKey,
  current: string[],
  updated: string[]
): Operation[] => {
  const values = Array.from(new Set(updated.map(v => v.trim()).filter(Boolean)))
  return [
    ...current.map(value => modelAnnotation(OperationType.REMOVE_ANNOTATION, modelId, key, value)),
    ...values.map(value => modelAnnotation(OperationType.ADD_ANNOTATION, modelId, key, value)),
    {
      entity: OperationEntity.MODEL,
      operation: OperationType.STORE,
      arguments: { 'model-id': modelId },
    },
  ]
}

/** Edit Title: replace every `title` annotation with `title`. */
export const buildSaveModelTitleOperations = (
  modelId: string,
  currentTitles: string[],
  title: string
): Operation[] =>
  buildReplaceModelAnnotationOperations(modelId, AnnotationKey.TITLE, currentTitles, [title])

/** Change State: replace every `state` annotation with `state`. */
export const buildSaveModelStateOperations = (
  modelId: string,
  currentStates: string[],
  state: string
): Operation[] =>
  buildReplaceModelAnnotationOperations(modelId, AnnotationKey.STATE, currentStates, [state])

/** Model Comments: replace every model `comment` annotation with `comments`. */
export const buildSaveModelCommentsOperations = (
  modelId: string,
  currentComments: string[],
  comments: string[]
): Operation[] =>
  buildReplaceModelAnnotationOperations(modelId, AnnotationKey.COMMENT, currentComments, comments)
