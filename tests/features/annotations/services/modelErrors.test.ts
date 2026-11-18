import { describe, it, expect } from 'vitest'
import { extractAnnotations } from '@/features/annotations/services/annotationExtraction'
import { findModelErrors } from '@/features/annotations/services/modelErrors'
import {
  actsUpstreamPairRaw,
  bpOneHopExtensionsRaw,
  gocamMixedRaw,
  loadModel,
  mfWithBpExtensionRaw,
  saeModelRaw,
  singleMfRaw,
} from '@tests/fixtures/models'
import { saeUid } from '@tests/fixtures/saeModel'

const errorsOf = (raw: unknown) => {
  const model = loadModel(raw)
  return findModelErrors(model, extractAnnotations(model))
}

const edgeLabels = (raw: unknown) =>
  errorsOf(raw).hiddenEdges.map(
    ({ edge, source, target }) => `${source?.label} -${edge.label}-> ${target?.label}`
  )

describe('findModelErrors', () => {
  it('reports nothing for a null model', () => {
    expect(findModelErrors(null, []).total).toBe(0)
  })

  it.each([
    ['single MF', singleMfRaw],
    ['acts upstream pair', actsUpstreamPairRaw],
    ['BP one-hop extensions', bpOneHopExtensionsRaw],
  ])('reports nothing when the table shows the whole model (%s)', (_name, raw) => {
    expect(errorsOf(raw).total).toBe(0)
  })

  it('never reports evidence individuals', () => {
    const { hiddenNodes } = errorsOf(gocamMixedRaw)
    expect(hiddenNodes.some(node => node.rootTypes.includes('ECO:0000000'))).toBe(false)
  })

  it('reports an individual no annotation uses as standalone', () => {
    const errors = errorsOf(saeModelRaw)
    expect(errors.standaloneNodes.map(node => node.uid)).toEqual([saeUid('chem')])
    expect(errors.relationNodes).toEqual([])
    expect(errors.hiddenEdges).toEqual([])
    expect(errors.total).toBe(1)
  })

  it('reports a nested extension the table does not show, with its term', () => {
    const errors = errorsOf(mfWithBpExtensionRaw)
    expect(edgeLabels(mfWithBpExtensionRaw)).toEqual([
      'DNA-templated DNA replication -part of-> G0 to G1 transition',
    ])
    expect(errors.relationNodes.map(node => node.label)).toEqual(['G0 to G1 transition'])
    expect(errors.standaloneNodes).toEqual([])
    expect(errors.total).toBe(2)
  })

  it("reports a GO-CAM's causal MF → MF edges and unused chemicals", () => {
    const errors = errorsOf(gocamMixedRaw)
    expect(edgeLabels(gocamMixedRaw)).toEqual(
      expect.arrayContaining([
        'lipid binding -directly positively regulates-> linoleate isomerase activity',
        'lipid binding -directly negatively regulates-> lipid phosphatase activity',
        'LTP11 Atal -occurs in-> lipid oxidation',
      ])
    )
    expect(errors.relationNodes.map(node => node.label).sort()).toEqual([
      'LTP11 Atal',
      'lipid oxidation',
    ])
    expect(errors.standaloneNodes).toHaveLength(2)
    expect(errors.total).toBe(errors.hiddenNodes.length + errors.hiddenEdges.length)
  })
})
