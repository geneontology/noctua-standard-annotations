import { v4 as uuidv4 } from 'uuid'
import type { Edge, Evidence, GraphNode, UserContext } from '@/features/gocam/models/cam'
import {
  AnnotationKey,
  OperationEntity,
  OperationType,
  classExpression,
} from '@/features/gocam/models/operations'
import type { Operation } from '@/features/gocam/models/operations'
import { Relations, InverseRelations } from '@/@noctua.core/models/relations'
import { ANNOTATION_EDGE_CONFIG, ROOT_NODES } from '../data/annotationConfig'
import type { AnnotationExtension, StandardAnnotation } from '../models/annotation'
import { formatWithFrom, splitReferences } from './databaseIdentifiers'

/** Evidence as written: one ECO class, its sources (references) and with/from. */
export interface EvidenceInput {
  evidenceCodeId: string
  sources: string[]
  withFrom: string
}

/** One standard annotation to create. */
export interface CreateAnnotationInput {
  gpId: string
  goTermId: string
  isComplement: boolean
  /** The displayed relation (a key of `ANNOTATION_EDGE_CONFIG`, e.g. "enables"). */
  relationId: string
  evidence: EvidenceInput
  extensions: { relationId: string; termId: string; isComplement?: boolean }[]
  comments: string[]
}

const store = (modelId: string): Operation => ({
  entity: OperationEntity.MODEL,
  operation: OperationType.STORE,
  arguments: { 'model-id': modelId },
})

const addIndividual = (
  operations: Operation[],
  modelId: string,
  classId: string,
  isComplement = false
): string => {
  const variable = uuidv4()
  operations.push({
    entity: OperationEntity.INDIVIDUAL,
    operation: OperationType.ADD,
    arguments: {
      expressions: [classExpression(classId, isComplement)],
      'model-id': modelId,
      'assign-to-variable': variable,
    },
  })
  return variable
}

const removeIndividual = (operations: Operation[], modelId: string, uid: string) => {
  operations.push({
    entity: OperationEntity.INDIVIDUAL,
    operation: OperationType.REMOVE,
    arguments: { individual: uid, 'model-id': modelId },
  })
}

const edgeArgs = (subject: string, object: string, predicate: string, modelId: string) => ({
  subject,
  object,
  predicate,
  'model-id': modelId,
})

const uniqueNonEmpty = (values: string[]): string[] =>
  Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))

/** Comments as written (Angular kept their whitespace): unique, blank ones dropped. */
const uniqueComments = (values: string[]): string[] =>
  Array.from(new Set(values.filter(value => value.trim())))

const evidenceInputOf = (evidence: Evidence): EvidenceInput => ({
  evidenceCodeId: evidence.evidenceCode.id,
  sources: evidence.sources.length > 0 ? evidence.sources : [evidence.reference],
  withFrom: evidence.with,
})

/**
 * Add a fact with its comments and evidence — Angular `addFact` + minerva-requests
 * `add_evidence`: a fresh evidence individual per fact, its sources and with/from
 * as annotations, and an `evidence` annotation on the fact pointing at it.
 */
