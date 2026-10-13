import { describe, it, expect } from 'vitest'
import type { Operation } from '@/features/gocam/models/operations'
import { AnnotationKey, OperationEntity, OperationType } from '@/features/gocam/models/operations'
import { extractAnnotations, getDeletableNodeUids } from '@/features/annotations/services/annotationExtraction'
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
  buildToggleComplementOperations,
  getAnnotationEvidence,
} from '@/features/annotations/services/annotationOperations'
import type { CreateAnnotationInput } from '@/features/annotations/services/annotationOperations'
import { InverseRelations } from '@/@noctua.core/models/relations'
import { loadModel, saeModelRaw } from '@tests/fixtures/models'
import { SAE_MODEL_ID, saeUid } from '@tests/fixtures/saeModel'

const MODEL = SAE_MODEL_ID
const user = { orcid: 'https://orcid.org/0000-0000-0000-0099', groupUrl: 'http://geneontology.org' }
const annotations = extractAnnotations(loadModel(saeModelRaw))
const byGp = (label: string) => annotations.find(a => a.gp.label === label)!

const ofKind = (ops: Operation[], entity: OperationEntity, operation: OperationType) =>
  ops.filter(op => op.entity === entity && op.operation === operation)

const addedIndividuals = (ops: Operation[]) =>
  ofKind(ops, OperationEntity.INDIVIDUAL, OperationType.ADD).map(op => ({
    variable: op.arguments['assign-to-variable'] as string,
    expression: (op.arguments.expressions as unknown[])[0],
  }))

const classOf = (ops: Operation[], variable: unknown) =>
  addedIndividuals(ops).find(i => i.variable === variable)?.expression

const addedEdges = (ops: Operation[]) =>
  ofKind(ops, OperationEntity.EDGE, OperationType.ADD).map(op => ({
    subject: op.arguments.subject,
    predicate: op.arguments.predicate,
    object: op.arguments.object,
  }))

const input = (overrides: Partial<CreateAnnotationInput> = {}): CreateAnnotationInput => ({
  gpId: 'UniProtKB:P1',
  goTermId: 'GO:0004672',
  isComplement: false,
  relationId: InverseRelations.ENABLES,
  evidence: { evidenceCodeId: 'ECO:0000314', sources: ['PMID:1'], withFrom: '' },
  extensions: [],
  comments: [],
  ...overrides,
})

