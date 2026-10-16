import type React from 'react'
import { useCallback, useMemo, useState } from 'react'
import { ActionIcon, Button, Checkbox, Menu, Textarea } from '@mantine/core'
import { FaEllipsisV, FaRegTrashAlt } from 'react-icons/fa'
import { useAppSelector } from '@/app/hooks'
import SectionHeading from '@/@noctua.core/components/form/SectionHeading'
import { selectAuthUser } from '@/features/auth/slices/authSlice'
import { makeSelectModelTerms, selectModelEvidence } from '@/features/gocam/slices/camSlice'
import TermAutocomplete from '@/features/search/components/Autocomplete'
import { AutocompleteType } from '@/features/search/models/search'
import type { GOlrResponse } from '@/features/search/models/search'
import type { RootState } from '@/app/store/store'
import { EVIDENCE_AUTO_POPULATE, ROOT_NODES } from '../data/annotationConfig'
import type { RootNodeKey } from '../data/annotationConfig'
import { EVIDENCE_FILTER, GENE_PRODUCT_FILTER } from '../data/termFilters'
import type { AnnotationFormState, EvidenceRow, ExtensionRow } from '../models/annotationForm'
import {
  createCommentRow,
  createEvidenceRow,
  createExtensionRow,
  createInitialForm,
  termOption,
} from '../models/annotationForm'
import {
  applyFormRules,
  getExtensionRelationChoices,
  getExtensionTermRange,
  getGoTermRange,
  getRelationChoices,
  validateAnnotationForm,
} from '../services/annotationFormRules'
import { useAnnotationActions } from '../hooks/useAnnotationActions'
import DatabaseField from './fields/DatabaseField'
import RelationSelect from './fields/RelationSelect'
import FormErrorsDialog from './dialogs/FormErrorsDialog'

const asTerm = (value: GOlrResponse | string | null): GOlrResponse | null =>
  value && typeof value === 'object' ? value : null

/** Terms already in the model for a range — the autocomplete's prelookup. */
const useModelTermOptions = (closureIds: string[], excludeIdspaces?: string[]) => {
  const selectTerms = useMemo(makeSelectModelTerms, [])
  return useAppSelector((state: RootState) => selectTerms(state, closureIds, excludeIdspaces))
}