const addFact = (
  operations: Operation[],
  modelId: string,
  subject: string,
  object: string,
  predicate: string,
  evidences: EvidenceInput[],
  comments: string[]
) => {
  operations.push({
    entity: OperationEntity.EDGE,
    operation: OperationType.ADD,
    arguments: edgeArgs(subject, object, predicate, modelId),
  })

  const commentValues = uniqueComments(comments)
  if (commentValues.length > 0) {
    operations.push({
      entity: OperationEntity.EDGE,
      operation: OperationType.ADD_ANNOTATION,
      arguments: {
        ...edgeArgs(subject, object, predicate, modelId),
        values: commentValues.map(value => ({ key: AnnotationKey.COMMENT, value })),
      },
    })
  }

  for (const evidence of evidences) {
    if (!evidence.evidenceCodeId) continue
    const sources = uniqueNonEmpty(evidence.sources.flatMap(splitReferences))
    if (sources.length === 0) continue

    const evidenceVar = addIndividual(operations, modelId, evidence.evidenceCodeId)
    const withFrom = evidence.withFrom ? formatWithFrom(evidence.withFrom) : ''

    operations.push({
      entity: OperationEntity.INDIVIDUAL,
      operation: OperationType.ADD_ANNOTATION,
      arguments: {
        individual: evidenceVar,
        values: [
          ...sources.map(value => ({ key: AnnotationKey.SOURCE, value })),
          ...(withFrom ? [{ key: AnnotationKey.WITH, value: withFrom }] : []),
        ],
        'model-id': modelId,
      },
    })

    operations.push({
      entity: OperationEntity.EDGE,
      operation: OperationType.ADD_ANNOTATION,
      arguments: {
        ...edgeArgs(subject, object, predicate, modelId),
        values: [{ key: AnnotationKey.EVIDENCE, value: evidenceVar }],
      },
    })
  }
}

/**
 * Create standard annotations (Angular `AnnotationActivity.createSave` /
 * `createGPsSave` + `addActivity`). Each input gets its own individuals:
 *
 * - "enables":           `MF enabled_by GP`
 * - "involved in" etc.:  `MF(root) enabled_by GP`, `MF(root) part_of BP`
 * - "located in" etc.:   `GP located_in CC`
 *
 * plus `term <relation> extension` facts. Every fact carries the evidence and the
 * comments. A title is added only when the model has none yet.
 */
export const buildCreateAnnotationsOperations = (
  inputs: CreateAnnotationInput[],
  modelId: string,
  options: { title?: string; currentModelTitle?: string } = {}
): Operation[] => {
  const operations: Operation[] = []
  let created = 0

  for (const input of inputs) {
    const config = ANNOTATION_EDGE_CONFIG[input.relationId]
    // Without a known relation nothing can link the individuals; skip rather
    // than leave orphans (the Angular form added them anyway).
    if (!config || !input.gpId || !input.goTermId) continue
    created++

    const gpVar = addIndividual(operations, modelId, input.gpId)
    const termVar = addIndividual(operations, modelId, input.goTermId, input.isComplement)
    const extensionVars = input.extensions
      .filter(ext => ext.relationId && ext.termId)
      .map(ext => ({
        ...ext,
        variable: addIndividual(operations, modelId, ext.termId, ext.isComplement),
      }))

    const evidences = [input.evidence]

    if (config.mfNodeRequired) {
      const mfVar = addIndividual(operations, modelId, ROOT_NODES.mf.id)
      addFact(
        operations,
        modelId,
        mfVar,
        gpVar,
        config.gpToTermPredicate,
        evidences,
        input.comments
      )
      if (config.mfToTermPredicate) {
        addFact(
          operations,
          modelId,
          mfVar,
          termVar,
          config.mfToTermPredicate,
          evidences,
          input.comments
        )
      }
    } else if (config.gpToTermReverse) {
      addFact(
        operations,
        modelId,
        termVar,
        gpVar,
        config.gpToTermPredicate,
        evidences,
        input.comments
      )
    } else {
      addFact(
        operations,
        modelId,
        gpVar,
        termVar,
        config.gpToTermPredicate,
        evidences,
        input.comments
      )
    }

    for (const ext of extensionVars) {
      addFact(operations, modelId, termVar, ext.variable, ext.relationId, evidences, input.comments)
    }
  }

  if (created === 0) return []

  if (!options.currentModelTitle?.trim() && options.title?.trim()) {
    operations.push({
      entity: OperationEntity.MODEL,
      operation: OperationType.ADD_ANNOTATION,
      arguments: {
        'model-id': modelId,
        values: [{ key: AnnotationKey.TITLE, value: options.title.trim() }],
      },
    })
  }

  operations.push(store(modelId))
  return operations
}

