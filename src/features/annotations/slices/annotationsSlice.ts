import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice, createSelector } from '@reduxjs/toolkit'
import { selectCamModel } from '@/features/gocam/slices/camSlice'
import { extractAnnotations } from '../services/annotationExtraction'
import type { AnnotationSort } from '../services/annotationSort'
import { AnnotationSortField, DEFAULT_SORT, sortAnnotations } from '../services/annotationSort'

/** Kept under the Angular key so a curator's chosen order survives the upgrade. */
export const SORT_STORAGE_KEY = 'annotationActivitySortBy'

const SORT_FIELDS = new Set<string>(Object.values(AnnotationSortField))

export const loadStoredSort = (): AnnotationSort => {
  try {
    const raw = JSON.parse(localStorage.getItem(SORT_STORAGE_KEY) ?? 'null')
    if (raw && typeof raw === 'object') {
      const field = SORT_FIELDS.has(raw.field) ? (raw.field as AnnotationSortField) : null
      return { field, ascending: raw.ascending !== false }
    }
  } catch {
    // Unreadable or blocked storage — use the default order.
  }
  return DEFAULT_SORT
}

const storeSort = (sort: AnnotationSort) => {
  try {
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort))
  } catch {
    // Storage blocked: the order still applies for this session.
  }
}

interface AnnotationsState {
  sort: AnnotationSort
  /** The annotation highlighted in the table and the comments panel. */
  selectedCommentAnnotationId: string | null
}

const initialState: AnnotationsState = {
  sort: loadStoredSort(),
  selectedCommentAnnotationId: null,
}

export const annotationsSlice = createSlice({
  name: 'annotations',
  initialState,
  reducers: {
    setSort: (state, action: PayloadAction<AnnotationSort>) => {
      state.sort = action.payload
      storeSort(action.payload)
    },
    selectCommentAnnotation: (state, action: PayloadAction<string | null>) => {
      state.selectedCommentAnnotationId = action.payload
    },
  },
})

export const { setSort, selectCommentAnnotation } = annotationsSlice.actions

type State = { annotations: AnnotationsState }

export const selectAnnotationSort = (state: State) => state.annotations.sort
export const selectSelectedCommentAnnotationId = (state: State) =>
  state.annotations.selectedCommentAnnotationId

/** The model's standard annotations, in model order. */
export const selectAnnotations = createSelector([selectCamModel], model =>
  extractAnnotations(model)
)

/** The annotations in the table's current sort order. */
export const selectSortedAnnotations = createSelector(
  [selectAnnotations, (state: State) => state.annotations.sort],
  (annotations, sort) => sortAnnotations(annotations, sort)
)

export default annotationsSlice.reducer
