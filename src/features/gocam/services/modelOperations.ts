import { AnnotationKey, OperationEntity, OperationType } from '../models/operations'
import type { Operation } from '../models/operations'
import type { GraphModel } from '../models/cam'

/**
 * Tag the model as made in SAE (#97): `annotation-editor-sae = true`, an `xsd:boolean`.
 * Written with the full IRI, which Minerva stores as the same property as the shorthand
 * and accepts even before it knows the shorthand (minerva#613). Model annotations are a
 * set, so a repeat add can't make a second tag.
 */
export const buildAnnotationEditorSAEOperation = (modelId: string): Operation => ({
  entity: OperationEntity.MODEL,
  operation: OperationType.ADD_ANNOTATION,
  arguments: {
    'model-id': modelId,
    values: [
      { key: AnnotationKey.ANNOTATION_EDITOR_SAE_IRI, value: 'true', 'value-type': 'xsd:boolean' },
    ],
  },
})

/**
 * A model SAE is about to make: no individuals yet and not tagged. The landing page tags
 * models it creates for SAE; this catches the rest, and never adds a second tag.
 */
export const needsAnnotationEditorSAETag = (model: GraphModel | undefined | null): boolean =>
  !!model?.id && model.nodes.length === 0 && !model.annotationEditorSAE

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
