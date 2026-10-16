import { describe, it, expect, beforeEach } from 'vitest'
import { makeStore } from '@/app/store/store'
import {
  SORT_STORAGE_KEY,
  loadStoredSort,
  selectAnnotations,
  selectCommentAnnotation,
  selectSelectedCommentAnnotationId,
  selectSortedAnnotations,
  setSort,
} from '@/features/annotations/slices/annotationsSlice'
import { AnnotationSortField } from '@/features/annotations/services/annotationSort'
import { setModel } from '@/features/gocam/slices/camSlice'
import { loadModel, saeModelRaw } from '@tests/fixtures/models'

describe('annotationsSlice', () => {
  beforeEach(() => localStorage.clear())

  it('reads annotations from the model in the cam slice', () => {
    const store = makeStore()
    expect(selectAnnotations(store.getState())).toEqual([])
    store.dispatch(setModel(loadModel(saeModelRaw)))
    expect(selectAnnotations(store.getState())).toHaveLength(9)
  })

  it('sorts and remembers the order under the Angular storage key', () => {
    const store = makeStore()
    store.dispatch(setModel(loadModel(saeModelRaw)))
    store.dispatch(setSort({ field: AnnotationSortField.GP, ascending: false }))

    expect(selectSortedAnnotations(store.getState())[0].gp.label).toBe('ZETA6 Hsap')
    expect(JSON.parse(localStorage.getItem(SORT_STORAGE_KEY)!)).toEqual({
      field: 'gp',
      ascending: false,
    })
  })

  it('accepts an Angular-era stored sort, including a cleared field', () => {
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ field: null, label: '', ascending: false }))
    expect(loadStoredSort()).toEqual({ field: null, ascending: false })
    localStorage.setItem(SORT_STORAGE_KEY, '{not json')
    expect(loadStoredSort().field).toBe(AnnotationSortField.GP)
  })

  it('tracks the annotation picked for the comments panel', () => {
    const store = makeStore()
    store.dispatch(selectCommentAnnotation('a|b|c'))
    expect(selectSelectedCommentAnnotationId(store.getState())).toBe('a|b|c')
  })
})
