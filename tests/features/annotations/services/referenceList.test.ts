import { describe, it, expect } from 'vitest'
import {
  classifyReferences,
  parseReferences,
  pmidNumber,
} from '@/features/annotations/services/referenceList'

describe('parseReferences', () => {
  it('reads PMIDs one per line, or comma, semicolon, space or | separated', () => {
    expect(parseReferences('PMID:1\n2, PMID: 3; pmid:4 5|6').pmids).toEqual([
      'PMID:1',
      'PMID:2',
      'PMID:3',
      'PMID:4',
      'PMID:5',
      'PMID:6',
    ])
  })

  it('de-duplicates, including leading zeros', () => {
    expect(parseReferences('PMID:12 12 PMID:0012').pmids).toEqual(['PMID:12'])
  })

  it('reports what is not a PMID', () => {
    expect(parseReferences('PMID:1 GO_REF:0000033 doi:10.1/x abc')).toEqual({
      pmids: ['PMID:1'],
      invalid: ['GO_REF:0000033', 'doi:10.1/x', 'abc'],
    })
  })

  it('is empty for blank text', () => {
    expect(parseReferences('  \n ')).toEqual({ pmids: [], invalid: [] })
  })
})

describe('classifyReferences', () => {
  const paper = { title: 'T', authors: 'A', date: '2020' }

  it('sorts PMIDs into found, not found and already cited', () => {
    const list = classifyReferences(
      { pmids: ['PMID:1', 'PMID:2', 'PMID:3'], invalid: ['x'] },
      { '1': paper, '2': null, '3': paper },
      ['PMID: 3']
    )
    expect(list).toEqual({
      found: [{ id: 'PMID:1', ...paper }],
      notFound: ['PMID:2'],
      alreadyCited: ['PMID:3'],
      invalid: ['x'],
    })
  })
})

describe('pmidNumber', () => {
  it('strips the prefix', () => {
    expect(pmidNumber('PMID:123')).toBe('123')
  })
})
