import type { Entity } from '@/features/gocam/models/cam'

export enum AutocompleteType {
  TERM = 'term',
  REFERENCE = 'reference',
  EVIDENCE_CODE = 'evidence_code',
  WITH = 'with',
  COMMENT = 'comment',
}

export interface GOlrResponse {
  id: string
  label: string
  link: string
  description: string
  isObsolete: boolean
  replacedBy: string
  rootTypes: Entity[]
  xref: string
  notAnnotatable: boolean
  neighborhoodGraphJson: string
}

/**
 * GOlr `fq` filter for a term search: the search matches any `closureIds`
 * (`isa_closure`), and never a term in `excludeClosureIds` or whose `idspace`
 * is in `excludeIdspaces`. All three are OR'd into a single Lucene clause, where
 * the NOT clauses act as exclusions (e.g. the gene-product field searches
 * gene products or protein complexes, `NOT idspace:"GO"`).
 */
export interface TermSearchFilter {
  closureIds: string[]
  excludeClosureIds?: string[]
  excludeIdspaces?: string[]
}
