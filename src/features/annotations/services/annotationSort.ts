import type { StandardAnnotation } from '../models/annotation'

export enum AnnotationSortField {
  GP = 'gp',
  GO_TERM = 'goterm',
  RELATION = 'gpToTermEdge',
  EVIDENCE_CODE = 'evidenceCode',
  REFERENCE = 'reference',
  WITH = 'with',
  DATE = 'date',
}

export interface AnnotationSort {
  /** null = no column chosen (an Angular-era stored value): gene product, ascending. */
  field: AnnotationSortField | null
  ascending: boolean
}

export const DEFAULT_SORT: AnnotationSort = { field: AnnotationSortField.GP, ascending: true }

const sortKey = (annotation: StandardAnnotation, field: AnnotationSortField | null): string => {
  switch (field) {
    case AnnotationSortField.GO_TERM:
      return annotation.goTerm.label ?? ''
    case AnnotationSortField.RELATION:
      return annotation.relation.label ?? ''
    case AnnotationSortField.EVIDENCE_CODE:
      return annotation.evidence?.evidenceCode.label ?? ''
    case AnnotationSortField.REFERENCE:
      return annotation.evidence?.reference ?? ''
    case AnnotationSortField.WITH:
      return annotation.evidence?.with ?? ''
    case AnnotationSortField.DATE:
      return annotation.date ?? ''
    case AnnotationSortField.GP:
    default:
      return annotation.gp.label ?? ''
  }
}

/**
 * Sort annotations (Angular `AnnotationActivity.sortBy`); ties fall back to the
 * annotation id so the order is stable.
 */
export const sortAnnotations = (
  annotations: StandardAnnotation[],
  sort: AnnotationSort
): StandardAnnotation[] =>
  [...annotations].sort((a, b) => {
    let comparison = sortKey(a, sort.field).localeCompare(sortKey(b, sort.field))
    if (comparison === 0) comparison = a.uid.localeCompare(b.uid)
    return sort.field === null || sort.ascending ? comparison : -comparison
  })

/** Header click: ascending → descending → back to the default order. */
export const nextSort = (current: AnnotationSort, field: AnnotationSortField): AnnotationSort => {
  if (current.field !== field) return { field, ascending: true }
  if (current.ascending) return { field, ascending: false }
  return DEFAULT_SORT
}
