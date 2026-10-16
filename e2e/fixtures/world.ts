import type { CatalogClass, RawModel } from '../mocks/minerva'

/**
 * The classes the browser tests search for (GOlr) and write (Minerva root types),
 * and a model seeded the way SAE stores annotations.
 */

const GP = ['CHEBI:33695', 'CHEBI:24431', 'CHEBI:36080']
const MF = ['GO:0003674']
const BP = ['GO:0008150']
const CC = ['UBERON:0001062', 'GO:0110165', 'GO:0005575']
const ECO = ['ECO:0000352', 'ECO:0000000']

export const CATALOG: CatalogClass[] = [
  { id: 'UniProtKB:P07948', label: 'LYN Hsap', closure: GP },
  { id: 'UniProtKB:P12931', label: 'SRC Hsap', closure: GP },
  { id: 'UniProtKB:P06241', label: 'FYN Hsap', closure: GP },
  { id: 'UniProtKB:P08631', label: 'HCK Hsap', closure: GP },
  { id: 'GO:0003674', label: 'molecular_function', closure: MF },
  { id: 'GO:0004713', label: 'protein tyrosine kinase activity', closure: MF },
  {
    id: 'GO:0004715',
    label: 'non-membrane spanning protein tyrosine kinase activity',
    closure: MF,
  },
  { id: 'GO:0019900', label: 'kinase binding', closure: MF },
  { id: 'GO:0008150', label: 'biological_process', closure: BP },
  { id: 'GO:0006915', label: 'apoptotic process', closure: BP },
  { id: 'GO:0016477', label: 'cell migration', closure: BP },
  { id: 'GO:0007165', label: 'signal transduction', closure: BP },
  { id: 'GO:0005575', label: 'cellular_component', closure: CC },
  { id: 'GO:0005634', label: 'nucleus', closure: CC },
  { id: 'GO:0005737', label: 'cytoplasm', closure: CC },
  {
    id: 'ECO:0000314',
    label: 'direct assay evidence used in manual assertion',
    closure: ECO,
    xref: 'GO:IDA',
  },
  {
    id: 'ECO:0000315',
    label: 'mutant phenotype evidence used in manual assertion',
    closure: ECO,
    xref: 'GO:IMP',
  },
  {
    id: 'ECO:0000353',
    label: 'physical interaction evidence used in manual assertion',
    closure: ECO,
    xref: 'GO:IPI',
  },
  {
    id: 'ECO:0000307',
    label: 'no evidence data found used in manual assertion',
    closure: ECO,
    xref: 'GO:ND',
  },
  {
    id: 'ECO:0000250',
    label: 'sequence similarity evidence used in manual assertion',
    closure: ECO,
    xref: 'GO:ISS',
  },
]

export const RELATION_LABELS: Record<string, string> = {
  'RO:0002333': 'enabled by',
  'BFO:0000050': 'part of',
  'BFO:0000066': 'occurs in',
  'RO:0001025': 'located in',
  'RO:0002432': 'is active in',
  'RO:0002418': 'causally upstream of or within',
  'RO:0002233': 'has input',
}

export const MODEL_ID = 'gomodel:e2e000000001'
export const CURATOR_ORCID = 'https://orcid.org/0000-0000-0000-0099'

const id = (n: string) => `${MODEL_ID}/${n}`
const meta = [
  { key: 'contributor', value: 'https://orcid.org/0000-0000-0000-0001' },
  { key: 'providedBy', value: 'http://geneontology.org' },
  { key: 'date', value: '2025-01-10' },
]

const individual = (n: string, classId: string, extra: { key: string; value: string }[] = []) => {
  const cls = CATALOG.find(c => c.id === classId)!
  return {
    id: id(n),
    type: [{ type: 'class' as const, id: classId, label: cls.label }],
    'root-type': cls.closure.map(rt => ({ type: 'class' as const, id: rt, label: rt })),
    annotations: [...meta, ...extra],
  }
}

const evidence = (n: string, eco: string, sources: string[], withFrom?: string) =>
  individual(n, eco, [
    ...sources.map(value => ({ key: 'source', value })),
    ...(withFrom ? [{ key: 'with', value: withFrom }] : []),
  ])

const fact = (
  subject: string,
  property: string,
  object: string,
  ev: string,
  comments: string[] = []
) => ({
  subject: id(subject),
  property,
  'property-label': RELATION_LABELS[property] ?? property,
  object: id(object),
  annotations: [
    { key: 'evidence', value: id(ev), 'value-type': 'IRI' },
    ...comments.map(value => ({ key: 'comment', value })),
    ...meta,
  ],
})

/**
 * Four SAE annotations:
 * - LYN enables protein tyrosine kinase activity (IDA, with SRC), occurs in nucleus, a comment
 * - LYN involved in apoptotic process (IMP)
 * - LYN located in nucleus (IDA)
 * - SRC acts upstream of or within cell migration (IMP)
 */
export const seededModel = (): RawModel => ({
  id: MODEL_ID,
  'modified-p': false,
  individuals: [
    individual('mf1', 'GO:0004713'),
    individual('gp1', 'UniProtKB:P07948'),
    individual('cc1', 'GO:0005634'),
    evidence('ev1', 'ECO:0000314', ['PMID:111'], 'UniProtKB:P12931'),
    evidence('ev2', 'ECO:0000314', ['PMID:111'], 'UniProtKB:P12931'),

    individual('mf2', 'GO:0003674'),
    individual('gp2', 'UniProtKB:P07948'),
    individual('bp2', 'GO:0006915'),
    evidence('ev3', 'ECO:0000315', ['PMID:222']),
    evidence('ev4', 'ECO:0000315', ['PMID:222']),

    individual('gp3', 'UniProtKB:P07948'),
    individual('cc3', 'GO:0005634'),
    evidence('ev5', 'ECO:0000314', ['PMID:333']),

    individual('mf4', 'GO:0003674'),
    individual('gp4', 'UniProtKB:P12931'),
    individual('bp4', 'GO:0016477'),
    evidence('ev6', 'ECO:0000315', ['PMID:444']),
    evidence('ev7', 'ECO:0000315', ['PMID:444']),
  ],
  facts: [
    fact('mf1', 'RO:0002333', 'gp1', 'ev1', ['kinase note']),
    fact('mf1', 'BFO:0000066', 'cc1', 'ev2', ['kinase note']),
    fact('mf2', 'RO:0002333', 'gp2', 'ev3'),
    fact('mf2', 'BFO:0000050', 'bp2', 'ev4'),
    fact('gp3', 'RO:0001025', 'cc3', 'ev5'),
    fact('mf4', 'RO:0002333', 'gp4', 'ev6'),
    fact('mf4', 'RO:0002418', 'bp4', 'ev7'),
  ],
  annotations: [
    { key: 'title', value: 'e2e model' },
    { key: 'state', value: 'development' },
    { key: 'date', value: '2025-01-10' },
    { key: 'contributor', value: 'https://orcid.org/0000-0000-0000-0001' },
    { key: 'providedBy', value: 'http://geneontology.org' },
  ],
})

/** A new, untitled model with nothing in it (as Noctua's "new model" opens SAE). */
export const emptyModel = (): RawModel => ({
  id: MODEL_ID,
  'modified-p': true,
  individuals: [],
  facts: [],
  annotations: [{ key: 'state', value: 'development' }],
})
