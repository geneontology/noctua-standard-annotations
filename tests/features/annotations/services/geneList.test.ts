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

  it('keeps the dashes, underscores and dots of real ids', () => {
    expect(
      parseGeneIds(
        'ZFIN:ZDB-GENE-040426-1432, dictyBase:DDB_G0267378\nPomBase:SPAC1002.09c\nUniProtKB:P12345-2\nComplexPortal:CPX-1'
      )
    ).toEqual([
      'ZFIN:ZDB-GENE-040426-1432',
      'dictyBase:DDB_G0267378',
      'PomBase:SPAC1002.09c',
      'UniProtKB:P12345-2',
      'ComplexPortal:CPX-1',
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
