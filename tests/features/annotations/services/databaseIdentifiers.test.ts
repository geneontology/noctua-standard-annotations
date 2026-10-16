import { describe, it, expect } from 'vitest'
import {
  correctWithFromCase,
  formatReference,
  formatWithFrom,
  validateWithFrom,
} from '@/features/annotations/services/databaseIdentifiers'

describe('validateWithFrom', () => {
  it('accepts allowed namespaces in any case, separated by , or |', () => {
    expect(validateWithFrom('UniProtKB:P1|uniprotkb:P2, ZFIN:ZDB-GENE-1')).toBeNull()
  })

  it('ignores empty entries such as a leading comma', () => {
    expect(validateWithFrom(',ZFIN:ZDB-CRISPR-1')).toBeNull()
  })

  it('reports the first bad entry', () => {
    expect(validateWithFrom('P12345')).toBe(
      'Invalid format: "P12345" - expected format is "DATABASE:accession"'
    )
    expect(validateWithFrom('UniProtKB:')).toBe(
      'Invalid format: "UniProtKB:" - accession cannot be empty'
    )
    expect(validateWithFrom('UniProtKB:P1,NCBI:1')).toBe(
      'Invalid database prefix: "NCBI" is not part of allowed entities'
    )
  })
})

describe('correctWithFromCase', () => {
  it('rewrites known prefixes and keeps separators, spacing and accessions', () => {
    expect(correctWithFromCase('uniprotkb:p1 | zfin:ZDB-1,foo:bar')).toBe(
      'UniProtKB:p1 | ZFIN:ZDB-1,foo:bar'
    )
  })
})

describe('formatWithFrom / formatReference', () => {
  it('stores with/from with canonical prefixes and no whitespace', () => {
    expect(formatWithFrom(' uniprotkb:P1 | UniProtKB:P2 ')).toBe('UniProtKB:P1|UniProtKB:P2')
  })

  it('trims both halves of a reference', () => {
    expect(formatReference(' PMID : 123 ')).toBe('PMID:123')
    expect(formatReference('GO_REF:0000015')).toBe('GO_REF:0000015')
  })
})
