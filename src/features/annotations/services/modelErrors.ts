import type { Edge, GraphModel, GraphNode } from '@/features/gocam/models/cam'
import { RootTypes } from '@/features/gocam/models/cam'
import type { StandardAnnotation } from '../models/annotation'

/** A fact the table doesn't show, with its subject and object resolved. */
export interface HiddenEdge {
  edge: Edge
  source: GraphNode | undefined
  target: GraphNode | undefined
}

/**
 * The model's SAE errors: what the model holds that the standard annotations
 * table doesn't show. Anything not shown is an error (the principle of the VPE's
 * Validation Errors, judged by what SAE shows).
 */
export interface ModelErrors {
  /** Individuals no row shows (evidence individuals aside). */
  hiddenNodes: GraphNode[]
  /** Hidden individuals with no hidden fact: on their own in the model. */
  standaloneNodes: GraphNode[]
  /** Hidden individuals a hidden fact uses: the node/relation combination isn't allowed. */
  relationNodes: GraphNode[]
  /** Facts no row shows. */
  hiddenEdges: HiddenEdge[]
  total: number
}

export const emptyModelErrors = (): ModelErrors => ({
  hiddenNodes: [],
  standaloneNodes: [],
  relationNodes: [],
  hiddenEdges: [],
  total: 0,
})

/**
 * What a row shows: the gene product, the GO term and the individual the
 * annotation is rooted at (a root MF for "involved in" / "acts upstream of"),
 * the start and relation facts, and each extension's fact and term.
 */
const collectShown = (annotations: StandardAnnotation[]) => {
  const nodes = new Set<string>()
  const edges = new Set<string>()
  for (const annotation of annotations) {
    nodes.add(annotation.rootNode.uid)
    nodes.add(annotation.gp.uid)
    nodes.add(annotation.goTerm.uid)
    edges.add(annotation.startEdge.uid)
    edges.add(annotation.termEdge.uid)
    for (const extension of annotation.extensions) {
      edges.add(extension.edge.uid)
      nodes.add(extension.term.uid)
    }
  }
  return { nodes, edges }
}

/**
 * Compare the model with the rows SAE reads from it.
 * Evidence individuals are never errors in themselves: they are shown with
 * their fact, and reported with it when the fact is hidden.
 */
export const findModelErrors = (
  model: GraphModel | null,
  annotations: StandardAnnotation[]
): ModelErrors => {
  if (!model) return emptyModelErrors()

  const shown = collectShown(annotations)
  const nodesById = new Map(model.nodes.map(node => [node.uid, node]))
  const evidenceUids = new Set(model.edges.flatMap(edge => edge.evidence.map(ev => ev.uid)))

  const hiddenEdges: HiddenEdge[] = model.edges
    .filter(edge => !shown.edges.has(edge.uid))
    .map(edge => ({
      edge,
      source: nodesById.get(edge.sourceId),
      target: nodesById.get(edge.targetId),
    }))

  const hiddenNodes = model.nodes.filter(
    node =>
      !shown.nodes.has(node.uid) &&
      !evidenceUids.has(node.uid) &&
      !node.rootTypes.includes(RootTypes.EVIDENCE_NODE)
  )

  const inHiddenEdges = new Set<string>()
  for (const { edge } of hiddenEdges) {
    inHiddenEdges.add(edge.sourceId)
    inHiddenEdges.add(edge.targetId)
  }

  return {
    hiddenNodes,
    standaloneNodes: hiddenNodes.filter(node => !inHiddenEdges.has(node.uid)),
    relationNodes: hiddenNodes.filter(node => inHiddenEdges.has(node.uid)),
    hiddenEdges,
    total: hiddenNodes.length + hiddenEdges.length,
  }
}
