import type { Edge, Entity, Evidence, GraphNode } from '@/features/gocam/models/cam'

/** How the annotation is stored — the Angular `ActivityType` it was read as. */
export enum AnnotationUnitType {
  /** `MF enabled_by GP` (MF annotation, or BP via a root MF `part_of`). */
  DEFAULT = 'default',
  /** Root MF with an "acts upstream of (or within)" causal edge to a BP. */
  BP_ONLY = 'bpOnly',
  /** Edge straight from the gene product: located in, is active in, part of, contributes to. */
  CC_ONLY = 'ccOnly',
  /** `MF enabled_by <protein complex>`. */
  PROTEIN_COMPLEX = 'proteinComplex',
}

export interface AnnotationExtension {
  /** The fact from the annotation's GO term to the extension term. */
  edge: Edge
  relation: Entity
  term: GraphNode
}

/**
 * One row of the standard-annotations table: gene product, relation, GO term,
 * evidence, extensions, comments — read from a small GO-CAM subgraph.
 */
export interface StandardAnnotation {
  /** The key of the start edge, stable across reloads. */
  uid: string
  unitType: AnnotationUnitType
  /** `MF` for enabled-by annotations, the gene product for gene-product-subject ones. */
  rootNode: GraphNode
  gp: GraphNode
  goTerm: GraphNode
  /** The fact the annotation was read from: `MF enabled_by GP` or `GP <relation> X`. */
  startEdge: Edge
  /**
   * The fact that carries the annotation's relation: `MF enabled_by GP`,
   * `MF(root) part_of BP`, or `GP located_in CC`.
   */
  termEdge: Edge
  /** What the Relationship column shows ("enables", "involved in", "located in", …). */
  relation: Entity
  /** Relations the gene product → GO term rules allow for this pair. */
  relationChoices: Entity[]
  /** NOT qualifier — the GO term individual is a complement. */
  isComplement: boolean
  /** The first evidence on the start edge — what the table shows and edits fan out from. */
  evidence: Evidence | null
  extensions: AnnotationExtension[]
  /** Unique comments across every fact of the annotation. */
  comments: string[]
  /** Latest `YYYY-MM-DD` among the subgraph's individuals and evidence. */
  date: string | null
  /** Every individual of the annotation — what Delete Annotation removes. */
  nodes: GraphNode[]
  /** Every fact of the annotation — what evidence and comment edits update. */
  edges: Edge[]
}