/**
 * Add More Gene(s): copy an existing annotation — relation, GO term (with its
 * NOT), evidence, extensions and comments — onto each gene product id.
 */
export const buildCopyAnnotationToGenesOperations = (
  annotation: StandardAnnotation,
  gpIds: string[],
  modelId: string
): Operation[] =>
  buildCreateAnnotationsOperations(
    gpIds.map(gpId => ({
      gpId,
      goTermId: annotation.goTerm.id,
      isComplement: annotation.isComplement,
      relationId: annotation.relation.id,
      evidence: annotation.evidence
        ? evidenceInputOf(annotation.evidence)
        : { evidenceCodeId: '', sources: [], withFrom: '' },
      extensions: annotation.extensions.map(ext => ({
        relationId: ext.relation.id,
        termId: ext.term.id,
        isComplement: ext.term.isComplement,
      })),
      comments: annotation.comments,
    })),
    modelId
  )

/** Swap an individual's class, keeping its NOT (Angular `editNode`). */
export const buildEditNodeTypeOperations = (
  node: GraphNode,
  newClassId: string,
  modelId: string
): Operation[] => [
  {
    entity: OperationEntity.INDIVIDUAL,
    operation: OperationType.REMOVE_TYPE,
    arguments: {
      individual: node.uid,
      expressions: [classExpression(node.id, node.isComplement)],
      'model-id': modelId,
    },
  },
  {
    entity: OperationEntity.INDIVIDUAL,
    operation: OperationType.ADD_TYPE,
    arguments: {
      individual: node.uid,
      expressions: [classExpression(newClassId, node.isComplement)],
      'model-id': modelId,
    },
  },
  store(modelId),
]

/** Add or remove the NOT qualifier on the GO term (Angular `toggleIsComplement`). */
export const buildToggleComplementOperations = (node: GraphNode, modelId: string): Operation[] => [
  {
    entity: OperationEntity.INDIVIDUAL,
    operation: OperationType.REMOVE_TYPE,
    arguments: {
      individual: node.uid,
      expressions: [classExpression(node.id, node.isComplement)],
      'model-id': modelId,
    },
  },
  {
    entity: OperationEntity.INDIVIDUAL,
    operation: OperationType.ADD_TYPE,
    arguments: {
      individual: node.uid,
      expressions: [classExpression(node.id, !node.isComplement)],
      'model-id': modelId,
    },
  },
  store(modelId),
]

/** Every evidence individual in the annotation — what evidence edits update. */
export const getAnnotationEvidence = (annotation: StandardAnnotation): Evidence[] => {
  const seen = new Set<string>()
  const result: Evidence[] = []
  for (const edge of annotation.edges) {
    for (const evidence of edge.evidence) {
      if (seen.has(evidence.uid)) continue
      seen.add(evidence.uid)
      result.push(evidence)
    }
  }
  return result
}

/** Re-attribute an edited evidence individual to the current user and group. */
const refreshContributor = (
  operations: Operation[],
  evidenceUid: string,
  modelId: string,
  userContext?: UserContext
) => {
  if (!userContext?.orcid) return
  operations.push({
    entity: OperationEntity.INDIVIDUAL,
    operation: OperationType.REMOVE_ANNOTATION,
    arguments: {
      individual: evidenceUid,
      values: [{ key: AnnotationKey.CONTRIBUTOR, value: userContext.orcid }],
      'model-id': modelId,
    },
  })
  operations.push({
    entity: OperationEntity.INDIVIDUAL,
    operation: OperationType.ADD_ANNOTATION,
    arguments: {
      individual: evidenceUid,
      values: [
        { key: AnnotationKey.CONTRIBUTOR, value: userContext.orcid },
        ...(userContext.groupUrl
          ? [{ key: AnnotationKey.PROVIDED_BY, value: userContext.groupUrl }]
          : []),
      ],
      'model-id': modelId,
    },
  })
}

