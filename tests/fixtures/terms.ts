// Relative imports: the e2e specs share this file and have no `@/` path alias.
import { RootTypes } from '../../src/features/gocam/models/cam'

/**
 * Named ontology terms the tests (unit and e2e) use as examples of GO-CAM shape
 * rules. When the shapes (ShEx) or an example changes, update it here rather than
 * in every spec.
 */
export interface TermFixture {
  id: string
  label: string
  /** GOlr `isa_closure` without the term itself. */
  ancestors: string[]
  /**
   * Minerva's `root-type`: only the top categories, e.g. just the BP root for a BP
   * whose ancestors include anatomical structure development (issue #85).
   */
  rootTypes: string[]
}

/** GOlr's `isa_closure` for a term: the term and its ancestors. */
export const isaClosure = (term: TermFixture): string[] => [term.id, ...term.ancestors]

const BP = RootTypes.BIOLOGICAL_PROCESS
const ANATOMY = RootTypes.ANATOMICAL_ENTITY

const DEVELOPMENTAL_PROCESS = 'GO:0032502'

/** The subject of the `results in development of` shape rule. */
export const ANATOMICAL_STRUCTURE_DEVELOPMENT: TermFixture = {
  id: 'GO:0048856',
  label: 'anatomical structure development',
  ancestors: [DEVELOPMENTAL_PROCESS, BP],
  rootTypes: [BP],
}

/** Under anatomical structure development (also in gomodel:MGI_MGI_102780). */
export const THYMUS_DEVELOPMENT: TermFixture = {
  id: 'GO:0048538',
  label: 'thymus development',
  ancestors: isaClosure(ANATOMICAL_STRUCTURE_DEVELOPMENT),
  rootTypes: [BP],
}

export const THYMUS: TermFixture = {
  id: 'UBERON:0002370',
  label: 'thymus',
  ancestors: [ANATOMY],
  rootTypes: [ANATOMY],
}

/** The extension of thymus development in gomodel:MGI_MGI_102780. */
export const THYMUS_PRIMORDIUM: TermFixture = {
  id: 'EMAPA:17523',
  label: 'thymus primordium',
  ancestors: [ANATOMY],
  rootTypes: [ANATOMY],
}

// The other two annotations of `raw/models/bp-one-hop-extensions.json`. Only the
// ids and labels are used; Minerva gives the BPs the BP root and the cells anatomy.

export const EPITHELIAL_CELL_DIFFERENTIATION: TermFixture = {
  id: 'GO:0030855',
  label: 'epithelial cell differentiation',
  ancestors: [],
  rootTypes: [BP],
}

export const EPITHELIAL_CELL: TermFixture = {
  id: 'CL:0000066',
  label: 'epithelial cell',
  ancestors: [],
  rootTypes: [ANATOMY],
}

export const MYOBLAST_MIGRATION: TermFixture = {
  id: 'GO:0051451',
  label: 'myoblast migration',
  ancestors: [],
  rootTypes: [BP],
}

export const MYOBLAST: TermFixture = {
  id: 'CL:0000056',
  label: 'myoblast',
  ancestors: [],
  rootTypes: [ANATOMY],
}
