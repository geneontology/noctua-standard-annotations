import { InverseRelations, Relations } from '@/@noctua.core/models/relations'
import { Aspect, RootTypes } from '@/features/gocam/models/cam'

/**
 * How a standard-annotation relation (the gene-product-centric "enables",
 * "involved in", "located in", …) is stored as GO-CAM edges.
 */
export interface AnnotationEdgeDefinition {
  /** The edge between the gene product and the GO term (or the root MF, see below). */
  gpToTermPredicate: string
  /** Stored term → gene product, e.g. "GP enables MF" is `MF enabled_by GP`. */
  gpToTermReverse?: boolean
  /**
   * Stored through a root `molecular_function` individual: `MF enabled_by GP` plus
   * `MF <mfToTermPredicate> term` — how "involved in" / "acts upstream of" are modeled.
   */
  mfNodeRequired: boolean
  mfToTermPredicate?: string
}

/**
 * Keyed by the displayed (inverse) relation id. Order matters: reading a model,
 * the first entry whose fields match the stored edges names the relation
 * (Angular `findEdgeByCriteria`).
 */
export const ANNOTATION_EDGE_CONFIG: Record<string, AnnotationEdgeDefinition> = {
  [InverseRelations.ENABLES]: {
    gpToTermPredicate: Relations.ENABLED_BY,
    gpToTermReverse: true,
    mfNodeRequired: false,
  },
  [InverseRelations.INVOLVED_IN]: {
    gpToTermPredicate: Relations.ENABLED_BY,
    mfToTermPredicate: Relations.PART_OF,
    mfNodeRequired: true,
  },
  [InverseRelations.IS_ACTIVE_IN]: {
    gpToTermPredicate: Relations.IS_ACTIVE_IN,
    mfNodeRequired: false,
    gpToTermReverse: false,
  },
  [InverseRelations.ACTS_UPSTREAM_OF]: {
    gpToTermPredicate: Relations.ENABLED_BY,
    mfToTermPredicate: Relations.CAUSALLY_UPSTREAM_OF,
    mfNodeRequired: true,
  },
  [InverseRelations.ACTS_UPSTREAM_OF_OR_WITHIN]: {
    gpToTermPredicate: Relations.ENABLED_BY,
    mfToTermPredicate: Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN,
    mfNodeRequired: true,
  },
  [InverseRelations.ACTS_UPSTREAM_OF_OR_WITHIN_POSITIVE_EFFECT]: {
    gpToTermPredicate: Relations.ENABLED_BY,
    mfToTermPredicate: Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN_POSITIVE_EFFECT,
    mfNodeRequired: true,
  },
  [InverseRelations.ACTS_UPSTREAM_OF_OR_WITHIN_NEGATIVE_EFFECT]: {
    gpToTermPredicate: Relations.ENABLED_BY,
    mfToTermPredicate: Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN_NEGATIVE_EFFECT,
    mfNodeRequired: true,
  },
  [InverseRelations.ACTS_UPSTREAM_OF_POSITIVE_EFFECT]: {
    gpToTermPredicate: Relations.ENABLED_BY,
    mfToTermPredicate: Relations.CAUSALLY_UPSTREAM_OF_POSITIVE_EFFECT,
    mfNodeRequired: true,
  },
  [InverseRelations.ACTS_UPSTREAM_OF_NEGATIVE_EFFECT]: {
    gpToTermPredicate: Relations.ENABLED_BY,
    mfToTermPredicate: Relations.CAUSALLY_UPSTREAM_OF_NEGATIVE_EFFECT,
    mfNodeRequired: true,
  },
  [InverseRelations.CONTRIBUTES_TO]: {
    gpToTermPredicate: Relations.CONTRIBUTES_TO,
    mfNodeRequired: false,
    gpToTermReverse: false,
  },
  [InverseRelations.LOCATED_IN]: {
    gpToTermPredicate: Relations.LOCATED_IN,
    mfNodeRequired: false,
    gpToTermReverse: false,
  },
  [InverseRelations.PART_OF]: {
    gpToTermPredicate: Relations.PART_OF,
    mfNodeRequired: false,
    gpToTermReverse: false,
  },
}

