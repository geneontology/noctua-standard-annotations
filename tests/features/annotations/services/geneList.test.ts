import { describe, it, expect } from 'vitest'
import { classifyGenes, parseGeneIds } from '@/features/annotations/services/geneList'
import { termOption } from '@/features/annotations/models/annotationForm'

describe('parseGeneIds', () => {
  it('reads one id per line', () => {
    expect(parseGeneIds('UniProtKB:Q9P258\nWB:WBGene0000009\r\n')).toEqual([
      'UniProtKB:Q9P258',
      'WB:WBGene0000009',
    ])
  })

  it('reads comma-separated and JSON-ish lists, dropping quotes and duplicates', () => {
    expect(parseGeneIds('["UniProtKB:Q9P258", "UniProtKB:Q9P258", \'MGI:MGI:12345\']')).toEqual([
      'UniProtKB:Q9P258',
      'MGI:MGI:12345',
    ])
  })

  it('drops fragments shorter than five characters', () => {
    expect(parseGeneIds('ab\nUniProtKB:P1')).toEqual(['UniProtKB:P1'])
  })
})

describe('classifyGenes', () => {
  it('splits ids into matched, unlabeled and not found', () => {
    const result = classifyGenes(
      ['UniProtKB:A', 'UniProtKB:B', 'UniProtKB:C'],
      [termOption('UniProtKB:A', 'GENEA Hsap'), termOption('UniProtKB:B', '')]
    )
    expect(result).toEqual({
      genes: [{ id: 'UniProtKB:A', label: 'GENEA Hsap' }],
      nonMatchingGenes: [{ id: 'UniProtKB:B' }],
      identifiersNotMatched: ['UniProtKB:C'],
      count: 3,
    })
  })
})
