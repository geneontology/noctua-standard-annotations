import { describe, it, expect } from 'vitest'
import {
  extractAnnotations,
  getDeletableNodeUids,
  isGeneProductLike,
  leavesModelEmpty,
} from '@/features/annotations/services/annotationExtraction'
import { AnnotationUnitType } from '@/features/annotations/models/annotation'
import { transformGraphData } from '@/features/gocam/services/graphServices'
import {
  actsUpstreamPairRaw,
  gocamMixedRaw,
  loadModel,
  mfWithBpExtensionRaw,
  saeModelRaw,
  singleMfRaw,
} from '@tests/fixtures/models'
import { rawEvidence, rawFact, rawIndividual, saeUid } from '@tests/fixtures/saeModel'

const summarize = (raw: unknown) =>
  extractAnnotations(loadModel(raw)).map(a => ({
    gp: a.gp.label,
    relation: a.relation.label,
    term: a.goTerm.label,
  }))

describe('extractAnnotations — SAE-shaped model', () => {
  const annotations = extractAnnotations(loadModel(saeModelRaw))
  const byGp = (label: string) => annotations.find(a => a.gp.label === label)!

  it('reads one row per start edge, in model order', () => {
    expect(summarize(saeModelRaw)).toEqual([
      { gp: 'ALPHA1 Hsap', relation: 'enables', term: 'protein kinase activity' },
      { gp: 'BETA2 Hsap', relation: 'involved in', term: 'apoptotic process' },
      {
        gp: 'gamma3 Drer',
        relation: 'acts upstream of or within',
        term: 'anatomical structure development',
      },
      { gp: 'DELTA4 Hsap', relation: 'located in', term: 'cytoplasm' },
      { gp: 'EPSILON5 Hsap', relation: 'is active in', term: 'plasma membrane' },
      {
        gp: 'ZETA6 Hsap',
        relation: 'contributes to',
        term: 'DNA-binding transcription factor activity',
      },
      { gp: 'ETA7 Hsap', relation: 'part of', term: 'transcription regulator complex' },
      { gp: 'Mediator complex', relation: 'located in', term: 'nucleus' },
      { gp: 'THETA9 Hsap', relation: 'enables', term: 'molecular_function' },
    ])
  })

  it('reads the NOT qualifier from the GO term individual', () => {
    expect(byGp('ALPHA1 Hsap').isComplement).toBe(true)
    expect(byGp('BETA2 Hsap').isComplement).toBe(false)
  })

  it('classifies how each annotation is stored', () => {
    expect(byGp('ALPHA1 Hsap').unitType).toBe(AnnotationUnitType.DEFAULT)
    expect(byGp('gamma3 Drer').unitType).toBe(AnnotationUnitType.BP_ONLY)
    expect(byGp('DELTA4 Hsap').unitType).toBe(AnnotationUnitType.CC_ONLY)
  })

  it('uses the root-MF edge as the term edge for "involved in"', () => {
    const a = byGp('BETA2 Hsap')
    expect(a.startEdge.id).toBe('RO:0002333')
    expect(a.termEdge.id).toBe('BFO:0000050')
    expect(a.termEdge.targetId).toBe(saeUid('bp2'))
    expect(a.relation.id).toBe('RO:0002331')
  })

  it('shows the start edge evidence', () => {
    expect(byGp('ALPHA1 Hsap').evidence).toMatchObject({
      evidenceCode: { id: 'ECO:0000314' },
      reference: 'PMID:111',
      with: 'UniProtKB:Q00001',
    })
    expect(byGp('DELTA4 Hsap').evidence?.reference).toBe('PMID:555| PMID:444')
  })

  it('reads extensions from the GO term only', () => {
    expect(byGp('ALPHA1 Hsap').extensions.map(e => [e.relation.label, e.term.label])).toEqual([
      ['has input', 'SUBSTRATE1 Hsap'],
      ['occurs in', 'nucleus'],
    ])
    expect(byGp('BETA2 Hsap').extensions.map(e => e.term.label)).toEqual(['mitotic G1 phase'])
    expect(byGp('DELTA4 Hsap').extensions.map(e => e.term.label)).toEqual(['brain'])
    expect(byGp('THETA9 Hsap').extensions).toEqual([])
  })

  it('collects comments across every fact, once each', () => {
    expect(byGp('ALPHA1 Hsap').comments).toEqual(['checked'])
    expect(byGp('THETA9 Hsap').comments).toEqual(['first comment', 'second comment'])
  })

  it('dates an annotation by its latest individual or evidence date', () => {
    expect(byGp('BETA2 Hsap').date).toBe('2024-03-05')
    expect(byGp('DELTA4 Hsap').date).toBe('2024-05-02')
    expect(byGp('THETA9 Hsap').date).toBe('2024-01-10')
  })

  it('offers the relations the gene product → term rules allow', () => {
    expect(byGp('ALPHA1 Hsap').relationChoices.map(r => r.label)).toEqual([
      'enables',
      'contributes to',
    ])
    expect(byGp('ETA7 Hsap').relationChoices.map(r => r.label)).toEqual([
      'is active in',
      'located in',
      'part of',
    ])
  })

  it('collects the subgraph Delete removes', () => {
    const a = byGp('ALPHA1 Hsap')
    expect(a.nodes.map(n => n.uid).sort()).toEqual(['mf1', 'gp1', 'x1', 'cc1'].map(saeUid).sort())
    expect(a.edges).toHaveLength(3)
    expect(getDeletableNodeUids(a, annotations).sort()).toEqual(a.nodes.map(n => n.uid).sort())
  })

  it('leaves the unconnected chemical out', () => {
    expect(annotations.some(a => a.nodes.some(n => n.uid === saeUid('chem')))).toBe(false)
  })
})