const ExtensionRowFields: React.FC<{
  form: AnnotationFormState
  row: ExtensionRow
  index: number
  onChange: (patch: Partial<ExtensionRow>) => void
  onDelete: () => void
}> = ({ form, row, index, onChange, onDelete }) => {
  const relationChoices = getExtensionRelationChoices(form, row)
  const termRange = getExtensionTermRange(form, row)
  const initialOptions = useModelTermOptions(termRange)

  return (
    <div className="flex w-full items-end gap-2 px-3 pt-2" data-testid="extension-row">
      <div className="w-[35%] shrink-0">
        <RelationSelect
          label="Extension Relation"
          value={row.relation}
          choices={relationChoices}
          onChange={relation => onChange({ relation })}
          clearable
          name={`extension-relation-${index}`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <TermAutocomplete
          label="Extension Term"
          name={`extension-term-${index}`}
          rootTypeIds={termRange}
          value={row.term}
          onChange={value => onChange({ term: asTerm(value) })}
          initialOptions={initialOptions}
        />
      </div>
      <ActionIcon
        variant="subtle"
        color="red"
        className="mb-2"
        aria-label="Delete extension"
        onClick={onDelete}
      >
        <FaRegTrashAlt size={14} />
      </ActionIcon>
    </div>
  )
}

/**
 * Create standard annotations (Angular `AnnotationFormComponent`): gene product,
 * NOT, relation, GO term, evidence, extensions and comments. One annotation is
 * created per evidence row; the relation and term ranges follow the GO-CAM shape
 * rules as fields are filled in.
 */
const AnnotationForm: React.FC = () => {
  const isLoggedIn = !!useAppSelector(selectAuthUser)
  const actions = useAnnotationActions()
  const [form, setFormState] = useState<AnnotationFormState>(createInitialForm)
  // Remounts the fields on Clear, so text typed but never picked goes too.
  const [resetKey, setResetKey] = useState(0)
  // Like Angular, errors are explained only once the curator has started.
  const [touched, setTouched] = useState(false)
  const [errorsOpen, setErrorsOpen] = useState(false)

  /** Every change goes through the form rules, like the Angular valueChanges hook. */
  const setForm = useCallback((update: (current: AnnotationFormState) => AnnotationFormState) => {
    setTouched(true)
    setFormState(current => applyFormRules(update(current)))
  }, [])

  const relationChoices = useMemo(() => getRelationChoices(form), [form])
  const goTermRange = useMemo(() => getGoTermRange(form), [form])
  const errors = useMemo(() => validateAnnotationForm(form), [form])

  const gpOptions = useModelTermOptions(
    GENE_PRODUCT_FILTER.closureIds,
    GENE_PRODUCT_FILTER.excludeIdspaces
  )
  const goTermOptions = useModelTermOptions(goTermRange)
  const evidenceOptions = useAppSelector(selectModelEvidence)

  const patchEvidence = (uid: string, patch: Partial<EvidenceRow>) =>
    setForm(f => ({
      ...f,
      evidences: f.evidences.map(row => (row.uid === uid ? { ...row, ...patch } : row)),
    }))

  const fillEvidence = (uid: string, variant: keyof typeof EVIDENCE_AUTO_POPULATE) => {
    const { evidence, reference } = EVIDENCE_AUTO_POPULATE[variant]
    patchEvidence(uid, { evidenceCode: termOption(evidence.id, evidence.label), reference })
  }

  /** "Add MF/BP/CC Root": the root term with ND evidence (Angular `_addRootTerm`). */
  const addRootTerm = (key: RootNodeKey) => {
    const root = ROOT_NODES[key]
    const { evidence, reference } = EVIDENCE_AUTO_POPULATE.nd
    setForm(f => {
      const evidences = f.evidences.length > 0 ? f.evidences : [createEvidenceRow()]
      return {
        ...f,
        goTerm: termOption(root.id, root.label, [{ id: root.id, label: root.label }]),
        evidences: evidences.map((row, i) =>
          i === 0
            ? { ...row, evidenceCode: termOption(evidence.id, evidence.label), reference }
            : row
        ),
      }
    })
  }

  const patchExtension = (uid: string, patch: Partial<ExtensionRow>) =>
    setForm(f => ({
      ...f,
      extensions: f.extensions.map(row => (row.uid === uid ? { ...row, ...patch } : row)),
    }))

  const clearForm = () => {
    setFormState(createInitialForm())
    setResetKey(key => key + 1)
    setTouched(false)
  }

  const save = async () => {
    if (errors.length > 0) return
    const saved = await actions.createAnnotations(form)
    if (saved) clearForm()
  }

  return (
    <div className="flex w-full justify-center bg-gradient-to-r from-primary-50 to-accent-50 px-2 py-6">
      <form
        key={resetKey}
        name="annotationForm"
        aria-label="Create annotation"
        className="relative w-full max-w-[900px] rounded-md bg-white shadow-md"
        onSubmit={e => {
          e.preventDefault()
          void save()
        }}
      >
        {!isLoggedIn && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/70 text-lg font-medium text-gray-700">
            Log in to Continue
          </div>
        )}

        <div className="flex items-end gap-2 px-3 pt-3">
          <div className="w-[35%] shrink-0">
            <TermAutocomplete
              label="Gene Product"
              name="gp"
              rootTypeIds={GENE_PRODUCT_FILTER.closureIds}
              excludeIdspaces={GENE_PRODUCT_FILTER.excludeIdspaces}
              value={form.gp}
              onChange={value => setForm(f => ({ ...f, gp: asTerm(value) }))}
              initialOptions={gpOptions}
            />
          </div>
          <div className="flex w-[30%] shrink-0 flex-col gap-1">
            <Checkbox
              label="NOT"
              size="xs"
              checked={form.isComplement}
              onChange={e => {
                const checked = e.currentTarget.checked
                setForm(f => ({ ...f, isComplement: checked }))
              }}
              data-pw="form-input-isComplement"
            />
            <RelationSelect
              label="GP to Term Relation"
              value={form.relation}
              choices={relationChoices}
              onChange={relation => setForm(f => ({ ...f, relation }))}
              clearable
              name="gpterm-relation"
            />
          </div>
          <div className="min-w-0 flex-1">
            <TermAutocomplete
              label="GO Term"
              name="goterm"
              rootTypeIds={goTermRange}
              value={form.goTerm}
              onChange={value => setForm(f => ({ ...f, goTerm: asTerm(value) }))}
              initialOptions={goTermOptions}
            />
          </div>
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" className="mb-2" aria-label="Term options">
                <FaEllipsisV size={12} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => addRootTerm('mf')}>Add MF Root</Menu.Item>
              <Menu.Item onClick={() => addRootTerm('bp')}>Add BP Root</Menu.Item>
              <Menu.Item onClick={() => addRootTerm('cc')}>Add CC Root</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>

        <SectionHeading className="mt-4">Evidence</SectionHeading>
        {form.evidences.map((row, index) => (
          <div
            key={row.uid}
            className="flex w-full items-end gap-2 px-3 pt-2"
            data-testid="evidence-row"
          >
            <div className="w-[35%] shrink-0">
              <TermAutocomplete
                label="Evidence"
                name={`evidenceCode-${index}`}
                autocompleteType={AutocompleteType.EVIDENCE_CODE}
                rootTypeIds={EVIDENCE_FILTER.closureIds}
                value={row.evidenceCode}
                onChange={value => patchEvidence(row.uid, { evidenceCode: asTerm(value) })}
                initialOptions={evidenceOptions}
              />
            </div>
            <div className="w-[30%] shrink-0">
              <DatabaseField
                type="reference"
                value={row.reference}
                onChange={reference => patchEvidence(row.uid, { reference })}
              />
            </div>
            <div className="min-w-0 flex-1">
              <DatabaseField
                type="with"
                value={row.withFrom}
                onChange={withFrom => patchEvidence(row.uid, { withFrom })}
              />
            </div>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  className="mb-2"
                  aria-label="Evidence options"
                >
                  <FaEllipsisV size={12} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={() => fillEvidence(row.uid, 'iss')}>Add ISS Evidence</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        ))}

        <SectionHeading className="mt-4">Extensions</SectionHeading>
        {form.extensions.map((row, index) => (
          <ExtensionRowFields
            key={row.uid}
            form={form}
            row={row}
            index={index}
            onChange={patch => patchExtension(row.uid, patch)}
            onDelete={() =>
              setForm(f => ({ ...f, extensions: f.extensions.filter(r => r.uid !== row.uid) }))
            }
          />
        ))}
        <div className="px-4 py-3">
          <Button
            variant="subtle"
            onClick={() =>
              setForm(f => ({ ...f, extensions: [...f.extensions, createExtensionRow()] }))
            }
          >
            Add {form.extensions.length > 0 ? 'Another ' : ''}Extension
          </Button>
        </div>

        <SectionHeading>Comments</SectionHeading>
        {form.comments.map(row => (
          <div key={row.uid} className="flex w-full items-start gap-2 px-3 pt-2">
            <Textarea
              className="w-[60%]"
              label="Comment"
              value={row.text}
              autosize
              minRows={2}
              onChange={e => {
                const text = e.target.value
                setForm(f => ({
                  ...f,
                  comments: f.comments.map(c => (c.uid === row.uid ? { ...c, text } : c)),
                }))
              }}
            />
            <ActionIcon
              variant="subtle"
              color="red"
              className="mt-6"
              aria-label="Delete comment"
              onClick={() =>
                setForm(f => ({ ...f, comments: f.comments.filter(c => c.uid !== row.uid) }))
              }
            >
              <FaRegTrashAlt size={14} />
            </ActionIcon>
          </div>
        ))}
        <div className="px-4 py-3">
          <Button
            variant="subtle"
            onClick={() => setForm(f => ({ ...f, comments: [...f.comments, createCommentRow()] }))}
          >
            Add {form.comments.length > 0 ? 'Another ' : ''}Comment
          </Button>
        </div>

        <div className="flex items-center gap-2 border-t border-gray-200 bg-gray-50 px-4 py-4">
          {touched && errors.length > 0 && (
            <Button variant="subtle" color="red" onClick={() => setErrorsOpen(true)}>
              Why is the &quot;Save&quot; button disabled?
            </Button>
          )}
          <span className="grow" />
          <Button variant="default" onClick={clearForm}>
            Clear
          </Button>
          <Button
            type="submit"
            variant="filled"
            disabled={errors.length > 0 || actions.isSaving}
            loading={actions.isSaving}
            data-pw="save-annotation-button"
          >
            Save
          </Button>
        </div>
      </form>

      <FormErrorsDialog open={errorsOpen} errors={errors} onClose={() => setErrorsOpen(false)} />
    </div>
  )
}

export default AnnotationForm
