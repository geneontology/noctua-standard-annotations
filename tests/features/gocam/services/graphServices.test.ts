import { describe, it, expect } from 'vitest'
import {
  describeBatchError,
  getBatchErrorMessage,
  joinSources,
  transformGraphData,
} from '@/features/gocam/services/graphServices'
import { SAE_MODEL_ID, saeModelRaw, saeUid } from '@tests/fixtures/saeModel'
import { singleMfRaw } from '@tests/fixtures/models'

describe('transformGraphData', () => {
  const model = transformGraphData(saeModelRaw)

  it('reads model annotations', () => {
    expect(model.id).toBe(SAE_MODEL_ID)
    expect(model.title).toBe('enabled by ALPHA1 Hsap')
    expect(model.state).toBe('development')
    expect(model.date).toBe('2024-05-02')
    expect(model.comments).toEqual(['model comment'])
    expect(model.modified).toBe(false)
    expect(model.contributors.map(c => c.uri)).toEqual(['https://orcid.org/0000-0000-0000-0001'])
  })

  it('reads a complement individual as its filler class with isComplement', () => {
    const mf1 = model.nodes.find(n => n.uid === saeUid('mf1'))!
    expect(mf1.id).toBe('GO:0004672')
    expect(mf1.label).toBe('protein kinase activity')
    expect(mf1.isComplement).toBe(true)
    expect(mf1.rootTypes).toContain('GO:0003674')
  })

  it('attaches evidence to facts, joining multiple sources the Noctua way', () => {
    const edge = model.edges.find(e => e.sourceId === saeUid('gp4'))!
    expect(edge.uid).toBe(`${saeUid('gp4')}|RO:0001025|${saeUid('cc4')}`)
    expect(edge.label).toBe('located in')
    expect(edge.evidence).toHaveLength(1)
    expect(edge.evidence[0]).toMatchObject({
      uid: saeUid('ev9'),
      evidenceCode: { id: 'ECO:0000314' },
      reference: 'PMID:555| PMID:444',
      sources: ['PMID:444', 'PMID:555'],
      date: '2024-05-02',
    })
  })

  it('keeps fact comments and the evidence with/from', () => {
    const edge = model.edges.find(e => e.sourceId === saeUid('mf1') && e.id === 'RO:0002333')!
    expect(edge.comments).toEqual(['checked'])
    expect(edge.evidence[0].with).toBe('UniProtKB:Q00001')
  })

  it('names contributors from Barista metadata when it is available', () => {
    const named = transformGraphData(saeModelRaw, {
      contributors: [{ uri: 'https://orcid.org/0000-0000-0000-0001', name: 'Jane Curator' }],
      groups: [{ id: 'http://geneontology.org', label: 'GO Central' }],
    })
    expect(named.contributors[0].name).toBe('Jane Curator')
    expect(named.groups[0].label).toBe('GO Central')
  })

  it('keeps every title and state so a save can replace them all', () => {
    const twice = transformGraphData({
      ...saeModelRaw,
      annotations: [
        { key: 'title', value: 'first' },
        { key: 'title', value: 'second' },
        { key: 'state', value: 'review' },
        { key: 'state', value: 'production' },
      ],
    })
    expect(twice.titles).toEqual(['first', 'second'])
    expect(twice.title).toBe('first')
    expect(twice.states).toEqual(['review', 'production'])
    expect(twice.state).toBe('review')
  })

  it('names an individual by its last type and is NOT only when every type is', () => {
    const individual = (types: unknown[]) =>
      transformGraphData({
        id: 'gomodel:t',
        individuals: [{ id: 'gomodel:t/1', type: types, 'root-type': [], annotations: [] }],
        facts: [],
        annotations: [],
      }).nodes[0]
    const cls = (id: string) => ({ type: 'class', id, label: id })
    const not = (id: string) => ({ type: 'complement', filler: cls(id) })

    expect(individual([cls('GO:1'), cls('GO:2')]).id).toBe('GO:2')
    expect(individual([cls('GO:1'), not('GO:2')])).toMatchObject({
      id: 'GO:2',
      isComplement: false,
    })
    expect(individual([not('GO:1'), not('GO:2')])).toMatchObject({ id: 'GO:2', isComplement: true })
  })

  it('links a single reference only', () => {
    const edges = transformGraphData(saeModelRaw).edges
    const single = edges.find(e => e.sourceId === saeUid('gp5'))!.evidence[0]
    const joined = edges.find(e => e.sourceId === saeUid('gp4'))!.evidence[0]
    expect(single.referenceUrl).toBe('https://www.ncbi.nlm.nih.gov/pubmed/666')
    expect(joined.referenceUrl).toBe('')
  })

  it('reads a real barista-dev response', () => {
    const real = transformGraphData(singleMfRaw)
    expect(real.id).toBe('gomodel:6ab067da00002477')
    expect(real.edges).toHaveLength(1)
    expect(real.edges[0].evidence[0].reference).toBe('PMID:17823121')
  })

  it('returns an empty model for no data', () => {
    expect(transformGraphData(null).nodes).toEqual([])
  })
})

describe('joinSources', () => {
  it('sorts descending and joins with "| "', () => {
    expect(joinSources(['PMID:1', 'PMID:2'])).toBe('PMID:2| PMID:1')
  })
})

describe('getBatchErrorMessage', () => {
  it('is null for a success body', () => {
    expect(getBatchErrorMessage({ 'message-type': 'success', data: {} })).toBeNull()
  })

  it('reads Minerva (message-type) and Barista (message_type) errors', () => {
    expect(getBatchErrorMessage({ 'message-type': 'error', message: 'boom' })).toBe('boom')
    expect(
      getBatchErrorMessage({ message_type: 'error', message: 'You are using a bad token' })
    ).toMatch(/bad token/)
  })
})

describe('describeBatchError', () => {
  it('explains permission and unknown-model errors', () => {
    expect(describeBatchError('...InsufficientPermissionsException...')).toMatch(/permission/)
    expect(describeBatchError('...UnknownIdentifierException: Could not find a model')).toBe(
      'The model could not be found.'
    )
  })
})

describe('dates and batch errors', () => {
  it('keeps the first date of an individual, as the Angular reader did', () => {
    const model = transformGraphData({
      id: 'gomodel:dates',
      individuals: [
        {
          id: 'i1',
          type: [{ type: 'class', id: 'GO:0005634', label: 'nucleus' }],
          annotations: [
            { key: 'date', value: '2024-01-01' },
            { key: 'date', value: '2025-06-01' },
          ],
        },
      ],
      facts: [],
      annotations: [],
    })
    expect(model.nodes[0].date).toBe('2024-01-01')
  })

  it('names a vanished individual rather than a missing model', () => {
    expect(
      describeBatchError("UnknownIdentifierException. No individual found for id: 'gomodel:1/2'")
    ).toMatch(/no longer exists/)
    expect(describeBatchError('UnknownIdentifierException: Could not find a model')).toBe(
      'The model could not be found.'
    )
  })
})