describe('extractAnnotations — real barista-dev models', () => {
  it('reads SAE "acts upstream of or within" annotations', () => {
    const annotations = extractAnnotations(loadModel(actsUpstreamPairRaw))
    expect(annotations.map(a => [a.gp.label, a.relation.label, a.goTerm.label])).toEqual([
      ['tgds Drer', 'acts upstream of or within', 'regulation of cartilage development'],
      ['tgds Drer', 'acts upstream of or within', 'rhamnose biosynthetic process'],
    ])
    expect(annotations[0].evidence?.with).toBe(
      'ZFIN:ZDB-CRISPR-260615-3,ZFIN:ZDB-CRISPR-260615-4,ZFIN:ZDB-CRISPR-260615-5'
    )
    // Each annotation has its own individuals.
    const [a, b] = annotations
    expect(a.nodes.some(n => b.nodes.includes(n))).toBe(false)
  })

  it('shows a direct MF part_of BP as an extension, not the nested BP', () => {
    const [a] = extractAnnotations(loadModel(mfWithBpExtensionRaw))
    expect(a.relation.label).toBe('enables')
    expect(a.goTerm.label).toBe('endoplasmic reticulum-lipid droplet tether activity')
    expect(a.extensions.map(e => [e.relation.label, e.term.label])).toEqual([
      ['part of', 'DNA-templated DNA replication'],
    ])
    // The nested BP is still part of the annotation's subgraph.
    expect(a.nodes.map(n => n.label)).toContain('G0 to G1 transition')
  })

  it('reads the smallest model', () => {
    expect(summarize(singleMfRaw)).toEqual([
      {
        gp: 'BTK Hsap',
        relation: 'enables',
        term: 'phosphatidylinositol-3,4,5-trisphosphate binding',
      },
    ])
  })

  it('keeps GO-CAM activities apart', () => {
    const annotations = extractAnnotations(loadModel(gocamMixedRaw))
    expect(annotations.length).toBeGreaterThan(0)
    for (const annotation of annotations) {
      // No subgraph contains another annotation's start edge.
      for (const other of annotations) {
        if (other === annotation) continue
        expect(annotation.edges.some(e => e.uid === other.startEdge.uid)).toBe(false)
      }
    }
  })
})

describe('extractAnnotations — shared individuals', () => {
  // One gene product with two CC edges (as another editor might leave it).
  const raw = {
    'modified-p': false,
    id: 'gomodel:shared',
    individuals: [
      rawIndividual('gp', 'UniProtKB:P1', 'SHARED Hsap', ['CHEBI:33695', 'CHEBI:24431']),
      rawIndividual('a', 'GO:0005634', 'nucleus', ['UBERON:0001062', 'GO:0005575']),
      rawIndividual('b', 'GO:0005737', 'cytoplasm', ['UBERON:0001062', 'GO:0005575']),
      rawEvidence('e1', 'ECO:0000314', 'IDA', ['PMID:1']),
      rawEvidence('e2', 'ECO:0000314', 'IDA', ['PMID:2']),
    ],
    facts: [
      rawFact('gp', 'RO:0001025', 'located in', 'a', { evidence: ['e1'] }),
      rawFact('gp', 'RO:0001025', 'located in', 'b', { evidence: ['e2'] }),
    ],
    annotations: [],
  }

  it('reads each CC edge as its own annotation', () => {
    const annotations = extractAnnotations(transformGraphData(raw))
    expect(annotations.map(a => [a.goTerm.label, a.evidence?.reference])).toEqual([
      ['nucleus', 'PMID:1'],
      ['cytoplasm', 'PMID:2'],
    ])
    expect(annotations[0].edges).toHaveLength(1)
  })

  it("never deletes the other annotation's gene product", () => {
    const annotations = extractAnnotations(transformGraphData(raw))
    expect(getDeletableNodeUids(annotations[0], annotations)).toEqual([saeUid('a')])
  })
})

