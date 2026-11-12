import { describe, it, expect } from 'vitest'
import {
  findRelation,
  getExtensionPredicatesForRoots,
  getObjectRange,
  getPredicates,
  getTermRelations,
  SHAPE_PREDICATES,
  SHAPES,
} from '@/features/annotations/services/shapeRules'

const GP = ['CHEBI:33695', 'CHEBI:24431']
const COMPLEX = ['GO:0032991']
const labels = (entities: { label: string }[]) => entities.map(e => e.label)

describe('getTermRelations — gene product to GO term', () => {
  it('offers enables / contributes to for a molecular function', () => {
    expect(labels(getTermRelations(GP, ['GO:0003674'], true))).toEqual(['enables', 'contributes to'])
  })

  it('offers involved in and the acts-upstream relations for a biological process', () => {
    expect(labels(getTermRelations(GP, ['GO:0008150'], true))).toEqual([
      'involved in',
      'acts upstream of',
      'acts upstream of or within',
      'acts upstream of, positive effect',
      'acts upstream of or within, positive effect',
      'acts upstream of or within, negative effect',
      'acts upstream of, negative effect',
    ])
  })

  it('offers is active in / located in for a cellular component', () => {
    expect(labels(getTermRelations(GP, ['GO:0005575'], true))).toEqual(['is active in', 'located in'])
  })

  it('applies the same rules to a protein complex as the annotated entity', () => {
    expect(labels(getTermRelations(COMPLEX, ['GO:0032991'], true))).toEqual(['part of'])
  })

  it('offers every relation before a GO term is chosen, as the Angular form did', () => {
    expect(getTermRelations(GP, [], true)).toHaveLength(12)
  })
})

describe('getObjectRange', () => {
  it('limits the GO term to the relation', () => {
    expect(getObjectRange(GP, 'RO:0002327', true)).toEqual(['GO:0003674'])
    expect(getObjectRange(GP, 'RO:0001025', true)).toEqual(['GO:0005575'])
  })

  it('is every aspect for a gene product without a relation', () => {
    expect(getObjectRange(GP, null, true).sort()).toEqual(
      ['GO:0003674', 'GO:0005575', 'GO:0008150', 'GO:0032991'].sort()
    )
  })

  it('is empty until there is a subject', () => {
    expect(getObjectRange([], null, true)).toEqual([])
  })

  it('keeps only categories the shape terms know', () => {
    // `is active in` also allows a shapes-only class with no shape term.
    expect(getObjectRange(['CHEBI:33695'], 'RO:0002432')).toEqual(['UBERON:0001062'])
  })
})

describe('extension relations', () => {
  it('lists extension-eligible relations from an MF, leaving out enabled by', () => {
    const relations = labels(getTermRelations(['GO:0003674'], []))
    expect(relations).toEqual(
      expect.arrayContaining(['part of', 'occurs in', 'has input', 'happens during'])
    )
    expect(relations).not.toContain('enabled by')
  })

  it('narrows to the extension term type', () => {
    expect(labels(getTermRelations(['GO:0003674'], ['GO:0044848']))).toEqual(['happens during'])
  })

  // Issue #85: these rules belong to a BP subclass, which root types alone never match.
  it('offers a subclass rule only with the GO term ancestry', () => {
    const development = ['GO:0048538', 'GO:0048856', 'GO:0032502', 'GO:0008150']
    expect(labels(getTermRelations(['GO:0008150'], []))).not.toContain('results in development of')
    expect(labels(getTermRelations(development, []))).toContain('results in development of')
    expect(labels(getTermRelations(development, []))).not.toContain('results in movement of')
  })
})

describe('getExtensionPredicatesForRoots', () => {
  it("includes the extension rules of a BP's subclasses", () => {
    const predicates = getExtensionPredicatesForRoots(['GO:0008150'])
    for (const id of [
      'RO:0002296', // results in development of (GO:0048856)
      'RO:0002315', // results in acquisition of features of (GO:0030154)
      'RO:0002565', // results in movement of (GO:0040011)
      'RO:0002588', // results in assembly of (GO:0022607)
      'BFO:0000050', // part of (the root itself)
    ]) {
      expect(predicates.has(id), id).toBe(true)
    }
  })

  it("includes an MF subclass's rules but never the excluded ones", () => {
    const predicates = getExtensionPredicatesForRoots(['GO:0003674'])
    expect(predicates.has('RO:0002313')).toBe(true) // transports or maintains localization of
    expect(predicates.has('RO:0002333')).toBe(false) // enabled by
    expect(predicates.has('BFO:0000051')).toBe(false) // has part
    expect(predicates.has('RO:0002411')).toBe(false) // causally upstream of
  })

  it("keeps to the term's own roots", () => {
    expect(getExtensionPredicatesForRoots(['GO:0003674']).has('RO:0002296')).toBe(false)
    expect(getExtensionPredicatesForRoots([]).size).toBe(0)
  })
})

describe('getPredicates / SHAPE_PREDICATES', () => {
  it('returns every predicate when no ids are given', () => {
    expect(getPredicates(SHAPES, undefined, undefined, false).length).toBe(SHAPE_PREDICATES.size)
    expect(SHAPE_PREDICATES.has('RO:0002333')).toBe(true)
  })
})

describe('findRelation', () => {
  it('labels from the shape terms, then the known relations, then the id', () => {
    expect(findRelation('RO:0001025').label).toBe('located in')
    expect(findRelation('RO:0002327').label).toBe('enables')
    expect(findRelation('RO:9999999').label).toBe('RO:9999999')
  })
})
