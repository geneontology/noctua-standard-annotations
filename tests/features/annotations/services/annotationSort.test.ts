import { describe, it, expect } from 'vitest'
import { extractAnnotations } from '@/features/annotations/services/annotationExtraction'
import {
  AnnotationSortField,
  DEFAULT_SORT,
  nextSort,
  sortAnnotations,
} from '@/features/annotations/services/annotationSort'
import { loadModel, saeModelRaw } from '@tests/fixtures/models'

const annotations = extractAnnotations(loadModel(saeModelRaw))
const gps = (field: AnnotationSortField | null, ascending = true) =>
  sortAnnotations(annotations, { field, ascending }).map(a => a.gp.label)

describe('sortAnnotations', () => {
  it('sorts by gene product by default', () => {
    expect(gps(AnnotationSortField.GP).slice(0, 3)).toEqual([
      'ALPHA1 Hsap',
      'BETA2 Hsap',
      'DELTA4 Hsap',
    ])
  })

  it('treats a cleared (null) field as gene product ascending', () => {
    expect(gps(null, false)).toEqual(gps(AnnotationSortField.GP))
  })

  it('reverses for descending', () => {
    expect(gps(AnnotationSortField.GP, false)).toEqual([...gps(AnnotationSortField.GP)].reverse())
  })

  it('sorts by date, oldest first', () => {
    const dates = sortAnnotations(annotations, {
      field: AnnotationSortField.DATE,
      ascending: true,
    }).map(a => a.date)
    expect(dates).toEqual([...dates].sort())
    expect(dates.at(-1)).toBe('2024-05-02')
  })

  it('sorts by the displayed relation', () => {
    const relations = sortAnnotations(annotations, {
      field: AnnotationSortField.RELATION,
      ascending: true,
    }).map(a => a.relation.label)
    expect(relations[0]).toBe('acts upstream of or within')
  })

  it('does not mutate its input', () => {
    const before = annotations.map(a => a.uid)
    sortAnnotations(annotations, { field: AnnotationSortField.DATE, ascending: false })
    expect(annotations.map(a => a.uid)).toEqual(before)
  })
})

describe('nextSort', () => {
  it('cycles ascending → descending → default', () => {
    const field = AnnotationSortField.REFERENCE
    const first = nextSort(DEFAULT_SORT, field)
    expect(first).toEqual({ field, ascending: true })
    const second = nextSort(first, field)
    expect(second).toEqual({ field, ascending: false })
    expect(nextSort(second, field)).toEqual(DEFAULT_SORT)
  })
})
