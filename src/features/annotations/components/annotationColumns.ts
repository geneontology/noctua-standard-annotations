import { AnnotationSortField } from '../services/annotationSort'

export interface AnnotationColumn {
  label: string
  /** Width classes shared by the header and every row. */
  className: string
  sort?: AnnotationSortField
}

/** The standard-annotations table columns (Angular `TABLE_HEADERS`). */
export const ANNOTATION_COLUMNS = {
  gp: {
    label: 'Gene Product',
    className: 'min-w-[100px] max-w-[200px] flex-1',
    sort: AnnotationSortField.GP,
  },
  relation: {
    label: 'Relationship',
    className: 'w-[150px] shrink-0',
    sort: AnnotationSortField.RELATION,
  },
  term: {
    label: 'Term',
    className: 'min-w-[100px] max-w-[300px] flex-1',
    sort: AnnotationSortField.GO_TERM,
  },
  evidence: {
    label: 'Evidence',
    className: 'min-w-[100px] flex-1',
    sort: AnnotationSortField.EVIDENCE_CODE,
  },
  reference: {
    label: 'Reference',
    className: 'w-[110px] shrink-0',
    sort: AnnotationSortField.REFERENCE,
  },
  with: {
    label: 'With',
    className: 'w-[110px] shrink-0',
    sort: AnnotationSortField.WITH,
  },
  extensions: { label: 'Extension', className: 'min-w-[100px] max-w-[300px] flex-1' },
  date: {
    label: 'Date Modified',
    className: 'w-[110px] shrink-0',
    sort: AnnotationSortField.DATE,
  },
  comments: { label: '', className: 'w-[50px] shrink-0' },
  action: { label: '', className: 'w-[40px] shrink-0' },
} satisfies Record<string, AnnotationColumn>