describe('extractAnnotations — terms Minerva cannot classify', () => {
  it('reads "acts upstream of" to an obsolete BP (no root types)', () => {
    const raw = {
      'modified-p': false,
      id: 'gomodel:obsolete',
      individuals: [
        rawIndividual('mf', 'GO:0003674', 'molecular_function', ['GO:0003674']),
        rawIndividual('gp', 'UniProtKB:P1', 'OLD1 Hsap', ['CHEBI:33695']),
        rawIndividual('bp', 'GO:9999999', 'obsolete process', []),
        rawEvidence('e1', 'ECO:0000315', 'IMP', ['PMID:1']),
        rawEvidence('e2', 'ECO:0000315', 'IMP', ['PMID:1']),
      ],
      facts: [
        rawFact('mf', 'RO:0002333', 'enabled by', 'gp', { evidence: ['e1'] }),
        rawFact('mf', 'RO:0002418', 'causally upstream of or within', 'bp', { evidence: ['e2'] }),
      ],
      annotations: [],
    }
    const [annotation] = extractAnnotations(transformGraphData(raw))
    expect(annotation.relation.label).toBe('acts upstream of or within')
    expect(annotation.goTerm.label).toBe('obsolete process')
    expect(annotation.nodes.map(n => n.uid)).toContain(saeUid('bp'))
  })
})

describe('extractAnnotations — one MF enabled by two gene products', () => {
  const raw = {
    'modified-p': false,
    id: 'gomodel:twoenablers',
    individuals: [
      rawIndividual('mf', 'GO:0004672', 'protein kinase activity', ['GO:0003674']),
      rawIndividual('gp1', 'UniProtKB:P1', 'ONE Hsap', ['CHEBI:33695', 'CHEBI:24431']),
      rawIndividual('gp2', 'UniProtKB:P2', 'TWO Hsap', ['CHEBI:33695', 'CHEBI:24431']),
      rawIndividual('cc', 'GO:0005634', 'nucleus', ['UBERON:0001062', 'GO:0005575']),
    ],
    facts: [
      rawFact('mf', 'RO:0002333', 'enabled by', 'gp1'),
      rawFact('mf', 'RO:0002333', 'enabled by', 'gp2'),
      rawFact('mf', 'BFO:0000066', 'occurs in', 'cc'),
    ],
    annotations: [],
  }

  it('gives each gene product its own row with the shared extension', () => {
    const annotations = extractAnnotations(transformGraphData(raw))
    expect(annotations.map(a => [a.gp.label, a.extensions.map(e => e.term.label)])).toEqual([
      ['ONE Hsap', ['nucleus']],
      ['TWO Hsap', ['nucleus']],
    ])
  })

  it('deletes only what the other row does not use', () => {
    const annotations = extractAnnotations(transformGraphData(raw))
    expect(getDeletableNodeUids(annotations[0], annotations)).toEqual([saeUid('gp1')])
  })
})

describe('extractAnnotations — GO-CAM root MF with several term edges', () => {
  // A Pathway Editor activity: root MF part_of a BP and occurs_in a CC. Minerva
  // returns facts in no fixed order, so the row mustn't depend on which comes last.
  const raw = (factOrder: 'bp-first' | 'cc-first') => {
    const partOf = rawFact('mf', 'BFO:0000050', 'part of', 'bp')
    const occursIn = rawFact('mf', 'BFO:0000066', 'occurs in', 'cc')
    return {
      'modified-p': false,
      id: 'gomodel:rootmf',
      individuals: [
        rawIndividual('mf', 'GO:0003674', 'molecular_function', ['GO:0003674']),
        rawIndividual('gp', 'UniProtKB:P1', 'ROOT1 Hsap', ['CHEBI:33695', 'CHEBI:24431']),
        rawIndividual('bp', 'GO:0006915', 'apoptotic process', ['GO:0008150']),
        rawIndividual('cc', 'GO:0005634', 'nucleus', ['UBERON:0001062', 'GO:0005575']),
      ],
      facts: [
        rawFact('mf', 'RO:0002333', 'enabled by', 'gp'),
        ...(factOrder === 'bp-first' ? [partOf, occursIn] : [occursIn, partOf]),
      ],
      annotations: [],
    }
  }

  it('reads "involved in" whatever the fact order', () => {
    for (const order of ['bp-first', 'cc-first'] as const) {
      const [annotation] = extractAnnotations(transformGraphData(raw(order)))
      expect([annotation.relation.label, annotation.goTerm.label]).toEqual([
        'involved in',
        'apoptotic process',
      ])
    }
  })

  it('shows an unnamed root-MF edge without a relation id, so it is not editable', () => {
    const onlyOccursIn = raw('cc-first')
    onlyOccursIn.facts = onlyOccursIn.facts.filter(f => f.property !== 'BFO:0000050')
    const [annotation] = extractAnnotations(transformGraphData(onlyOccursIn))
    expect(annotation.relation).toEqual({ id: '', label: 'occurs in' })
    expect(annotation.goTerm.label).toBe('nucleus')
  })
})

