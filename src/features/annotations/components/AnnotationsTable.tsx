import type React from 'react'
import { useState } from 'react'
import { Checkbox } from '@mantine/core'
import { FaComment, FaSortDown, FaSortUp } from 'react-icons/fa'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { selectAuthUser } from '@/features/auth/slices/authSlice'
import { useGroupGuard } from '@/features/gocam/components/GroupGuardProvider'
import type { StandardAnnotation } from '../models/annotation'
import { nextSort } from '../services/annotationSort'
import type { AnnotationSortField } from '../services/annotationSort'
import {
  clearSelectedAnnotations,
  selectAnnotationSort,
  selectSelectedAnnotations,
  setSelectedAnnotations,
  setSort,
} from '../slices/annotationsSlice'
import { useAnnotationActions } from '../hooks/useAnnotationActions'
import { ANNOTATION_COLUMNS } from './annotationColumns'
import type { AnnotationColumn } from './annotationColumns'
import AnnotationRow from './AnnotationRow'
import SelectionBar from './SelectionBar'
import DeleteAnnotationsDialog from './dialogs/DeleteAnnotationsDialog'

interface AnnotationsTableProps {
  annotations: StandardAnnotation[]
}

/** The model's standard annotations, one row each, with sortable headers. */
const AnnotationsTable: React.FC<AnnotationsTableProps> = ({ annotations }) => {
  const dispatch = useAppDispatch()
  const sort = useAppSelector(selectAnnotationSort)
  const isLoggedIn = !!useAppSelector(selectAuthUser)
  const selected = useAppSelector(selectSelectedAnnotations)
  const actions = useAnnotationActions()
  const checkGroup = useGroupGuard()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const onSort = (field: AnnotationSortField) => dispatch(setSort(nextSort(sort, field)))

  const allSelected = annotations.length > 0 && selected.length === annotations.length
  const toggleAll = () =>
    dispatch(
      allSelected ? clearSelectedAnnotations() : setSelectedAnnotations(annotations.map(a => a.uid))
    )

  const deleteSelected = async () => {
    setConfirmDelete(false)
    await actions.deleteAnnotations(selected)
  }

  const selectHeader = (column: AnnotationColumn) => (
    <div
      key="select"
      role="columnheader"
      className={`flex h-10 items-center justify-center border-r border-gray-300 ${column.className}`}
    >
      <Checkbox
        size="xs"
        aria-label={allSelected ? 'Clear selection' : 'Select all annotations'}
        checked={allSelected}
        indeterminate={selected.length > 0 && !allSelected}
        onChange={toggleAll}
      />
    </div>
  )

  const header = (key: string, column: AnnotationColumn) => {
    if (key === 'select') return isLoggedIn ? selectHeader(column) : null
    const sortable = !!column.sort
    const active = sortable && sort.field === column.sort
    const content = (
      <>
        {column.label}
        {active && (sort.ascending ? <FaSortDown /> : <FaSortUp />)}
        {key === 'comments' && <FaComment aria-label="Comments" />}
      </>
    )
    return (
      <div
        key={key}
        role="columnheader"
        aria-sort={active ? (sort.ascending ? 'ascending' : 'descending') : undefined}
        className={`flex h-10 items-center gap-1 border-r border-gray-300 px-1.5 text-xs font-bold uppercase text-primary-400 ${column.className}`}
      >
        {sortable ? (
          <button
            type="button"
            className="flex items-center gap-1 uppercase hover:text-primary-700"
            onClick={() => onSort(column.sort!)}
          >
            {content}
          </button>
        ) : (
          content
        )}
      </div>
    )
  }

  return (
    <div className="w-full px-4 pb-24" data-testid="annotations-table">
      <div className="flex w-full items-center px-2 py-3">
        <span className="text-2xl text-gray-900">
          Standard Annotations{' '}
          <small className="text-base text-gray-600">( {annotations.length} )</small>
        </span>
        {isLoggedIn && selected.length > 0 && (
          <SelectionBar
            count={selected.length}
            onDelete={() => checkGroup(() => setConfirmDelete(true))}
            onClear={() => dispatch(clearSelectedAnnotations())}
          />
        )}
      </div>

      {annotations.length > 0 ? (
        <div role="table" aria-label="Standard annotations" className="w-full overflow-x-auto">
          <div
            role="row"
            className="flex w-full items-stretch border-y border-accent-700 bg-white"
          >
            {Object.entries(ANNOTATION_COLUMNS).map(([key, column]) => header(key, column))}
          </div>
          <div role="rowgroup" className="w-full">
            {annotations.map(annotation => (
              <AnnotationRow key={annotation.uid} annotation={annotation} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-md bg-white text-sm text-gray-500">
          No annotations available to display
        </div>
      )}

      <DeleteAnnotationsDialog
        open={confirmDelete}
        annotations={selected}
        busy={actions.isSaving}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteSelected}
      />
    </div>
  )
}

export default AnnotationsTable
