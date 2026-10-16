import { v4 as uuidv4 } from 'uuid'
import type { Entity } from '@/features/gocam/models/cam'
import type { GOlrResponse } from '@/features/search/models/search'

export interface EvidenceRow {
  uid: string
  evidenceCode: GOlrResponse | null
  reference: string
  withFrom: string
}

export interface ExtensionRow {
  uid: string
  relation: Entity | null
  term: GOlrResponse | null
}

export interface CommentRow {
  uid: string
  text: string
}

/** The create form (Angular `StandardAnnotationForm`). */
export interface AnnotationFormState {
  gp: GOlrResponse | null
  /** NOT qualifier on the GO term. */
  isComplement: boolean
  /** The displayed GP → term relation ("enables", "involved in", …). */
  relation: Entity | null
  goTerm: GOlrResponse | null
  /** One annotation is created per evidence row. */
  evidences: EvidenceRow[]
  extensions: ExtensionRow[]
  comments: CommentRow[]
}

export interface FormError {
  message: string
}

export const createEvidenceRow = (): EvidenceRow => ({
  uid: uuidv4(),
  evidenceCode: null,
  reference: '',
  withFrom: '',
})

export const createExtensionRow = (): ExtensionRow => ({
  uid: uuidv4(),
  relation: null,
  term: null,
})

export const createCommentRow = (text = ''): CommentRow => ({ uid: uuidv4(), text })

export const createInitialForm = (): AnnotationFormState => ({
  gp: null,
  isComplement: false,
  relation: null,
  goTerm: null,
  evidences: [createEvidenceRow()],
  extensions: [],
  comments: [],
})

/** A GOlr-shaped option for a fixed term (root terms, auto-populated evidence). */
export const termOption = (id: string, label: string, rootTypes: Entity[] = []): GOlrResponse => ({
  id,
  label,
  link: '',
  description: '',
  isObsolete: false,
  replacedBy: '',
  rootTypes,
  xref: '',
  notAnnotatable: true,
  neighborhoodGraphJson: '',
})
