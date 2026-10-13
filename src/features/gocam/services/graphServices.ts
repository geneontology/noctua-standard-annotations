import type { Contributor, Group } from '@/features/users/models/contributor'
import type { Edge, Evidence, GraphModel, GraphNode } from '../models/cam'
import { edgeKey } from '../models/cam'
import { AnnotationKey } from '../models/operations'
import { getEntityUrl } from '@/@noctua.core/services/goLinker/goLinker'

/** Barista users and groups, used to put names on contributor/group IRIs. */
export interface GraphMetadata {
  contributors: Contributor[]
  groups: Group[]
}

const emptyMetadata: GraphMetadata = { contributors: [], groups: [] }

export const emptyGraphModel = (): GraphModel => ({
  id: '',
  nodes: [],
  edges: [],
  contributors: [],
  groups: [],
  comments: [],
  titles: [],
  states: [],
  modified: false,
})

/** Noctua shows multi-source references as `B| A` (descending sort, `| ` joined). */
export const joinSources = (sources: string[]): string =>
  [...sources].sort((a, b) => (a > b ? -1 : 1)).join('| ')

export function extractEvidence(
  evidenceId: string,
  nodesById: Map<string, GraphNode>
): Evidence | undefined {
  const evidenceNode = nodesById.get(evidenceId)
  if (!evidenceNode) return undefined

  const reference = joinSources(evidenceNode.sources)

  return {
    uid: evidenceNode.uid,
    evidenceCode: {
      id: evidenceNode.id,
      label: evidenceNode.label,
    },
    reference,
    sources: [...evidenceNode.sources],
    // A joined `B| A` has no single link-out; the table links each source instead.
    referenceUrl: evidenceNode.sources.length === 1 ? (getEntityUrl(reference) ?? '') : '',
    with: evidenceNode.with || '',
    groups: evidenceNode.groups,
    contributors: evidenceNode.contributors,
    date: evidenceNode.date,
  }
}

/**
 * Turn an m3Batch `data` payload into a plain, serializable {@link GraphModel}.
 * Contributor and group IRIs are resolved against Barista metadata when it is
 * available and kept as bare IRIs otherwise.
 */
