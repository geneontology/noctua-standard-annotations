/**
 * A synthetic m3Batch `data` payload shaped the way SAE writes models: every
 * annotation has its own individuals, every fact carries its own evidence
 * individual. One annotation per kind the table has to read.
 */

export const SAE_MODEL_ID = 'gomodel:sae000000001'

const GP_ROOTS = ['CHEBI:33695', 'CHEBI:24431', 'CHEBI:36080']
const MF_ROOTS = ['GO:0003674', 'obo:go/extensions/reacto.owl#molecular_event']
const BP_ROOTS = ['GO:0008150']
const CC_ROOTS = ['UBERON:0001062', 'GO:0110165', 'GO:0005575']
const COMPLEX_ROOTS = ['GO:0005575', 'GO:0032991']

const CURATOR = 'https://orcid.org/0000-0000-0000-0001'
const GROUP = 'http://geneontology.org'

const uid = (n: string) => `${SAE_MODEL_ID}/${n}`

interface RawAnnotation {
  key: string
  value: string
  'value-type'?: string
}

const meta = (date: string): RawAnnotation[] => [
  { key: 'contributor', value: CURATOR },
  { key: 'providedBy', value: GROUP },
  { key: 'date', value: date },
]

export const rawIndividual = (
  n: string,
  classId: string,
  label: string,
  rootTypes: string[],
  options: { complement?: boolean; date?: string; annotations?: RawAnnotation[] } = {}
) => {
  const cls = { type: 'class', id: classId, label }
  return {
    id: uid(n),
    type: [options.complement ? { type: 'complement', filler: cls } : cls],
    'root-type': rootTypes.map(id => ({ type: 'class', id, label: id })),
    annotations: [...meta(options.date ?? '2024-01-10'), ...(options.annotations ?? [])],
  }
}

export const rawEvidence = (
  n: string,
  eco: string,
  ecoLabel: string,
  sources: string[],
  options: { withFrom?: string; date?: string } = {}
) =>
  rawIndividual(n, eco, ecoLabel, ['ECO:0000000'], {
    date: options.date,
    annotations: [
      ...sources.map(value => ({ key: 'source', value })),
      ...(options.withFrom ? [{ key: 'with', value: options.withFrom }] : []),
    ],
  })

export const rawFact = (
  subject: string,
  property: string,
  propertyLabel: string,
  object: string,
  options: { evidence?: string[]; comments?: string[]; date?: string } = {}
) => ({
  subject: uid(subject),
  property,
  'property-label': propertyLabel,
  object: uid(object),
  annotations: [
    ...(options.evidence ?? []).map(ev => ({ key: 'evidence', value: uid(ev), 'value-type': 'IRI' })),
    ...(options.comments ?? []).map(value => ({ key: 'comment', value })),
    ...meta(options.date ?? '2024-01-10'),
  ],
})

const IDA = ['ECO:0000314', 'direct assay evidence used in manual assertion'] as const
const IMP = ['ECO:0000315', 'mutant phenotype evidence used in manual assertion'] as const
const ND = ['ECO:0000307', 'no biological data found used in manual assertion'] as const

