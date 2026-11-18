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
  toggleAnnotationSelected,
  setSelectedAnnotations,
  clearSelectedAnnotations,
  selectSelectedAnnotations,
  selectSelectedAnnotationIds,
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

describe('annotationsSlice — rows selected for delete (#96)', () => {
  const setup = () => {
    const store = makeStore()
    store.dispatch(setModel(loadModel(saeModelRaw)))
    const ids = selectSortedAnnotations(store.getState()).map(a => a.uid)
    return { store, ids }
  }

  it('toggles, selects all and clears', () => {
    const { store, ids } = setup()
    store.dispatch(toggleAnnotationSelected(ids[1]))
    store.dispatch(toggleAnnotationSelected(ids[0]))
    expect(selectSelectedAnnotationIds(store.getState())).toEqual([ids[1], ids[0]])
    store.dispatch(toggleAnnotationSelected(ids[1]))
    expect(selectSelectedAnnotationIds(store.getState())).toEqual([ids[0]])

    store.dispatch(setSelectedAnnotations(ids))
    expect(selectSelectedAnnotations(store.getState())).toHaveLength(ids.length)
    store.dispatch(clearSelectedAnnotations())
    expect(selectSelectedAnnotations(store.getState())).toEqual([])
  })

  it('lists the selection in table order', () => {
    const { store, ids } = setup()
    store.dispatch(setSelectedAnnotations([ids[2], ids[0]]))
    expect(selectSelectedAnnotations(store.getState()).map(a => a.uid)).toEqual([ids[0], ids[2]])
  })

  it('drops rows a refresh removed, and everything for another model', () => {
    const { store, ids } = setup()
    store.dispatch(setSelectedAnnotations([ids[0], ids[1]]))

    // A refresh without the first annotation's start fact (deleted, here or elsewhere).
    const refreshed = loadModel(saeModelRaw)
    refreshed.edges = refreshed.edges.filter(edge => edge.uid !== ids[0])
    store.dispatch(setModel(refreshed))
    expect(selectSelectedAnnotationIds(store.getState())).toEqual([ids[1]])

    store.dispatch(setModel(null))
    expect(selectSelectedAnnotationIds(store.getState())).toEqual([])
  })
})
