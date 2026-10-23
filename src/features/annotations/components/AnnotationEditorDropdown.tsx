import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActionIcon, Textarea } from '@mantine/core'
import { FaRegCircleCheck, FaRegCircleXmark } from 'react-icons/fa6'
import AnchoredPopover from '@/@noctua.core/components/popover/AnchoredPopover'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { showToast } from '@/@noctua.core/components/toast/toastSlice'
import type { Entity } from '@/features/gocam/models/cam'
import { makeSelectModelTerms, selectModelEvidence } from '@/features/gocam/slices/camSlice'
import TermAutocomplete from '@/features/search/components/Autocomplete'
import { AutocompleteType } from '@/features/search/models/search'
import type { GOlrResponse, TermSearchFilter } from '@/features/search/models/search'
import type { StandardAnnotation } from '../models/annotation'
import { termOption } from '../models/annotationForm'
import { EVIDENCE_FILTER, GENE_PRODUCT_FILTER } from '../data/termFilters'
import { getObjectRange, getTermRelations, isShapeTerm } from '../services/shapeRules'
import { getAnnotationEvidence } from '../services/annotationOperations'
import {
  correctWithFromCase,
  isValidReferenceList,
  validateWithFrom,
} from '../services/databaseIdentifiers'
import { useAnnotationActions } from '../hooks/useAnnotationActions'
import DatabaseField from './fields/DatabaseField'
import RelationSelect from './fields/RelationSelect'

/** What a table cell's edit button edits (Angular `EditorCategory`). */
export enum EditorCategory {
  GP = 'GP',
  RELATION = 'gpToTermEdge',
  TERM = 'TERM',
  EVIDENCE_CODE = 'evidenceCode',
  REFERENCE = 'reference',
  WITH = 'withFrom',
  ADD_EXTENSION = 'add_extension',
  ADD_COMMENT = 'add_comment',
}

const TERM_LABELS: Partial<Record<EditorCategory, string>> = {
  [EditorCategory.GP]: 'Gene Product',
  [EditorCategory.TERM]: 'GO Term',
  [EditorCategory.EVIDENCE_CODE]: 'Evidence',
  [EditorCategory.ADD_EXTENSION]: 'New Extension Term',
}

interface AnnotationEditorDropdownProps {
  anchorEl: HTMLElement | null
  category: EditorCategory
  annotation: StandardAnnotation
  onClose: () => void
}

const rootTypeIds = (term: GOlrResponse | null) => term?.rootTypes?.map(r => r.id) ?? []

const NO_RANGE: string[] = []

/**
 * Inline single-field editor for a table row (Angular standard dropdown). Each
 * category saves straight to the model: gene product, GO term, relation,
 * evidence code, reference and with/from, or a new extension or comment.
 */