export const saeModelRaw = {
  'modified-p': false,
  id: SAE_MODEL_ID,
  individuals: [
    // A1 — NOT enables, with has_input and occurs_in extensions
    rawIndividual('mf1', 'GO:0004672', 'protein kinase activity', MF_ROOTS, { complement: true }),
    rawIndividual('gp1', 'UniProtKB:P00001', 'ALPHA1 Hsap', GP_ROOTS),
    rawIndividual('x1', 'UniProtKB:P00009', 'SUBSTRATE1 Hsap', GP_ROOTS),
    rawIndividual('cc1', 'GO:0005634', 'nucleus', CC_ROOTS),
    rawEvidence('ev1', ...IDA, ['PMID:111'], { withFrom: 'UniProtKB:Q00001' }),
    rawEvidence('ev2', ...IDA, ['PMID:111'], { withFrom: 'UniProtKB:Q00001' }),
    rawEvidence('ev3', ...IDA, ['PMID:111'], { withFrom: 'UniProtKB:Q00001' }),

    // A2 — involved in (root MF part_of BP), happens_during extension
    rawIndividual('mf2', 'GO:0003674', 'molecular_function', MF_ROOTS),
    rawIndividual('gp2', 'UniProtKB:P00002', 'BETA2 Hsap', GP_ROOTS),
    rawIndividual('bp2', 'GO:0006915', 'apoptotic process', BP_ROOTS, { date: '2024-03-01' }),
    rawIndividual('ph2', 'GO:0000080', 'mitotic G1 phase', ['GO:0044848']),
    rawEvidence('ev4', ...IMP, ['PMID:222'], { date: '2024-03-05' }),
    rawEvidence('ev5', ...IMP, ['PMID:222'], { date: '2024-03-05' }),
    rawEvidence('ev6', ...IMP, ['PMID:222'], { date: '2024-03-05' }),

    // A3 — acts upstream of or within (root MF causally upstream of or within BP)
    rawIndividual('mf3', 'GO:0003674', 'molecular_function', MF_ROOTS),
    rawIndividual('gp3', 'ZFIN:ZDB-GENE-000001-1', 'gamma3 Drer', ['CHEBI:33695', 'CHEBI:24431']),
    rawIndividual('bp3', 'GO:0048856', 'anatomical structure development', BP_ROOTS),
    rawEvidence('ev7', ...IMP, ['PMID:333'], { withFrom: 'ZFIN:ZDB-MRPHLNO-000001-1' }),
    rawEvidence('ev8', ...IMP, ['PMID:333'], { withFrom: 'ZFIN:ZDB-MRPHLNO-000001-1' }),

    // A4 — located in, two sources, part_of extension
    rawIndividual('gp4', 'UniProtKB:P00004', 'DELTA4 Hsap', GP_ROOTS),
    rawIndividual('cc4', 'GO:0005737', 'cytoplasm', CC_ROOTS),
    rawIndividual('ub4', 'UBERON:0000955', 'brain', ['UBERON:0001062']),
    rawEvidence('ev9', ...IDA, ['PMID:444', 'PMID:555'], { date: '2024-05-02' }),
    rawEvidence('ev10', ...IDA, ['PMID:444'], { date: '2024-05-02' }),

    // A5 — is active in
    rawIndividual('gp5', 'UniProtKB:P00005', 'EPSILON5 Hsap', GP_ROOTS),
    rawIndividual('cc5', 'GO:0005886', 'plasma membrane', CC_ROOTS),
    rawEvidence('ev11', ...IDA, ['PMID:666']),

    // A6 — contributes to
    rawIndividual('gp6', 'UniProtKB:P00006', 'ZETA6 Hsap', GP_ROOTS),
    rawIndividual('mf6', 'GO:0003700', 'DNA-binding transcription factor activity', MF_ROOTS),
    rawEvidence('ev12', ...IDA, ['PMID:777']),

    // A7 — part of a protein-containing complex
    rawIndividual('gp7', 'UniProtKB:P00007', 'ETA7 Hsap', GP_ROOTS),
    rawIndividual('cx7', 'GO:0005667', 'transcription regulator complex', COMPLEX_ROOTS),
    rawEvidence('ev13', ...IDA, ['PMID:888']),

    // A8 — a ComplexPortal complex located in a CC
    rawIndividual('cp8', 'ComplexPortal:CPX-0001', 'Mediator complex', COMPLEX_ROOTS),
    rawIndividual('cc8', 'GO:0005634', 'nucleus', CC_ROOTS),
    rawEvidence('ev14', ...IDA, ['PMID:999']),

    // A9 — MF root with ND (Add MF Root), with fact comments
    rawIndividual('mf9', 'GO:0003674', 'molecular_function', MF_ROOTS),
    rawIndividual('gp9', 'UniProtKB:P00009X', 'THETA9 Hsap', GP_ROOTS),
    rawEvidence('ev15', ...ND, ['GO_REF:0000015'], { date: '2023-12-31' }),

    // Not part of any annotation
    rawIndividual('chem', 'CHEBI:15377', 'water', ['CHEBI:24431']),
  ],
  facts: [
    rawFact('mf1', 'RO:0002333', 'enabled by', 'gp1', { evidence: ['ev1'], comments: ['checked'] }),
    rawFact('mf1', 'RO:0002233', 'has input', 'x1', { evidence: ['ev2'], comments: ['checked'] }),
    rawFact('mf1', 'BFO:0000066', 'occurs in', 'cc1', { evidence: ['ev3'], comments: ['checked'] }),

    rawFact('mf2', 'RO:0002333', 'enabled by', 'gp2', { evidence: ['ev4'] }),
    rawFact('mf2', 'BFO:0000050', 'part of', 'bp2', { evidence: ['ev5'] }),
    rawFact('bp2', 'RO:0002092', 'happens during', 'ph2', { evidence: ['ev6'] }),

    rawFact('mf3', 'RO:0002333', 'enabled by', 'gp3', { evidence: ['ev7'] }),
    rawFact('mf3', 'RO:0002418', 'causally upstream of or within', 'bp3', { evidence: ['ev8'] }),

    rawFact('gp4', 'RO:0001025', 'located in', 'cc4', { evidence: ['ev9'] }),
    rawFact('cc4', 'BFO:0000050', 'part of', 'ub4', { evidence: ['ev10'] }),

    rawFact('gp5', 'RO:0002432', 'is active in', 'cc5', { evidence: ['ev11'] }),
    rawFact('gp6', 'RO:0002326', 'contributes to', 'mf6', { evidence: ['ev12'] }),
    rawFact('gp7', 'BFO:0000050', 'part of', 'cx7', { evidence: ['ev13'] }),
    rawFact('cp8', 'RO:0001025', 'located in', 'cc8', { evidence: ['ev14'] }),

    rawFact('mf9', 'RO:0002333', 'enabled by', 'gp9', {
      evidence: ['ev15'],
      comments: ['first comment', 'second comment'],
    }),
  ],
  annotations: [
    { key: 'title', value: 'enabled by ALPHA1 Hsap' },
    { key: 'state', value: 'development' },
    { key: 'date', value: '2024-05-02' },
    { key: 'comment', value: 'model comment' },
    { key: 'contributor', value: CURATOR },
    { key: 'providedBy', value: GROUP },
  ],
}

/** `uid()` for tests that need an individual's IRI. */
export const saeUid = uid
