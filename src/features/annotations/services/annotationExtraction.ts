import type { Edge, Entity, Evidence, GraphModel, GraphNode } from '@/features/gocam/models/cam'
import { RootTypes } from '@/features/gocam/models/cam'
import { Relations } from '@/@noctua.core/models/relations'
import type { AnnotationEdgeDefinition } from '../data/annotationConfig'
import {
  ANNOTATION_EDGE_CONFIG,
  BP_ONLY_CAUSAL_EDGES,
  CAUSAL_EDGES,
  GP_SUBJECT_EDGES,
  MF_TO_TERM_EDGES,
} from '../data/annotationConfig'
import type { AnnotationExtension, StandardAnnotation } from '../models/annotation'
import { AnnotationUnitType } from '../models/annotation'
import { SHAPE_PREDICATES, findRelation, getTermRelations, isShapeTerm } from './shapeRules'

/**
 * A gene product as standard annotations use it: a gene product, or a protein
 * complex that isn't a GO class (ComplexPortal) — the same set the gene product
 * field searches (`NOT idspace:"GO"`).
 */
export const isGeneProductLike = (node: GraphNode): boolean =>
  node.rootTypes.includes(RootTypes.MOLECULAR_ENTITY) ||
  (node.rootTypes.includes(RootTypes.PROTEIN_CONTAINING_COMPLEX) && !node.id.startsWith('GO:'))

/** Edges that start a standard annotation (Angular `isStartEdge`). */
export const isStartEdge = (edge: Edge, subject: GraphNode): boolean =>
  edge.id === Relations.ENABLED_BY || (GP_SUBJECT_EDGES.has(edge.id) && isGeneProductLike(subject))

/**
 * The displayed relation for the stored edges: the first config entry whose
 * fields all equal `criteria` (Angular `findEdgeByCriteria`).
 */
export const findRelationByCriteria = (
  criteria: Partial<AnnotationEdgeDefinition>
): Entity | null => {
  for (const [relationId, definition] of Object.entries(ANNOTATION_EDGE_CONFIG)) {
    const matches = (Object.keys(criteria) as (keyof AnnotationEdgeDefinition)[]).every(
      key => definition[key] === criteria[key]
    )
    if (matches) return findRelation(relationId)
  }
  return null
}

const latestDate = (dates: (string | undefined)[]): string | null => {
  let latest: string | null = null
  for (const date of dates) {
    if (date && (!latest || date > latest)) latest = date
  }
  return latest
}

interface GraphIndex {
  nodesById: Map<string, GraphNode>
  outgoing: Map<string, Edge[]>
}

const indexGraph = (model: GraphModel): GraphIndex => {
  const nodesById = new Map(model.nodes.map(node => [node.uid, node]))
  const outgoing = new Map<string, Edge[]>()
  for (const edge of model.edges) {
    const list = outgoing.get(edge.sourceId)
    if (list) list.push(edge)
    else outgoing.set(edge.sourceId, [edge])
  }
  return { nodesById, outgoing }
}

/**
 * Whether the subgraph walk may follow `edge` out of `node`: any GO-CAM shape
 * predicate except the causal ones, which would wander into neighbouring
 * activities — but a root MF of an "acts upstream of" annotation follows its
 * causal edge to the BP. A target with no root types at all (an obsolete or not
 * yet loaded term, which Minerva can't classify) is followed too, as in Angular.
 */
const canFollow = (
  edge: Edge,
  node: GraphNode,
  target: GraphNode,
  unitType: AnnotationUnitType
): boolean => {
  if (!SHAPE_PREDICATES.has(edge.id) || !isShapeTerm(edge.id)) return false
  if (!CAUSAL_EDGES.has(edge.id)) return true
  return (
    unitType === AnnotationUnitType.BP_ONLY &&
    node.id === RootTypes.MOLECULAR_FUNCTION &&
    BP_ONLY_CAUSAL_EDGES.has(edge.id) &&
    (target.rootTypes.length === 0 || target.rootTypes.includes(RootTypes.BIOLOGICAL_PROCESS))
  )
}