/** Set the evidence code on every evidence of the annotation (Angular `editEvidenceCode`). */
export const buildEditEvidenceCodeOperations = (
  evidences: Evidence[],
  newEvidenceCodeId: string,
  modelId: string,
  userContext?: UserContext
): Operation[] => {
  const operations: Operation[] = []
  for (const evidence of evidences) {
    operations.push({
      entity: OperationEntity.INDIVIDUAL,
      operation: OperationType.REMOVE_TYPE,
      arguments: {
        individual: evidence.uid,
        expressions: [classExpression(evidence.evidenceCode.id)],
        'model-id': modelId,
      },
    })
    operations.push({
      entity: OperationEntity.INDIVIDUAL,
      operation: OperationType.ADD_TYPE,
      arguments: {
        individual: evidence.uid,
        expressions: [classExpression(newEvidenceCodeId)],
        'model-id': modelId,
      },
    })
    refreshContributor(operations, evidence.uid, modelId, userContext)
  }
  operations.push(store(modelId))
  return operations
}

/**
 * Replace the reference (`source`) or with/from (`with`) on every evidence of the
 * annotation (Angular `editReference` / `editWith`). An empty value clears it.
 */
export const buildEditEvidenceAnnotationOperations = (
  evidences: Evidence[],
  key: AnnotationKey.SOURCE | AnnotationKey.WITH,
  newValue: string,
  modelId: string,
  userContext?: UserContext
): Operation[] => {
  // Several references become separate `source` values; with/from stays one string.
  const newValues = !newValue.trim()
    ? []
    : key === AnnotationKey.SOURCE
      ? uniqueNonEmpty(splitReferences(newValue))
      : [formatWithFrom(newValue)]
  const operations: Operation[] = []

  for (const evidence of evidences) {
    const oldValues = key === AnnotationKey.SOURCE ? evidence.sources : [evidence.with]
    for (const oldValue of oldValues.filter(Boolean)) {
      operations.push({
        entity: OperationEntity.INDIVIDUAL,
        operation: OperationType.REMOVE_ANNOTATION,
        arguments: {
          individual: evidence.uid,
          values: [{ key, value: oldValue }],
          'model-id': modelId,
        },
      })
    }
    if (newValues.length > 0) {
      operations.push({
        entity: OperationEntity.INDIVIDUAL,
        operation: OperationType.ADD_ANNOTATION,
        arguments: {
          individual: evidence.uid,
          values: newValues.map(value => ({ key, value })),
          'model-id': modelId,
        },
      })
    }
    refreshContributor(operations, evidence.uid, modelId, userContext)
  }

  operations.push(store(modelId))
  return operations
}

/**
 * Change the annotation's relation (Angular `getTriplePair` + `editConnection`):
 * remove the relation's fact and add the new one — reversed when moving to or
 * from "enables", which is stored as `MF enabled_by GP` — carrying the comments
 * and a copy of the evidence. Minerva deletes the removed fact's evidence
 * individuals itself; removing them here too would fail the batch before its store.
 */
export const buildEditRelationOperations = (
  annotation: StandardAnnotation,
  newRelationId: string,
  modelId: string
): Operation[] => {
  const config = ANNOTATION_EDGE_CONFIG[newRelationId]
  if (!config) return []
  // Moving between a direct relation and one stored through a root MF would mean
  // adding or removing the MF individual — not an edit SAE ever offered. A relation
  // SAE doesn't know (e.g. a root MF `occurs_in` from a GO-CAM) can't be mapped either.
  const current = ANNOTATION_EDGE_CONFIG[annotation.relation.id]
  if (!current || current.mfNodeRequired !== config.mfNodeRequired) return []

  const oldEdge = annotation.termEdge
  const swap = oldEdge.id === Relations.ENABLED_BY || newRelationId === InverseRelations.ENABLES
  const [subject, object] = swap
    ? [oldEdge.targetId, oldEdge.sourceId]
    : [oldEdge.sourceId, oldEdge.targetId]
  const predicate = config.mfNodeRequired ? config.mfToTermPredicate : config.gpToTermPredicate
  if (!predicate) return []

  const operations: Operation[] = [
    {
      entity: OperationEntity.EDGE,
      operation: OperationType.REMOVE,
      arguments: edgeArgs(oldEdge.sourceId, oldEdge.targetId, oldEdge.id, modelId),
    },
  ]

  addFact(
    operations,
    modelId,
    subject,
    object,
    predicate,
    oldEdge.evidence.map(evidenceInputOf),
    oldEdge.comments
  )

  operations.push(store(modelId))
  return operations
}

