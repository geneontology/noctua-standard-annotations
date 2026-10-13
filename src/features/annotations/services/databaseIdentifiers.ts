import { withFromAllowedDBs } from '../data/allowedDatabases'

const allowedWithFromLower = new Set(withFromAllowedDBs.map(db => db.toLowerCase()))
const withFromCase = new Map(withFromAllowedDBs.map(db => [db.toLowerCase(), db as string]))

/**
 * Validate a with/from value. It may hold several identifiers separated by ','
 * or '|'; each must be DB:accession with DB in the allowed with/from namespaces
 * (matched case-insensitively). Returns an error message for the first offending
 * entry, or null when every entry is valid.
 */
export const validateWithFrom = (input: string): string | null => {
  for (const identifier of input.split(/[,|]/)) {
    const trimmed = identifier.trim()
    if (!trimmed) continue
    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) {
      return `Invalid format: "${trimmed}" - expected format is "DATABASE:accession"`
    }
    const dbPrefix = trimmed.slice(0, colonIdx)
    const accession = trimmed.slice(colonIdx + 1).trim()
    if (!accession) {
      return `Invalid format: "${trimmed}" - accession cannot be empty`
    }
    if (!allowedWithFromLower.has(dbPrefix.toLowerCase())) {
      return `Invalid database prefix: "${dbPrefix}" is not part of allowed entities`
    }
  }
  return null
}

/**
 * Rewrite each with/from DB prefix in its canonical case (`uniprotkb:P1` →
 * `UniProtKB:P1`), leaving separators, accessions and unknown prefixes alone.
 */
export const correctWithFromCase = (input: string): string =>
  input
    .split(/([,|])/)
    .map(part => {
      if (part === ',' || part === '|') return part
      const trimmed = part.trim()
      const colonIdx = trimmed.indexOf(':')
      if (!trimmed || colonIdx === -1) return part

      const canonical = withFromCase.get(trimmed.slice(0, colonIdx).toLowerCase())
      if (!canonical) return part

      const leading = part.match(/^\s*/)?.[0] ?? ''
      const trailing = part.match(/\s*$/)?.[0] ?? ''
      return leading + canonical + trimmed.slice(colonIdx) + trailing
    })
    .join('')

/** With/from as stored: canonical prefixes, no whitespace. */
export const formatWithFrom = (value: string): string =>
  correctWithFromCase(value).replace(/\s+/g, '')

/** Reference as stored: `DB:accession` with both halves trimmed. */
export const formatReference = (reference: string): string => {
  const colonIdx = reference.indexOf(':')
  if (colonIdx === -1) return reference.trim()
  return `${reference.slice(0, colonIdx).trim()}:${reference.slice(colonIdx + 1).trim()}`
}

/**
 * The separate references in a reference value, each formatted. Several are
 * written `PMID:1| PMID:2` (how Noctua joins them); each becomes its own
 * `source` annotation.
 */
export const splitReferences = (value: string): string[] =>
  value
    .split('|')
    .map(part => part.trim())
    .filter(Boolean)
    .map(formatReference)

/** Whether every reference in the value is `DB:accession` with an accession. */
export const isValidReferenceList = (value: string): boolean => {
  const references = splitReferences(value)
  return (
    references.length > 0 &&
    references.every(reference => {
      const colonIdx = reference.indexOf(':')
      return colonIdx > 0 && reference.slice(colonIdx + 1).trim().length > 0
    })
  )
}