/** What the subgraph walk must leave to the other annotations of the model. */
interface WalkBoundary {
  /** Individuals other annotations are rooted at. */
  otherRoots: Set<string>
  /** Start edges of other annotations. */
  otherStartEdges: Set<string>
}

/**
 * Collect the annotation's subgraph from `start` (Angular `_graphToActivityDFS`).
 * SAE gives every annotation its own individuals, so normally this is just the
 * annotation. For models edited elsewhere the walk never takes another
 * annotation's start edge, and stops at another annotation's root (which it may
 * still include, e.g. as an extension term) instead of absorbing that annotation.
 */
const collectSubgraph = (
  start: GraphNode,
  index: GraphIndex,
  unitType: AnnotationUnitType,
  boundary: WalkBoundary,
  nodes: GraphNode[],
  edges: Edge[],
  visited: Set<string>
) => {
  const stack = [start]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (visited.has(node.uid)) continue
    visited.add(node.uid)
    nodes.push(node)
    if (node !== start && boundary.otherRoots.has(node.uid)) continue

    const outgoing = index.outgoing.get(node.uid) ?? []
    // Push in reverse so edges are walked in fact order.
    for (let i = outgoing.length - 1; i >= 0; i--) {
      const edge = outgoing[i]
      if (boundary.otherStartEdges.has(edge.uid)) continue
      const target = index.nodesById.get(edge.targetId)
      if (!target || !canFollow(edge, node, target, unitType)) continue
      edges.push(edge)
      stack.push(target)
    }
  }
}

const orderEdges = (edges: Edge[], factOrder: Map<string, number>): Edge[] =>
  [...edges].sort((a, b) => (factOrder.get(a.uid) ?? 0) - (factOrder.get(b.uid) ?? 0))

const getExtensions = (
  goTerm: GraphNode,
  edges: Edge[],
  index: GraphIndex
): AnnotationExtension[] => {
  const extensions: AnnotationExtension[] = []
  for (const edge of edges) {
    if (edge.sourceId !== goTerm.uid) continue
    const term = index.nodesById.get(edge.targetId)
    if (!term) continue
    const allowed = getTermRelations(goTerm.rootTypes, term.rootTypes)
    if (!allowed.some(relation => relation.id === edge.id)) continue
    const known = findRelation(edge.id)
    extensions.push({
      edge,
      relation: { id: edge.id, label: known.label === edge.id ? edge.label : known.label },
      term,
    })
  }
  return extensions
}

const uniqueComments = (edges: Edge[]): string[] => {
  const comments = new Set<string>()
  for (const edge of edges) edge.comments.forEach(comment => comments.add(comment))
  return Array.from(comments)
}

/**
 * Read the model's standard annotations (Angular `graphToActivities` +
 * `activityToAnnotation`). Each start edge yields one row:
 *
 * - `MF enabled_by GP`: the GO term is the MF, or — for a root
 *   `molecular_function` — the object of its last part_of / occurs_in /
 *   causally-upstream edge ("involved in", "acts upstream of").
 * - `GP located_in | is_active_in | part_of | contributes_to X`: the GO term is X.
 */
