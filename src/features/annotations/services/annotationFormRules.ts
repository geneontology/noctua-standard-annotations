import type { Entity } from '@/features/gocam/models/cam'
import { RootTypes } from '@/features/gocam/models/cam'
import { Relations } from '@/@noctua.core/models/relations'
import type { GOlrResponse } from '@/features/search/models/search'
import type {
  AnnotationFormState,
  ExtensionRow,
  FormError,
} from '../models/annotationForm'
import type { CreateAnnotationInput } from './annotationOperations'
import { getObjectRange, getTermRelations } from './shapeRules'
import { isValidReferenceList, validateWithFrom } from './databaseIdentifiers'

const rootTypeIds = (term: GOlrResponse | null): string[] =>
  term?.rootTypes?.map(rootType => rootType.id) ?? []

/** GP → term relations allowed for the chosen gene product and GO term. */
export const getRelationChoices = (form: AnnotationFormState): Entity[] =>
  getTermRelations(rootTypeIds(form.gp), rootTypeIds(form.goTerm), true)

/**
 * Where the GO term may come from: the gene product → term rules for the chosen
 * gene product (and relation). Empty until a gene product is chosen, as in Angular.
 */
export const getGoTermRange = (form: AnnotationFormState): string[] =>
  getObjectRange(rootTypeIds(form.gp), form.relation?.id, true)

/** Extension relations allowed from the GO term (to the row's term, once chosen). */
export const getExtensionRelationChoices = (
  form: AnnotationFormState,
  row: ExtensionRow
): Entity[] => getTermRelations(rootTypeIds(form.goTerm), rootTypeIds(row.term))

/** Where an extension term may come from, given the GO term and the row's relation. */
export const getExtensionTermRange = (form: AnnotationFormState, row: ExtensionRow): string[] =>
  getObjectRange(rootTypeIds(form.goTerm), row.relation?.id)

/**
 * Keep the relation valid for the chosen pair (Angular `_checkAndSetGpToTermEdge`):
 * once both terms are set, an absent or disallowed relation becomes the first
 * allowed one — "part of" when the GO term is a protein-containing complex.
 */
export const applyFormRules = (form: AnnotationFormState): AnnotationFormState => {
  if (!form.gp?.id || !form.goTerm?.id) return form

  const choices = getRelationChoices(form)
  if (choices.length === 0 || choices.some(choice => choice.id === form.relation?.id)) {
    return form
  }

  const isComplex = rootTypeIds(form.goTerm).includes(RootTypes.PROTEIN_CONTAINING_COMPLEX)
  const partOf = isComplex ? choices.find(choice => choice.id === Relations.PART_OF) : undefined

  return { ...form, relation: partOf ?? choices[0] }
}

/** Why Save is disabled (Angular `getActivityFormErrors`). */
export const validateAnnotationForm = (form: AnnotationFormState): FormError[] => {
  const errors: FormError[] = []

  if (!form.gp?.id) errors.push({ message: 'GP is required' })
  if (!form.goTerm?.id) errors.push({ message: 'GO Term is required' })
  if (form.gp?.id && form.goTerm?.id && !form.relation?.id) {
    errors.push({ message: 'GP to Term Relation is required' })
  }

  form.evidences.forEach((evidence, index) => {
    const position = index + 1
    if (!evidence.evidenceCode?.id) {
      errors.push({ message: `Evidence is required @ ${position}` })
    }
    if (!evidence.reference.trim()) {
      errors.push({ message: `Reference is required @ ${position}` })
    } else if (!isValidReferenceList(evidence.reference)) {
      errors.push({ message: `Use DB:accession format for reference @ ${position}` })
    }
    if (evidence.withFrom.trim()) {
      const withError = validateWithFrom(evidence.withFrom)
      if (withError) errors.push({ message: `With/From @ ${position} - ${withError}` })
    }
  })

  form.extensions.forEach((extension, index) => {
    if (!!extension.relation?.id !== !!extension.term?.id) {
      errors.push({
        message: `Both Extension relation and Extension Term must be filled (${index + 1})`,
      })
    }
  })

  return errors
}

/** One create input per evidence row (Angular `AnnotationActivity.createSave`). */
export const toCreateAnnotationInputs = (form: AnnotationFormState): CreateAnnotationInput[] => {
  const comments = Array.from(new Set(form.comments.map(c => c.text.trim()).filter(Boolean)))
  const extensions = form.extensions
    .filter(ext => ext.relation?.id && ext.term?.id)
    .map(ext => ({ relationId: ext.relation!.id, termId: ext.term!.id }))

  return form.evidences.map(evidence => ({
    gpId: form.gp?.id ?? '',
    goTermId: form.goTerm?.id ?? '',
    isComplement: form.isComplement,
    relationId: form.relation?.id ?? '',
    evidence: {
      evidenceCodeId: evidence.evidenceCode?.id ?? '',
      sources: [evidence.reference],
      withFrom: evidence.withFrom,
    },
    extensions,
    comments,
  }))
}

/** The title a new model gets from its first annotation. */
export const defaultModelTitle = (form: AnnotationFormState): string =>
  form.gp?.label ? `enabled by ${form.gp.label}` : ''