export const transformGraphData = (
  data: any,
  metadata: GraphMetadata = emptyMetadata
): GraphModel => {
  if (!data) return emptyGraphModel()

  const getContributor = (uri: string): Contributor =>
    metadata.contributors.find(c => c.uri === uri) ?? ({ uri } as Contributor)

  const getGroup = (id: string): Group =>
    metadata.groups.find(g => g.id === id) ?? ({ id } as Group)

  const nodes: GraphNode[] = []

  for (const individual of Array.isArray(data.individuals) ? data.individuals : []) {
    // Like the Angular reader: the last asserted type names the individual, and it
    // is a NOT only when every type is a complement.
    const types: any[] = Array.isArray(individual.type) ? individual.type : []
    const rawType = types[types.length - 1]
    const isComplement = types.length > 0 && types.every(t => t?.type === 'complement')
    const resolvedType = rawType?.type === 'complement' ? rawType?.filler : rawType

    const node: GraphNode = {
      uid: individual.id,
      id: resolvedType?.id ?? '',
      label: resolvedType?.label ?? resolvedType?.id ?? '',
      rootTypes: (individual['root-type'] ?? []).map((rt: any) => rt.id),
      isComplement,
      contributors: [],
      groups: [],
      sources: [],
      comments: [],
    }

    for (const annotation of individual.annotations ?? []) {
      switch (annotation.key) {
        case AnnotationKey.CONTRIBUTOR:
          node.contributors.push(getContributor(annotation.value))
          break
        case AnnotationKey.DATE:
          node.date = annotation.value
          break
        case AnnotationKey.PROVIDED_BY:
          node.groups.push(getGroup(annotation.value))
          break
        case AnnotationKey.SOURCE:
          node.sources.push(annotation.value)
          break
        case AnnotationKey.WITH:
          // Noctua keeps a single with/from string per evidence; the first wins.
          if (node.with === undefined) node.with = annotation.value
          break
        case AnnotationKey.COMMENT:
          node.comments.push(annotation.value)
          break
      }
    }

    nodes.push(node)
  }

  const nodesById = new Map(nodes.map(node => [node.uid, node]))
  const edges: Edge[] = []

  for (const fact of Array.isArray(data.facts) ? data.facts : []) {
    if (!nodesById.has(fact.subject) || !nodesById.has(fact.object)) continue

    const edge: Edge = {
      uid: edgeKey(fact.subject, fact.property, fact.object),
      id: fact.property,
      label: fact['property-label'] || fact.property,
      sourceId: fact.subject,
      targetId: fact.object,
      contributors: [],
      groups: [],
      evidence: [],
      comments: [],
    }

    for (const annotation of fact.annotations ?? []) {
      switch (annotation.key) {
        case AnnotationKey.CONTRIBUTOR:
          edge.contributors.push(getContributor(annotation.value))
          break
        case AnnotationKey.DATE:
          edge.date = annotation.value
          break
        case AnnotationKey.PROVIDED_BY:
          edge.groups.push(getGroup(annotation.value))
          break
        case AnnotationKey.EVIDENCE: {
          const evidence = extractEvidence(annotation.value, nodesById)
          if (evidence) edge.evidence.push(evidence)
          break
        }
        case AnnotationKey.COMMENT:
          edge.comments.push(annotation.value)
          break
      }
    }

    edges.push(edge)
  }

  const graphModel: GraphModel = {
    ...emptyGraphModel(),
    id: data.id || '',
    nodes,
    edges,
    modified: data['modified-p'] === true,
  }

  for (const annotation of data.annotations ?? []) {
    switch (annotation.key) {
      case AnnotationKey.CONFORMS_TO_GPAD:
        graphModel.conformsToGPAD = annotation.value === 'true'
        break
      case AnnotationKey.STATE:
        graphModel.states.push(annotation.value)
        break
      case AnnotationKey.DATE:
        graphModel.date = annotation.value
        break
      case AnnotationKey.TITLE:
        graphModel.titles.push(annotation.value)
        break
      case AnnotationKey.CONTRIBUTOR:
        graphModel.contributors.push(getContributor(annotation.value))
        break
      case AnnotationKey.PROVIDED_BY:
        graphModel.groups.push(getGroup(annotation.value))
        break
      case AnnotationKey.COMMENT:
        graphModel.comments.push(annotation.value)
        break
      case AnnotationKey.IN_TAXON:
        graphModel.taxon = annotation.value
        break
    }
  }

  // Older models can carry several titles or states; show the first, as Noctua does.
  graphModel.title = graphModel.titles[0]
  graphModel.state = graphModel.states[0]

  return graphModel
}

/**
 * Minerva and Barista report failures with HTTP 200 and an error body
 * (`message-type` from Minerva, `message_type` from Barista). Returns the message
 * of such a body, or null when the response is a success.
 */
export const getBatchErrorMessage = (body: any): string | null => {
  if (!body || typeof body !== 'object') return null
  const type = body['message-type'] ?? body['message_type']
  if (type !== 'error') return null
  return describeBatchError(String(body.message ?? 'Unknown error'))
}

/** Curator-facing wording for the errors the Angular manager used to alert on. */
export const describeBatchError = (message: string): string => {
  if (message.includes('InsufficientPermissionsException')) {
    return 'It seems like you do not have permission to perform that operation. Did you remember to log in?'
  }
  if (message.toLowerCase().includes('token')) {
    return 'It seems like you have a bad token. Please log in again.'
  }
  if (message.includes('UnknownIdentifierException')) {
    return 'The model could not be found.'
  }
  return message
}