export const extractAnnotations = (model: GraphModel | null): StandardAnnotation[] => {
  if (!model) return []

  const index = indexGraph(model)
  const factOrder = new Map(model.edges.map((edge, i) => [edge.uid, i]))

  const startEdges = model.edges.filter(edge => {
    const subject = index.nodesById.get(edge.sourceId)
    return !!subject && isStartEdge(edge, subject)
  })
  const roots = new Set(startEdges.map(edge => edge.sourceId))
  const startEdgeKeys = new Set(startEdges.map(edge => edge.uid))

  const annotations: StandardAnnotation[] = []

  for (const startEdge of startEdges) {
    const subject = index.nodesById.get(startEdge.sourceId)!
    const object = index.nodesById.get(startEdge.targetId)
    if (!object) continue

    const otherRoots = new Set(roots)
    otherRoots.delete(subject.uid)
    const otherStartEdges = new Set(startEdgeKeys)
    otherStartEdges.delete(startEdge.uid)
    const boundary: WalkBoundary = { otherRoots, otherStartEdges }

    const nodes: GraphNode[] = []
    const collected: Edge[] = []
    const visited = new Set<string>()

    let unitType: AnnotationUnitType
    let gp: GraphNode
    let goTerm: GraphNode
    let termEdge = startEdge
    let criteria: Partial<AnnotationEdgeDefinition>

    if (startEdge.id !== Relations.ENABLED_BY) {
      unitType = AnnotationUnitType.CC_ONLY
      gp = subject
      goTerm = object
      criteria = { gpToTermPredicate: startEdge.id }

      // Only this start edge: the gene product's other edges are other annotations.
      nodes.push(subject)
      visited.add(subject.uid)
      collected.push(startEdge)
      collectSubgraph(object, index, unitType, boundary, nodes, collected, visited)
    } else {
      const mfOutgoing = index.outgoing.get(subject.uid) ?? []
      const isRootMF = subject.id === RootTypes.MOLECULAR_FUNCTION

      if (isRootMF && mfOutgoing.some(edge => BP_ONLY_CAUSAL_EDGES.has(edge.id))) {
        unitType = AnnotationUnitType.BP_ONLY
      } else if (object.rootTypes.includes(RootTypes.PROTEIN_CONTAINING_COMPLEX)) {
        unitType = AnnotationUnitType.PROTEIN_COMPLEX
      } else {
        unitType = AnnotationUnitType.DEFAULT
      }

      gp = object
      goTerm = subject
      criteria = { gpToTermPredicate: Relations.ENABLED_BY }

      collectSubgraph(subject, index, unitType, boundary, nodes, collected, visited)

      if (isRootMF) {
        for (const edge of orderEdges(collected, factOrder)) {
          if (edge.sourceId !== subject.uid || !MF_TO_TERM_EDGES.has(edge.id)) continue
          const target = index.nodesById.get(edge.targetId)
          if (!target) continue
          termEdge = edge
          goTerm = target
          criteria = {
            gpToTermPredicate: Relations.ENABLED_BY,
            mfNodeRequired: true,
            mfToTermPredicate: edge.id,
          }
        }
      }
    }

    const edges = orderEdges(collected, factOrder)
    const evidence: Evidence | null = startEdge.evidence[0] ?? null

    annotations.push({
      uid: startEdge.uid,
      unitType,
      rootNode: subject,
      gp,
      goTerm,
      startEdge,
      termEdge,
      relation: findRelationByCriteria(criteria) ?? { id: '', label: termEdge.label },
      relationChoices: getTermRelations(gp.rootTypes, goTerm.rootTypes, true),
      isComplement: goTerm.isComplement,
      evidence,
      extensions: getExtensions(goTerm, edges, index),
      comments: uniqueComments(edges),
      date: latestDate([
        ...nodes.map(node => node.date),
        ...edges.flatMap(edge => edge.evidence.map(ev => ev.date)),
      ]),
      nodes,
      edges,
    })
  }

  return annotations
}

/**
 * Individuals Delete Annotation may remove: the annotation's subgraph minus any
 * individual another annotation also uses. SAE gives every annotation its own
 * individuals, so this is normally the whole subgraph; it only matters for models
 * edited elsewhere (e.g. one gene product with two CC annotations, or one MF
 * enabled by two gene products sharing its extensions).
 */
export const getDeletableNodeUids = (
  annotation: StandardAnnotation,
  annotations: StandardAnnotation[]
): string[] => {
  const used = new Set<string>()
  for (const other of annotations) {
    if (other.uid === annotation.uid) continue
    for (const node of other.nodes) used.add(node.uid)
  }
  return annotation.nodes.filter(node => node.id && !used.has(node.uid)).map(node => node.uid)
}