describe('extractAnnotations — causal extensions', () => {
  const raw = {
    'modified-p': false,
    id: 'gomodel:causal',
    individuals: [
      rawIndividual('mf', 'GO:0003674', 'molecular_function', ['GO:0003674']),
      rawIndividual('gp', 'UniProtKB:P1', 'CAUSE1 Hsap', ['CHEBI:33695', 'CHEBI:24431']),
      rawIndividual('bp', 'GO:0006915', 'apoptotic process', ['GO:0008150']),
      rawIndividual('bp2', 'GO:0007165', 'signal transduction', ['GO:0008150']),
      rawIndividual('mf2', 'GO:0004672', 'protein kinase activity', ['GO:0003674']),
      rawIndividual('mf3', 'GO:0005515', 'protein binding', ['GO:0003674']),
      rawIndividual('gp2', 'UniProtKB:P2', 'CAUSE2 Hsap', ['CHEBI:33695', 'CHEBI:24431']),
      rawIndividual('gp3', 'UniProtKB:P3', 'CAUSE3 Hsap', ['CHEBI:33695', 'CHEBI:24431']),
    ],
    facts: [
      rawFact('mf', 'RO:0002333', 'enabled by', 'gp'),
      rawFact('mf', 'BFO:0000050', 'part of', 'bp'),
      // Added through SAE's Add Extension: a fresh BP individual.
      rawFact('bp', 'RO:0002211', 'regulates', 'bp2'),
      // A GO-CAM's activity → activity edge.
      rawFact('mf2', 'RO:0002333', 'enabled by', 'gp2'),
      rawFact('mf3', 'RO:0002333', 'enabled by', 'gp3'),
      rawFact('mf2', 'RO:0002629', 'directly positively regulates', 'mf3'),
    ],
    annotations: [],
  }
  const annotations = extractAnnotations(transformGraphData(raw))
  const byGp = (label: string) => annotations.find(a => a.gp.label === label)!

  it('reads a causal extension SAE added to the GO term', () => {
    const involved = byGp('CAUSE1 Hsap')
    expect(involved.extensions.map(e => [e.relation.label, e.term.label])).toEqual([
      ['regulates', 'signal transduction'],
    ])
    expect(getDeletableNodeUids(involved, annotations)).toContain(saeUid('bp2'))
  })

  it("leaves another annotation's activity out", () => {
    expect(byGp('CAUSE2 Hsap').extensions).toEqual([])
    expect(byGp('CAUSE2 Hsap').nodes.map(n => n.uid)).not.toContain(saeUid('mf3'))
  })
})

describe('leavesModelEmpty', () => {
  it("is true only for the model's last annotation", () => {
    const sae = loadModel(saeModelRaw)
    const saeRows = extractAnnotations(sae)
    expect(leavesModelEmpty(sae, saeRows[0], getDeletableNodeUids(saeRows[0], saeRows))).toBe(false)

    const single = loadModel(singleMfRaw)
    const [only] = extractAnnotations(single)
    expect(leavesModelEmpty(single, only, getDeletableNodeUids(only, [only]))).toBe(true)
  })
})

describe('isGeneProductLike', () => {
  const node = (id: string, rootTypes: string[]) => ({
    uid: id,
    id,
    label: id,
    rootTypes,
    isComplement: false,
    contributors: [],
    groups: [],
    sources: [],
    comments: [],
  })

  it('accepts gene products and non-GO complexes, not GO complex terms', () => {
    expect(isGeneProductLike(node('UniProtKB:P1', ['CHEBI:33695']))).toBe(true)
    expect(isGeneProductLike(node('ComplexPortal:CPX-1', ['GO:0032991']))).toBe(true)
    expect(isGeneProductLike(node('GO:0005667', ['GO:0032991', 'GO:0005575']))).toBe(false)
  })
})
