import { describe, it, expect } from 'vitest'
import {
  parseReference,
  parseWithGroups,
  serializeWithGroups,
} from '@/features/annotations/services/databasePickers'

describe('parseReference', () => {
  it('prefills a reference the picker offers', () => {
    expect(parseReference('GO_REF:0000024')).toEqual({ dbName: 'GO_REF', accession: '0000024' })
    expect(parseReference(' PMID:123 ')).toEqual({ dbName: 'PMID', accession: '123' })
  })

  it('opens blank on PMID for a DB it does not offer, never PMID:<other accession>', () => {
    expect(parseReference('WB:WBPaper00001234')).toEqual({ dbName: 'PMID', accession: '' })
    expect(parseReference('Reactome:R-HSA-1')).toEqual({ dbName: 'PMID', accession: '' })
  })

  it('takes a bare accession as PMID and an empty field as blank', () => {
    expect(parseReference('12345')).toEqual({ dbName: 'PMID', accession: '12345' })
    expect(parseReference('')).toEqual({ dbName: 'PMID', accession: '' })
  })
})

describe('parseWithGroups', () => {
  it('splits groups on "," and entities on "|", spelling DBs as Noctua does', () => {
    expect(parseWithGroups('uniprotkb:P1|MGI:MGI:2, WB:WBGene1')).toEqual([
      {
        entities: [
          { db: 'UniProtKB', accession: 'P1' },
          { db: 'MGI', accession: 'MGI:2' },
        ],
      },
      { entities: [{ db: 'WB', accession: 'WBGene1' }] },
    ])
  })

  it('starts with one empty row', () => {
    expect(parseWithGroups('')).toEqual([{ entities: [{ db: 'None', accession: '' }] }])
  })
})

describe('serializeWithGroups', () => {
  it('joins complete entities and ignores empty rows', () => {
    expect(
      serializeWithGroups([
        {
          entities: [
            { db: 'UniProtKB', accession: ' P1 ' },
            { db: 'None', accession: '' },
            { db: 'MGI', accession: 'MGI:2' },
          ],
        },
        { entities: [{ db: 'WB', accession: 'WBGene1' }] },
      ])
    ).toEqual({ value: 'UniProtKB:P1|MGI:MGI:2,WB:WBGene1', errors: [] })
  })

  it('reports an accession without a DB and a DB without an accession (Angular errors)', () => {
    const { errors } = serializeWithGroups([
      {
        entities: [
          { db: 'None', accession: 'P12345' },
          { db: 'UniProtKB', accession: ' ' },
        ],
      },
    ])
    expect(errors).toEqual([
      'Please select a database for the accession value "P12345"',
      'Accession value is required for database "UniProtKB"',
    ])
  })
})