const AnnotationEditorDropdown: React.FC<AnnotationEditorDropdownProps> = ({
  anchorEl,
  category,
  annotation,
  onClose,
}) => {
  const open = Boolean(anchorEl)
  const dispatch = useAppDispatch()
  const actions = useAnnotationActions()

  const [term, setTerm] = useState<GOlrResponse | null>(null)
  const [relation, setRelation] = useState<Entity | null>(null)
  const [text, setText] = useState('')

  useEffect(() => {
    if (!open) return
    setTerm(null)
    setRelation(null)
    setText('')
    switch (category) {
      case EditorCategory.GP:
        setTerm(termOption(annotation.gp.id, annotation.gp.label))
        break
      case EditorCategory.TERM:
        setTerm(termOption(annotation.goTerm.id, annotation.goTerm.label))
        break
      case EditorCategory.EVIDENCE_CODE:
        if (annotation.evidence) {
          const { id, label } = annotation.evidence.evidenceCode
          setTerm(termOption(id, label))
        }
        break
      case EditorCategory.REFERENCE:
        setText(annotation.evidence?.reference ?? '')
        break
      case EditorCategory.WITH:
        setText(correctWithFromCase(annotation.evidence?.with ?? ''))
        break
      case EditorCategory.RELATION:
        setRelation(annotation.relation.id ? annotation.relation : null)
        break
    }
  }, [open, category, annotation])

  // The GO term keeps to the range of its relation (e.g. "located in" → CC), as in
  // the create form; the term's own root types are the fallback.
  const goTermFilter = useMemo<TermSearchFilter>(() => {
    const range = getObjectRange(annotation.gp.rootTypes, annotation.relation.id, true)
    return {
      closureIds: range.length > 0 ? range : annotation.goTerm.rootTypes.filter(isShapeTerm),
    }
  }, [annotation])

  const extensionRelations = useMemo(
    () => getTermRelations(annotation.goTerm.rootTypes, rootTypeIds(term)),
    [annotation.goTerm.rootTypes, term]
  )
  const extensionFilter = useMemo<TermSearchFilter>(
    () => ({ closureIds: getObjectRange(annotation.goTerm.rootTypes, relation?.id) }),
    [annotation.goTerm.rootTypes, relation?.id]
  )

  const termFilter: TermSearchFilter | null =
    category === EditorCategory.GP
      ? GENE_PRODUCT_FILTER
      : category === EditorCategory.TERM
        ? goTermFilter
        : category === EditorCategory.EVIDENCE_CODE
          ? EVIDENCE_FILTER
          : category === EditorCategory.ADD_EXTENSION
            ? extensionFilter
            : null

  // A stable array: the memoized selector re-runs (and re-renders) on a new one.
  const termClosureIds = termFilter?.closureIds ?? NO_RANGE
  const selectTerms = useMemo(makeSelectModelTerms, [])
  const termInitialOptions = useAppSelector(state =>
    selectTerms(state, termClosureIds, termFilter?.excludeIdspaces)
  )
  const evidenceInitialOptions = useAppSelector(selectModelEvidence)

  const warn = useCallback(
    (message: string) => dispatch(showToast({ message, severity: 'warning' })),
    [dispatch]
  )

  const handleSave = useCallback(async () => {
    let saved = false

    switch (category) {
      case EditorCategory.GP:
      case EditorCategory.TERM: {
        if (!term?.id) return warn('Please select term from autocomplete.')
        const node = category === EditorCategory.GP ? annotation.gp : annotation.goTerm
        if (term.id === node.id) return onClose()
        saved = await actions.editNodeType(node, term.id, TERM_LABELS[category]!)
        break
      }
      case EditorCategory.EVIDENCE_CODE:
        if (!term?.id) return warn('Please select term from autocomplete.')
        // Unchanged only if every evidence already has it — picking the shown code
        // still unifies an annotation whose facts disagree (as Angular applied it).
        if (getAnnotationEvidence(annotation).every(ev => ev.evidenceCode.id === term.id)) {
          return onClose()
        }
        saved = await actions.editEvidenceCode(annotation, term.id)
        break
      case EditorCategory.REFERENCE: {
        const reference = text.trim()
        if (!isValidReferenceList(reference)) {
          return warn('Use DB:accession format for reference.')
        }
        if (getAnnotationEvidence(annotation).every(ev => ev.reference === reference)) {
          return onClose()
        }
        saved = await actions.editReference(annotation, reference)
        break
      }
      case EditorCategory.WITH: {
        const withFrom = text.trim()
        const error = withFrom ? validateWithFrom(withFrom) : null
        if (error) return warn(error)
        saved = await actions.editWith(annotation, withFrom)
        break
      }
      case EditorCategory.RELATION:
        if (!relation?.id || relation.id === annotation.relation.id) return onClose()
        saved = await actions.editRelation(annotation, relation.id)
        break
      case EditorCategory.ADD_EXTENSION:
        if (!relation?.id || !term?.id) {
          return warn('Please select both an extension relation and an extension term.')
        }
        saved = await actions.addExtension(annotation, relation.id, term.id)
        break
      case EditorCategory.ADD_COMMENT:
        if (!text.trim()) return warn('Please enter a comment.')
        saved = await actions.addComment(annotation, text.trim())
        break
    }

    if (saved) onClose()
  }, [category, term, relation, text, annotation, actions, warn, onClose])

  const showRelation =
    category === EditorCategory.RELATION || category === EditorCategory.ADD_EXTENSION

  return (
    <AnchoredPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      placement="bottom-end"
      className="!min-w-[420px]"
    >
      <div
        className="flex w-full flex-row items-end justify-start gap-1 p-2"
        data-testid="annotation-editor"
      >
        {showRelation && (
          <div className="w-[250px] p-1">
            <RelationSelect
              label={
                category === EditorCategory.RELATION
                  ? 'GP To Term Relation'
                  : 'New Extension Relation'
              }
              value={relation}
              choices={
                category === EditorCategory.RELATION
                  ? annotation.relationChoices
                  : extensionRelations
              }
              onChange={setRelation}
              clearable={category === EditorCategory.ADD_EXTENSION}
              name="relation"
            />
          </div>
        )}

        {termFilter && (
          <div className="w-[250px] p-1">
            <TermAutocomplete
              label={TERM_LABELS[category] ?? 'Term'}
              name="editor-term"
              autocompleteType={
                category === EditorCategory.EVIDENCE_CODE
                  ? AutocompleteType.EVIDENCE_CODE
                  : AutocompleteType.TERM
              }
              rootTypeIds={termFilter.closureIds}
              excludeRootTypeIds={termFilter.excludeClosureIds}
              excludeIdspaces={termFilter.excludeIdspaces}
              value={term}
              onChange={value => setTerm(value && typeof value === 'object' ? value : null)}
              initialOptions={
                category === EditorCategory.EVIDENCE_CODE
                  ? evidenceInitialOptions
                  : termInitialOptions
              }
            />
          </div>
        )}

        {category === EditorCategory.REFERENCE && (
          <div className="w-[250px] p-1">
            <DatabaseField type="reference" value={text} onChange={setText} />
          </div>
        )}
        {category === EditorCategory.WITH && (
          <div className="w-[250px] p-1">
            <DatabaseField type="with" value={text} onChange={setText} />
          </div>
        )}
        {category === EditorCategory.ADD_COMMENT && (
          <div className="w-[320px] p-1">
            <Textarea
              label="Comment"
              value={text}
              onChange={e => setText(e.target.value)}
              autosize
              minRows={2}
              maxRows={6}
              autoFocus
            />
          </div>
        )}

        <div className="flex shrink-0 items-center gap-1 pb-1">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            onClick={onClose}
            title="Cancel"
            aria-label="Cancel"
            className="!text-red-400"
          >
            <FaRegCircleXmark size={18} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            onClick={handleSave}
            title="Save"
            aria-label="Save"
            loading={actions.isSaving}
            className="!text-green-600"
          >
            <FaRegCircleCheck size={18} />
          </ActionIcon>
        </div>
      </div>
    </AnchoredPopover>
  )
}

export default AnnotationEditorDropdown