describe('buildCreateAnnotationsOperations', () => {
  it('stores "enables" as MF enabled_by GP, with evidence, and ends in a store', () => {
    const ops = buildCreateAnnotationsOperations([input()], MODEL)
    const [edge] = addedEdges(ops)

    expect(edge.predicate).toBe('RO:0002333')
    expect(classOf(ops, edge.subject)).toEqual({ type: 'class', id: 'GO:0004672' })
    expect(classOf(ops, edge.object)).toEqual({ type: 'class', id: 'UniProtKB:P1' })

    // Evidence: an ECO individual with its source, linked from the fact.
    const evidenceLink = ofKind(ops, OperationEntity.EDGE, OperationType.ADD_ANNOTATION).find(op =>
      (op.arguments.values as { key: string }[]).some(v => v.key === AnnotationKey.EVIDENCE)
    )!
    const evidenceVar = (evidenceLink.arguments.values as { value: string }[])[0].value
    expect(classOf(ops, evidenceVar)).toEqual({ type: 'class', id: 'ECO:0000314' })
    const evidenceValues = ofKind(ops, OperationEntity.INDIVIDUAL, OperationType.ADD_ANNOTATION)
      .find(op => op.arguments.individual === evidenceVar)!.arguments.values
    expect(evidenceValues).toEqual([{ key: 'source', value: 'PMID:1' }])

    expect(ops.at(-1)).toEqual({
      entity: 'model',
      operation: 'store',
      arguments: { 'model-id': MODEL },
    })
  })

  it('stores "involved in" through a root molecular_function', () => {
    const ops = buildCreateAnnotationsOperations(
      [input({ goTermId: 'GO:0006915', relationId: InverseRelations.INVOLVED_IN })],
      MODEL
    )
    const edges = addedEdges(ops)
    expect(edges.map(e => e.predicate)).toEqual(['RO:0002333', 'BFO:0000050'])
    expect(edges[0].subject).toBe(edges[1].subject)
    expect(classOf(ops, edges[0].subject)).toEqual({ type: 'class', id: 'GO:0003674' })
    expect(classOf(ops, edges[1].object)).toEqual({ type: 'class', id: 'GO:0006915' })
    // Each fact gets its own evidence individual.
    expect(addedIndividuals(ops).filter(i => (i.expression as { id: string }).id === 'ECO:0000314')).toHaveLength(2)
  })

  it('stores "located in" from the gene product, with a complement for NOT', () => {
    const ops = buildCreateAnnotationsOperations(
      [input({ goTermId: 'GO:0005737', relationId: InverseRelations.LOCATED_IN, isComplement: true })],
      MODEL
    )
    const [edge] = addedEdges(ops)
    expect(edge.predicate).toBe('RO:0001025')
    expect(classOf(ops, edge.subject)).toEqual({ type: 'class', id: 'UniProtKB:P1' })
    expect(classOf(ops, edge.object)).toEqual({
      type: 'complement',
      filler: { type: 'class', id: 'GO:0005737' },
    })
  })

  it('adds extensions, comments and with/from to every fact', () => {
    const ops = buildCreateAnnotationsOperations(
      [
        input({
          extensions: [{ relationId: 'RO:0002233', termId: 'UniProtKB:P9' }],
          comments: ['a note', 'a note', ' '],
          evidence: {
            evidenceCodeId: 'ECO:0000314',
            sources: ['PMID:1'],
            withFrom: 'uniprotkb:Q1 | UniProtKB:Q2',
          },
        }),
      ],
      MODEL
    )
    expect(addedEdges(ops).map(e => e.predicate)).toEqual(['RO:0002333', 'RO:0002233'])

    const commentOps = ofKind(ops, OperationEntity.EDGE, OperationType.ADD_ANNOTATION).filter(op =>
      (op.arguments.values as { key: string }[]).some(v => v.key === AnnotationKey.COMMENT)
    )
    expect(commentOps).toHaveLength(2)
    expect(commentOps[0].arguments.values).toEqual([{ key: 'comment', value: 'a note' }])

    const withValues = ofKind(ops, OperationEntity.INDIVIDUAL, OperationType.ADD_ANNOTATION)
      .flatMap(op => op.arguments.values as { key: string; value: string }[])
      .filter(v => v.key === AnnotationKey.WITH)
    expect(withValues).toEqual([
      { key: 'with', value: 'UniProtKB:Q1|UniProtKB:Q2' },
      { key: 'with', value: 'UniProtKB:Q1|UniProtKB:Q2' },
    ])
  })

  it('gives each evidence row its own annotation and titles an untitled model once', () => {
    const ops = buildCreateAnnotationsOperations([input(), input()], MODEL, {
      title: 'enabled by ABC1 Hsap',
    })
    expect(addedEdges(ops)).toHaveLength(2)
    const titles = ofKind(ops, OperationEntity.MODEL, OperationType.ADD_ANNOTATION)
    expect(titles).toHaveLength(1)
    expect(titles[0].arguments.values).toEqual([{ key: 'title', value: 'enabled by ABC1 Hsap' }])
  })

  it('keeps an existing title', () => {
    const ops = buildCreateAnnotationsOperations([input()], MODEL, {
      title: 'enabled by X',
      currentModelTitle: 'My model',
    })
    expect(ofKind(ops, OperationEntity.MODEL, OperationType.ADD_ANNOTATION)).toHaveLength(0)
  })

  it('splits a multi-reference evidence into separate sources on create', () => {
    const ops = buildCreateAnnotationsOperations(
      [input({ evidence: { evidenceCodeId: 'ECO:0000314', sources: ['PMID:1| PMID:2'], withFrom: '' } })],
      MODEL
    )
    const evidenceValues = ofKind(ops, OperationEntity.INDIVIDUAL, OperationType.ADD_ANNOTATION)[0]
      .arguments.values
    expect(evidenceValues).toEqual([
      { key: 'source', value: 'PMID:1' },
      { key: 'source', value: 'PMID:2' },
    ])
  })

  it('creates nothing when no relation applies, rather than orphan individuals', () => {
    expect(buildCreateAnnotationsOperations([input({ relationId: '' })], MODEL)).toEqual([])
  })
})

describe('buildCopyAnnotationToGenesOperations', () => {
  it('copies relation, NOT, evidence, extensions and comments onto each gene', () => {
    const source = byGp('ALPHA1 Hsap')
    const ops = buildCopyAnnotationToGenesOperations(source, ['UniProtKB:A', 'UniProtKB:B'], MODEL)

    const enabledBy = addedEdges(ops).filter(e => e.predicate === 'RO:0002333')
    expect(enabledBy.map(e => classOf(ops, e.object))).toEqual([
      { type: 'class', id: 'UniProtKB:A' },
      { type: 'class', id: 'UniProtKB:B' },
    ])
    expect(classOf(ops, enabledBy[0].subject)).toEqual({
      type: 'complement',
      filler: { type: 'class', id: 'GO:0004672' },
    })
    expect(addedEdges(ops).map(e => e.predicate).sort()).toEqual(
      ['BFO:0000066', 'BFO:0000066', 'RO:0002233', 'RO:0002233', 'RO:0002333', 'RO:0002333'].sort()
    )
    // No title for copies.
    expect(ofKind(ops, OperationEntity.MODEL, OperationType.ADD_ANNOTATION)).toHaveLength(0)
  })
})