/** Root GO terms by aspect — the "Add MF/BP/CC Root" shortcuts. */
export const ROOT_NODES = {
  mf: { id: RootTypes.MOLECULAR_FUNCTION, label: 'molecular_function', aspect: Aspect.MOLECULAR_FUNCTION },
  bp: { id: RootTypes.BIOLOGICAL_PROCESS, label: 'biological_process', aspect: Aspect.BIOLOGICAL_PROCESS },
  cc: { id: RootTypes.CELLULAR_COMPONENT, label: 'cellular_component', aspect: Aspect.CELLULAR_COMPONENT },
} as const

export type RootNodeKey = keyof typeof ROOT_NODES

/** Pre-filled evidence: ND for root-term annotations, ISS for the "Add ISS Evidence" menu. */
export const EVIDENCE_AUTO_POPULATE = {
  nd: {
    evidence: { id: 'ECO:0000307', label: 'no biological data found used in manual assertion' },
    reference: 'GO_REF:0000015',
  },
  iss: {
    evidence: { id: 'ECO:0000250', label: 'sequence similarity evidence used in manual assertion' },
    reference: 'GO_REF:0000024',
  },
} as const

/** Root-MF edges that carry a BP/CC annotation ("involved in", "acts upstream of", …). */
export const MF_TO_TERM_EDGES = new Set<string>([
  Relations.PART_OF,
  Relations.OCCURS_IN,
  Relations.CAUSALLY_UPSTREAM_OF,
  Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN,
  Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN_POSITIVE_EFFECT,
  Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN_NEGATIVE_EFFECT,
  Relations.CAUSALLY_UPSTREAM_OF_POSITIVE_EFFECT,
  Relations.CAUSALLY_UPSTREAM_OF_NEGATIVE_EFFECT,
])

/** Edges stored directly from the gene product (CC / complex / contributes-to annotations). */
export const GP_SUBJECT_EDGES = new Set<string>([
  Relations.LOCATED_IN,
  Relations.IS_ACTIVE_IN,
  Relations.PART_OF,
  Relations.CONTRIBUTES_TO,
])

/** Activity-to-activity causal edges. A standard annotation's subgraph never follows them… */
export const CAUSAL_EDGES = new Set<string>([
  Relations.CONSTITUTIVELY_UPSTREAM_OF,
  Relations.DIRECTLY_NEGATIVELY_REGULATES,
  Relations.DIRECTLY_REGULATES,
  Relations.DIRECTLY_POSITIVELY_REGULATES,
  Relations.INDIRECTLY_NEGATIVELY_REGULATES,
  Relations.INDIRECTLY_POSITIVELY_REGULATES,
  Relations.NEGATIVELY_REGULATES,
  Relations.REGULATES,
  Relations.POSITIVELY_REGULATES,
  Relations.CAUSALLY_UPSTREAM_OF_NEGATIVE_EFFECT,
  Relations.CAUSALLY_UPSTREAM_OF,
  Relations.CAUSALLY_UPSTREAM_OF_POSITIVE_EFFECT,
  Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN_NEGATIVE_EFFECT,
  Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN_POSITIVE_EFFECT,
  Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN,
  Relations.PROVIDES_INPUT_FOR,
  Relations.REMOVES_INPUT_FOR,
])

/** …except these, from a root MF to a BP: the "acts upstream of (or within)" annotations. */
export const BP_ONLY_CAUSAL_EDGES = new Set<string>([
  Relations.CAUSALLY_UPSTREAM_OF_NEGATIVE_EFFECT,
  Relations.CAUSALLY_UPSTREAM_OF,
  Relations.CAUSALLY_UPSTREAM_OF_POSITIVE_EFFECT,
  Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN_NEGATIVE_EFFECT,
  Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN_POSITIVE_EFFECT,
  Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN,
])

/** Most gene ids accepted by Add More Gene(s). */
export const MAX_GENES = 150
