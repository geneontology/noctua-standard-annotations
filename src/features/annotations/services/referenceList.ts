/** A paper PubMed found for a pasted PMID. */
export interface ReferencePaper {
  /** `PMID:<n>`. */
  id: string
  title: string
  authors: string
  date: string
}

/** PubMed summaries by bare PMID number; `null` when PubMed has no such paper. */
export type PubmedSummaries = Record<string, Omit<ReferencePaper, 'id'> | null>

export interface ParsedReferences {
  /** `PMID:<n>`, de-duplicated, in the order pasted. */
  pmids: string[]
  /** Pieces that aren't a PMID. */
  invalid: string[]
}

export interface ReferenceList {
  /** On PubMed and not yet cited: these get an annotation each. */
  found: ReferencePaper[]
  /** Not on PubMed. */
  notFound: string[]
  /** Already the annotation's reference. */
  alreadyCited: string[]
  /** Not a PMID at all. */
  invalid: string[]
}

const PMID = /^(?:PMID:)?(\d{1,9})$/i

/**
 * Pull PMIDs out of pasted text: one per line, or separated by commas, semicolons,
 * spaces or `|`. `12345`, `PMID:12345` and `PMID: 12345` all become `PMID:12345`.
 */
export const parseReferences = (text: string): ParsedReferences => {
  const pmids: string[] = []
  const invalid: string[] = []
  const tokens = text
    .replace(/pmid\s*:\s*/gi, 'PMID:')
    .split(/[\s,;|]+/)
    .filter(Boolean)
  for (const token of tokens) {
    const match = PMID.exec(token)
    if (!match) {
      if (!invalid.includes(token)) invalid.push(token)
      continue
    }
    const pmid = `PMID:${Number(match[1])}`
    if (!pmids.includes(pmid)) pmids.push(pmid)
  }
  return { pmids, invalid }
}

/** The bare number PubMed is queried with. */
export const pmidNumber = (pmid: string): string => pmid.replace(/^PMID:/i, '')

/** Normalise a stored source for comparison (`PMID: 12` → `PMID:12`). */
const normaliseSource = (source: string) => {
  const match = PMID.exec(source.replace(/pmid\s*:\s*/gi, 'PMID:').trim())
  return match ? `PMID:${Number(match[1])}` : source.trim()
}

/**
 * Sort parsed PMIDs into what gets annotated (on PubMed, not already cited) and
 * what doesn't, for the dialog's tabs.
 */
export const classifyReferences = (
  parsed: ParsedReferences,
  summaries: PubmedSummaries,
  citedSources: string[]
): ReferenceList => {
  const cited = new Set(citedSources.map(normaliseSource))
  const list: ReferenceList = { found: [], notFound: [], alreadyCited: [], invalid: parsed.invalid }
  for (const pmid of parsed.pmids) {
    if (cited.has(pmid)) {
      list.alreadyCited.push(pmid)
      continue
    }
    const summary = summaries[pmidNumber(pmid)]
    if (summary) list.found.push({ id: pmid, ...summary })
    else list.notFound.push(pmid)
  }
  return list
}