describe('edit builders', () => {
  it('swaps a GO term class and keeps its NOT', () => {
    const { goTerm } = byGp('ALPHA1 Hsap')
    const ops = buildEditNodeTypeOperations(goTerm, 'GO:0004674', MODEL)
    expect(ops.slice(0, 2)).toEqual([
      {
        entity: 'individual',
        operation: 'remove-type',
        arguments: {
          individual: saeUid('mf1'),
          expressions: [{ type: 'complement', filler: { type: 'class', id: 'GO:0004672' } }],
          'model-id': MODEL,
        },
      },
      {
        entity: 'individual',
        operation: 'add-type',
        arguments: {
          individual: saeUid('mf1'),
          expressions: [{ type: 'complement', filler: { type: 'class', id: 'GO:0004674' } }],
          'model-id': MODEL,
        },
      },
    ])
  })

  it('toggles the NOT qualifier', () => {
    const ops = buildToggleComplementOperations(byGp('BETA2 Hsap').goTerm, MODEL)
    expect(ops[0].arguments.expressions).toEqual([{ type: 'class', id: 'GO:0006915' }])
    expect(ops[1].arguments.expressions).toEqual([
      { type: 'complement', filler: { type: 'class', id: 'GO:0006915' } },
    ])
  })

  it('updates the evidence code on every evidence of the annotation', () => {
    const annotation = byGp('ALPHA1 Hsap')
    const evidences = getAnnotationEvidence(annotation)
    expect(evidences.map(e => e.uid)).toEqual(['ev1', 'ev2', 'ev3'].map(saeUid))

    const ops = buildEditEvidenceCodeOperations(evidences, 'ECO:0000250', MODEL, user)
    expect(ofKind(ops, OperationEntity.INDIVIDUAL, OperationType.ADD_TYPE)).toHaveLength(3)
    const credit = ofKind(ops, OperationEntity.INDIVIDUAL, OperationType.ADD_ANNOTATION)
    expect(credit[0].arguments.values).toEqual([
      { key: 'contributor', value: user.orcid },
      { key: 'providedBy', value: user.groupUrl },
    ])
  })

  it('replaces every source of a reference and formats the new one', () => {
    const evidences = getAnnotationEvidence(byGp('DELTA4 Hsap'))
    const ops = buildEditEvidenceAnnotationOperations(
      evidences.slice(0, 1),
      AnnotationKey.SOURCE,
      ' PMID : 42 ',
      MODEL
    )
    const removed = ofKind(ops, OperationEntity.INDIVIDUAL, OperationType.REMOVE_ANNOTATION).map(
      op => op.arguments.values
    )
    expect(removed).toEqual([
      [{ key: 'source', value: 'PMID:444' }],
      [{ key: 'source', value: 'PMID:555' }],
    ])
    expect(ofKind(ops, OperationEntity.INDIVIDUAL, OperationType.ADD_ANNOTATION)[0].arguments.values).toEqual([
      { key: 'source', value: 'PMID:42' },
    ])
  })

  it('writes several references as separate sources', () => {
    const evidences = getAnnotationEvidence(byGp('DELTA4 Hsap')).slice(0, 1)
    const ops = buildEditEvidenceAnnotationOperations(
      evidences,
      AnnotationKey.SOURCE,
      'PMID:555| PMID:9 ',
      MODEL
    )
    expect(ofKind(ops, OperationEntity.INDIVIDUAL, OperationType.ADD_ANNOTATION)[0].arguments.values).toEqual([
      { key: 'source', value: 'PMID:555' },
      { key: 'source', value: 'PMID:9' },
    ])
  })

  it('clears with/from without adding an empty value', () => {
    const evidences = getAnnotationEvidence(byGp('ALPHA1 Hsap'))
    const ops = buildEditEvidenceAnnotationOperations(evidences, AnnotationKey.WITH, '', MODEL)
    expect(ofKind(ops, OperationEntity.INDIVIDUAL, OperationType.REMOVE_ANNOTATION)).toHaveLength(3)
    expect(ofKind(ops, OperationEntity.INDIVIDUAL, OperationType.ADD_ANNOTATION)).toHaveLength(0)
  })
})