/** Add an extension to the annotation's GO term with the annotation's evidence and comments. */
export const buildAddExtensionOperations = (
  annotation: StandardAnnotation,
  relationId: string,
  termId: string,
  modelId: string
): Operation[] => {
  const operations: Operation[] = []
  const termVar = addIndividual(operations, modelId, termId)
  addFact(
    operations,
    modelId,
    annotation.goTerm.uid,
    termVar,
    relationId,
    annotation.evidence ? [evidenceInputOf(annotation.evidence)] : [],
    annotation.comments
  )
  operations.push(store(modelId))
  return operations
}

/**
 * Remove an extension: its fact and its term individual (Angular `deleteExtension`).
 * The term stays when something else still uses it (`removeTerm` false), e.g. a
 * gene product that is also the subject of its own annotation.
 */
export const buildDeleteExtensionOperations = (
  extension: AnnotationExtension,
  modelId: string,
  removeTerm = true
): Operation[] => {
  const operations: Operation[] = [
    {
      entity: OperationEntity.EDGE,
      operation: OperationType.REMOVE,
      arguments: edgeArgs(
        extension.edge.sourceId,
        extension.edge.targetId,
        extension.edge.id,
        modelId
      ),
    },
  ]
  if (removeTerm) removeIndividual(operations, modelId, extension.term.uid)
  operations.push(store(modelId))
  return operations
}

/**
 * Delete an annotation (Angular `deleteActivity`): its start fact, then its
 * individuals — removing an individual takes its facts with it.
 */
export const buildDeleteAnnotationOperations = (
  annotation: StandardAnnotation,
  nodeUids: string[],
  modelId: string
): Operation[] => {
  const { startEdge } = annotation
  const operations: Operation[] = [
    {
      entity: OperationEntity.EDGE,
      operation: OperationType.REMOVE,
      arguments: edgeArgs(startEdge.sourceId, startEdge.targetId, startEdge.id, modelId),
    },
  ]
  for (const uid of nodeUids) removeIndividual(operations, modelId, uid)
  operations.push(store(modelId))
  return operations
}

/**
 * Set the comments of an annotation: every fact gets exactly `comments`
 * (Angular `updateAnnotationComments` — remove all, then add all).
 */
export const buildReplaceCommentsOperations = (
  edges: Edge[],
  comments: string[],
  modelId: string
): Operation[] => {
  const values = uniqueComments(comments)
  const operations: Operation[] = []

  for (const edge of edges) {
    const args = edgeArgs(edge.sourceId, edge.targetId, edge.id, modelId)
    if (edge.comments.length > 0) {
      operations.push({
        entity: OperationEntity.EDGE,
        operation: OperationType.REMOVE_ANNOTATION,
        arguments: {
          ...args,
          values: edge.comments.map(value => ({ key: AnnotationKey.COMMENT, value })),
        },
      })
    }
    if (values.length > 0) {
      operations.push({
        entity: OperationEntity.EDGE,
        operation: OperationType.ADD_ANNOTATION,
        arguments: {
          ...args,
          values: values.map(value => ({ key: AnnotationKey.COMMENT, value })),
        },
      })
    }
  }

  operations.push(store(modelId))
  return operations
}

/** Save the active model as stored (the "Not Saved" bar's Save). */
export const buildStoreModelOperations = (modelId: string): Operation[] => [store(modelId)]
