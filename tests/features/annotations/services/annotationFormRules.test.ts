import { describe, it, expect } from 'vitest'
import {
  applyFormRules,
  defaultModelTitle,
  getExtensionRelationChoices,
  getExtensionTermRange,
  getGoTermRange,
  getRelationChoices,
  toCreateAnnotationInputs,
  validateAnnotationForm,
} from '@/features/annotations/services/annotationFormRules'
import type { AnnotationFormState } from '@/features/annotations/models/annotationForm'
import {
  createCommentRow,
  createEvidenceRow,
  createExtensionRow,
  createInitialForm,
  termOption,
} from '@/features/annotations/models/annotationForm'

const gp = termOption('UniProtKB:P1', 'ABC1 Hsap', [
  { id: 'CHEBI:36080', label: 'protein' },
  { id: 'CHEBI:33695', label: 'information biomacromolecule' },
])
const mf = termOption('GO:0004672', 'protein kinase activity', [
  { id: 'GO:0003674', label: 'molecular_function' },
])
const bp = termOption('GO:0006915', 'apoptotic process', [
  { id: 'GO:0008150', label: 'biological_process' },
])
const complex = termOption('GO:0005667', 'transcription regulator complex', [
  { id: 'GO:0005575', label: 'cellular_component' },
  { id: 'GO:0032991', label: 'protein-containing complex' },
])
const ida = termOption('ECO:0000314', 'direct assay evidence used in manual assertion')

const filled = (overrides: Partial<AnnotationFormState> = {}): AnnotationFormState =>
  applyFormRules({
    ...createInitialForm(),
    gp,
    goTerm: mf,
    evidences: [{ ...createEvidenceRow(), evidenceCode: ida, reference: 'PMID:1' }],
    ...overrides,
  })

describe('ranges and choices', () => {
  it('has no GO term range until a gene product is chosen', () => {
    expect(getGoTermRange(createInitialForm())).toEqual([])
    expect(getGoTermRange({ ...createInitialForm(), gp }).sort()).toEqual(
      ['GO:0003674', 'GO:0005575', 'GO:0008150', 'GO:0032991'].sort()
    )
  })

  it('narrows the GO term range to the chosen relation', () => {
    const form = { ...createInitialForm(), gp, relation: { id: 'RO:0002331', label: 'involved in' } }
    expect(getGoTermRange(form)).toEqual(['GO:0008150'])
  })

  it('offers relations for the gene product and GO term pair', () => {
    expect(getRelationChoices(filled()).map(r => r.label)).toEqual(['enables', 'contributes to'])
  })

  it('derives extension relations and ranges from the GO term', () => {
    const row = { ...createExtensionRow(), relation: { id: 'RO:0002092', label: 'happens during' } }
    const form = filled()
    expect(getExtensionRelationChoices(form, row).map(r => r.label)).toContain('happens during')
    expect(getExtensionTermRange(form, row).sort()).toEqual(
      ['GO:0044848', 'PO:0009012', 'UBERON:0000105'].sort()
    )
  })
})

describe('applyFormRules', () => {
  it('picks the first allowed relation once both terms are set', () => {
    expect(filled().relation?.label).toBe('enables')
    expect(filled({ goTerm: bp }).relation?.label).toBe('involved in')
  })

  it('keeps a relation the rules allow', () => {
    const chosen = { id: 'RO:0002326', label: 'contributes to' }
    expect(filled({ relation: chosen }).relation).toEqual(chosen)
  })

  it('defaults to "part of" for a protein-containing complex', () => {
    expect(filled({ goTerm: complex }).relation?.id).toBe('BFO:0000050')
  })

  it('leaves the relation alone while a term is missing', () => {
    const form = applyFormRules({ ...createInitialForm(), gp })
    expect(form.relation).toBeNull()
  })
})

describe('validateAnnotationForm', () => {
  const messages = (form: AnnotationFormState) => validateAnnotationForm(form).map(e => e.message)

  it('passes a complete form', () => {
    expect(messages(filled())).toEqual([])
  })

  it('requires the gene product, GO term, evidence and reference', () => {
    expect(messages(createInitialForm())).toEqual([
      'GP is required',
      'GO Term is required',
      'Evidence is required @ 1',
      'Reference is required @ 1',
    ])
  })

  it('checks reference format and with/from namespaces', () => {
    const form = filled({
      evidences: [
        { ...createEvidenceRow(), evidenceCode: ida, reference: 'PMID123', withFrom: 'Foo:1' },
      ],
    })
    expect(messages(form)).toEqual([
      'Use DB:accession format for reference @ 1',
      'With/From @ 1 - Invalid database prefix: "Foo" is not part of allowed entities',
    ])
  })

  it('checks every reference of a multi-reference evidence', () => {
    const form = filled({
      evidences: [{ ...createEvidenceRow(), evidenceCode: ida, reference: 'PMID:1| PMID:' }],
    })
    expect(messages(form)).toEqual(['Use DB:accession format for reference @ 1'])
    const ok = filled({
      evidences: [{ ...createEvidenceRow(), evidenceCode: ida, reference: 'PMID:1| GO_REF:0000024' }],
    })
    expect(messages(ok)).toEqual([])
  })

  it('requires both halves of an extension', () => {
    const form = filled({
      extensions: [{ ...createExtensionRow(), relation: { id: 'RO:0002233', label: 'has input' } }],
    })
    expect(messages(form)).toEqual([
      'Both Extension relation and Extension Term must be filled (1)',
    ])
  })
})

describe('toCreateAnnotationInputs', () => {
  it('creates one input per evidence row with the shared fields', () => {
    const form = filled({
      isComplement: true,
      evidences: [
        { ...createEvidenceRow(), evidenceCode: ida, reference: 'PMID:1' },
        { ...createEvidenceRow(), evidenceCode: ida, reference: 'PMID:2', withFrom: 'UniProtKB:Q1' },
      ],
      extensions: [
        { ...createExtensionRow(), relation: { id: 'RO:0002233', label: 'has input' }, term: gp },
        createExtensionRow(),
      ],
      comments: [createCommentRow('note'), createCommentRow('note'), createCommentRow('  ')],
    })

    const inputs = toCreateAnnotationInputs(form)
    expect(inputs).toHaveLength(2)
    expect(inputs[1]).toEqual({
      gpId: 'UniProtKB:P1',
      goTermId: 'GO:0004672',
      isComplement: true,
      relationId: 'RO:0002327',
      evidence: { evidenceCodeId: 'ECO:0000314', sources: ['PMID:2'], withFrom: 'UniProtKB:Q1' },
      extensions: [{ relationId: 'RO:0002233', termId: 'UniProtKB:P1' }],
      comments: ['note'],
    })
  })

  it('titles a model after the gene product', () => {
    expect(defaultModelTitle(filled())).toBe('enabled by ABC1 Hsap')
    expect(defaultModelTitle(createInitialForm())).toBe('')
  })
})
