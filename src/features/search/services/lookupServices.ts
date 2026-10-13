import type { Entity } from '@/features/gocam/models/cam'
import { PHASE_CATEGORIES } from '@/features/gocam/models/cam'
import type { GOlrResponse, TermSearchFilter } from '../models/search'
import { getEntityUrl } from '@/@noctua.core/services/goLinker/goLinker'

// Helper function to escape special characters in Golr queries
export const escapeGOlrValue = (str: string): string => {
  const pattern: RegExp = /([!*+\-<>=()[\]{}^~?:\\/"|])/g
  return str.replace(pattern, '\\$1')
}

export const formatSolrQueryString = (query: string): string => {
  const alphanumericRegex = /^[a-zA-Z0-9 ]+$/
  let formattedQuery = query
  const minimalQueryLength = 3

  if (query && query.length > 0) {
    const hasCursor = query.slice(-1) !== ' '
    query = query.trim()

    if (query.length > 0 && alphanumericRegex.test(query) && hasCursor) {
      const tokens = query.split(/\s+/)
      const lastToken = tokens[tokens.length - 1]

      if (tokens.length === 1 && lastToken.length >= minimalQueryLength) {
        tokens[tokens.length - 1] = lastToken + '*'
      } else if (tokens.length > 1) {
        tokens[tokens.length - 1] = lastToken + '*'
      }

      formattedQuery = tokens.join(' ')
    }
  }

  return formattedQuery
}

/**
 * Build the category `fq` clause for a term search, mirroring the Angular
 * `categoryToClosure`: `isa_closure:"A" OR isa_closure:"B" OR NOT idspace:"GO"`.
 * Returns null when there is nothing to filter on.
 */
export const buildCategoryFilter = (filter: TermSearchFilter): string | null => {
  const clauses = [
    ...filter.closureIds.map(id => `isa_closure:"${id}"`),
    ...(filter.excludeClosureIds ?? []).map(id => `NOT isa_closure:"${id}"`),
    ...(filter.excludeIdspaces ?? []).map(idspace => `NOT idspace:"${idspace}"`),
  ]
  return clauses.length > 0 ? clauses.join(' OR ') : null
}

export const mapGOlrResponse = (response: any, closureIds?: string[]): GOlrResponse[] => {
  const docs = response.response.docs
  // When the search field's range is a phase/stage (e.g. `happens during`), allow
  // do-not-annotate terms — they are valid extension targets there.
  const allowNotAnnotatable = closureIds?.some(id => PHASE_CATEGORIES.has(id))

  return docs.map((item: any) => {
    let xref
    if (item.database_xref && item.database_xref.length > 0) {
      const xrefDB = item.database_xref[0].split(':')
      xref = xrefDB.length > 1 ? xrefDB[1] : xrefDB[0]
    }

    return {
      id: item.annotation_class,
      label: item.annotation_class_label,
      link: getTermURL(item.annotation_class),
      description: item.description,
      isObsolete: item.is_obsolete,
      replacedBy: item.replaced_by,
      rootTypes: makeEntitiesArray(item.isa_closure, item.isa_closure_label),
      xref: xref,
      neighborhoodGraphJson: item.neighborhood_graph_json,
      notAnnotatable: allowNotAnnotatable || !item.subset?.includes('gocheck_do_not_annotate'),
    } as GOlrResponse
  })
}

const makeEntitiesArray = (ids: string[] = [], labels: string[] = []): Entity[] => {
  if (!ids || ids.length === 0) return []

  let result: Entity[] = []

  if (!labels || labels.length === 0) {
    result = ids.map(id => ({ id, label: id }) as Entity)
  } else if (ids.length === labels.length) {
    result = ids.map((id, index) => ({ id, label: labels[index] }) as Entity)
  }

  return result.filter(item => !item.id.startsWith('BFO'))
}

function getTermURL(id: string): string {
  return getEntityUrl(id) ?? ''
}
