import type { Group, Contributor } from '@/features/users/models/contributor'

export enum RootTypes {
  PROTEIN_CONTAINING_COMPLEX = 'GO:0032991',
  CELLULAR_COMPONENT = 'GO:0005575',
  CELLULAR_ANATOMICAL = 'GO:0110165',
  BIOLOGICAL_PROCESS = 'GO:0008150',
  MOLECULAR_FUNCTION = 'GO:0003674',
  MOLECULAR_ENTITY = 'CHEBI:33695',
  CHEMICAL_ENTITY = 'CHEBI:24431',
  EVIDENCE = 'ECO:0000352',
  EVIDENCE_NODE = 'ECO:0000000',
  CELL_TYPE = 'CL:0000000',
  ANATOMICAL_ENTITY = 'UBERON:0001062',
  ORGANISM = 'NCBITaxon:1',
  BIOLOGICAL_PHASE = 'GO:0044848',
  UBERON_STAGE = 'UBERON:0000105',
  PLANT_STAGE = 'PO:0009012',
}

/**
 * Phase/stage root types. Terms under these are marked `gocheck_do_not_annotate`
 * but are allowed in extension fields whose range is a phase/stage (e.g. `happens during`).
 * When a field's closure context includes one of these, do-not-annotate filtering is bypassed.
 */
export const PHASE_CATEGORIES = new Set<string>([
  RootTypes.BIOLOGICAL_PHASE,
  RootTypes.UBERON_STAGE,
  RootTypes.PLANT_STAGE,
])

export enum Aspect {
  MOLECULAR_FUNCTION = 'F',
  BIOLOGICAL_PROCESS = 'P',
  CELLULAR_COMPONENT = 'C',
}

export interface Entity {
  id: string
  label: string
}

/** A Minerva individual. `id`/`label` are its class (the filler class when complemented). */
export interface GraphNode {
  uid: string
  id: string
  label: string
  rootTypes: string[]
  /** The individual's type is `NOT <class>` — the annotation's NOT qualifier. */
  isComplement: boolean
  contributors: Contributor[]
  date?: string
  groups: Group[]
  /** `source` annotations — the references on an evidence individual. */
  sources: string[]
  /** The first `with` annotation — the with/from on an evidence individual. */
  with?: string
  comments: string[]
}

export interface Evidence {
  uid: string
  evidenceCode: Entity
  /** Sources joined the way Noctua displays them (`B| A`). */
  reference: string
  /** The individual `source` values, for removing them one by one. */
  sources: string[]
  referenceUrl: string
  with: string
  groups: Group[]
  contributors: Contributor[]
  date?: string
}

/** A Minerva fact. Facts have no id of their own, so `uid` is the `s|p|o` triple key. */
export interface Edge {
  uid: string
  id: string
  label: string
  sourceId: string
  targetId: string
  evidence: Evidence[]
  contributors: Contributor[]
  groups: Group[]
  date?: string
  comments: string[]
}

export interface GraphModel {
  id: string
  nodes: GraphNode[]
  edges: Edge[]
  conformsToGPAD?: boolean
  /** The model state shown (the first `state` annotation). */
  state?: string
  /** Every `state` annotation — a save replaces them all. */
  states: string[]
  comments: string[]
  contributors: Contributor[]
  date?: string
  /** The title shown (the first `title` annotation). */
  title?: string
  /** Every `title` annotation — a save replaces them all. */
  titles: string[]
  groups: Group[]
  /** `modified-p`: the active model has changes that were never stored. */
  modified: boolean
  taxon?: string
}

export interface GraphModelApiResponse {
  data: GraphModel
}

/** Who an edit is attributed to: the user's ORCID and the group they act for. */
export interface UserContext {
  orcid: string
  groupUrl: string
}

export const edgeKey = (subject: string, predicate: string, object: string): string =>
  `${subject}|${predicate}|${object}`
