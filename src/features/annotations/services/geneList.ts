import type { GOlrResponse } from '@/features/search/models/search'

export interface Gene {
  id: string
  label?: string
}

export interface GeneList {
  /** Found with a label — these get annotated. */
  genes: Gene[]
  /** Found but without a label. */
  nonMatchingGenes: Gene[]
  /** Not found at all. */
  identifiersNotMatched: string[]
  count: number
}

/** Shortest text kept as an id — drops stray fragments left by pasting. */
const MIN_ID_LENGTH = 5

/**
 * Pull gene product ids out of pasted text: one per line, comma separated, or a
 * JSON-ish list. Quotes and punctuation other than `:` are dropped, ids are de-duplicated.
 */
export const parseGeneIds = (text: string): string[] => {
  if (!text) return []

  const cleaned = text
    .replace(/["']/g, '')
    .replace(/[^a-zA-Z0-9:\s,]/g, '')
    .replace(/,\s*/g, '\n')
    .replace(/[ \t]+/g, '')

  const lines = cleaned
    .split(/\r\n|\n/)
    .map(line => line.trim())
    .filter(line => line.length >= MIN_ID_LENGTH)

  return Array.from(new Set(lines))
}

/** Sort GOlr matches into found / found-without-label / not found (Angular `getGenesDetails`). */
export const classifyGenes = (ids: string[], matches: GOlrResponse[]): GeneList => {
  const result: GeneList = { genes: [], nonMatchingGenes: [], identifiersNotMatched: [], count: 0 }
  const byId = new Map(matches.map(match => [match.id, match]))

  for (const id of ids) {
    const match = byId.get(id)
    if (!match) {
      result.identifiersNotMatched.push(id)
    } else if (match.label) {
      result.genes.push({ id: match.id, label: match.label })
    } else {
      result.nonMatchingGenes.push({ id: match.id })
    }
  }

  result.count =
    result.genes.length + result.nonMatchingGenes.length + result.identifiersNotMatched.length
  return result
}
