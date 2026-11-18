import { RootTypes } from '@/features/gocam/models/cam'
import type { TermSearchFilter } from '@/features/search/models/search'

/**
 * Gene product field: gene products or protein complexes, but not GO classes —
 * so a complex means a ComplexPortal entity, not a GO complex term (Angular
 * `GoMolecularEntity` + `GPProteinContainingComplex`).
 */
export const GENE_PRODUCT_FILTER: TermSearchFilter = {
  closureIds: [RootTypes.MOLECULAR_ENTITY, RootTypes.PROTEIN_CONTAINING_COMPLEX],
  excludeIdspaces: ['GO'],
}

/** Evidence code field: ECO terms used in manual assertions. */
export const EVIDENCE_FILTER: TermSearchFilter = {
  closureIds: [RootTypes.EVIDENCE],
}