describe('buildEditRelationOperations', () => {
  it('turns "enables" into "contributes to" by reversing the fact', () => {
    const annotation = byGp('ALPHA1 Hsap')
    const ops = buildEditRelationOperations(annotation, InverseRelations.CONTRIBUTES_TO, MODEL)

    expect(ofKind(ops, OperationEntity.EDGE, OperationType.REMOVE)[0].arguments).toMatchObject({
      subject: saeUid('mf1'),
      predicate: 'RO:0002333',
      object: saeUid('gp1'),
    })
    expect(addedEdges(ops)).toEqual([
      { subject: saeUid('gp1'), predicate: 'RO:0002326', object: saeUid('mf1') },
    ])
    // The old fact's evidence individual is removed, a copy is attached to the new fact.
    expect(
      ofKind(ops, OperationEntity.INDIVIDUAL, OperationType.REMOVE).map(op => op.arguments.individual)
    ).toEqual([saeUid('ev1')])
    expect(classOf(ops, addedIndividuals(ops)[0].variable)).toEqual({
      type: 'class',
      id: 'ECO:0000314',
    })
  })

  it('turns "contributes to" back into "enables"', () => {
    const ops = buildEditRelationOperations(byGp('ZETA6 Hsap'), InverseRelations.ENABLES, MODEL)
    expect(addedEdges(ops)).toEqual([
      { subject: saeUid('mf6'), predicate: 'RO:0002333', object: saeUid('gp6') },
    ])
  })

  it('swaps the root-MF edge for "acts upstream of"', () => {
    const ops = buildEditRelationOperations(byGp('BETA2 Hsap'), InverseRelations.ACTS_UPSTREAM_OF, MODEL)
    expect(addedEdges(ops)).toEqual([
      { subject: saeUid('mf2'), predicate: 'RO:0002411', object: saeUid('bp2') },
    ])
  })

  it('refuses a change that would need a root MF added or removed', () => {
    expect(buildEditRelationOperations(byGp('DELTA4 Hsap'), InverseRelations.INVOLVED_IN, MODEL)).toEqual([])
  })
})

describe('extension, comment and delete builders', () => {
  it('adds an extension with the annotation evidence and comments', () => {
    const annotation = byGp('ALPHA1 Hsap')
    const ops = buildAddExtensionOperations(annotation, 'RO:0002092', 'GO:0000080', MODEL)
    expect(addedEdges(ops)[0]).toMatchObject({ subject: saeUid('mf1'), predicate: 'RO:0002092' })
    expect(classOf(ops, addedEdges(ops)[0].object)).toEqual({ type: 'class', id: 'GO:0000080' })
    const values = ofKind(ops, OperationEntity.EDGE, OperationType.ADD_ANNOTATION).flatMap(
      op => op.arguments.values as { key: string }[]
    )
    expect(values.map(v => v.key).sort()).toEqual(['comment', 'evidence'])
  })

  it('deletes an extension fact and its term', () => {
    const [extension] = byGp('ALPHA1 Hsap').extensions
    const ops = buildDeleteExtensionOperations(extension, MODEL)
    expect(ops.map(op => `${op.entity}:${op.operation}`)).toEqual([
      'edge:remove',
      'individual:remove',
      'model:store',
    ])
    expect(ops[1].arguments.individual).toBe(saeUid('x1'))
  })

  it('replaces the comments on every fact', () => {
    const annotation = byGp('ALPHA1 Hsap')
    const ops = buildReplaceCommentsOperations(annotation.edges, ['new note'], MODEL)
    expect(ofKind(ops, OperationEntity.EDGE, OperationType.REMOVE_ANNOTATION)).toHaveLength(3)
    expect(ofKind(ops, OperationEntity.EDGE, OperationType.ADD_ANNOTATION)).toHaveLength(3)
  })

  it('deletes an annotation: start fact, then its individuals', () => {
    const annotation = byGp('BETA2 Hsap')
    const ops = buildDeleteAnnotationOperations(
      annotation,
      getDeletableNodeUids(annotation, annotations),
      MODEL
    )
    expect(ops[0]).toMatchObject({ entity: 'edge', operation: 'remove' })
    expect(
      ofKind(ops, OperationEntity.INDIVIDUAL, OperationType.REMOVE)
        .map(op => op.arguments.individual)
        .sort()
    ).toEqual(['mf2', 'gp2', 'bp2', 'ph2'].map(saeUid).sort())
  })
})
