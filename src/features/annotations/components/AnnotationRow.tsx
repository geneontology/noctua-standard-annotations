import type React from 'react'
import { useCallback, useState } from 'react'
import { ActionIcon, Menu, Tooltip } from '@mantine/core'
import { FaCalendarDay, FaComment, FaEllipsisV, FaPencilAlt, FaRegTrashAlt } from 'react-icons/fa'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { usePopover } from '@/@noctua.core/hooks/usePopover'
import ConfirmDialog from '@/@noctua.core/components/dialog/ConfirmDialog'
import {
  setRightDrawerOpen,
  setRightPanelTab,
  RightPanelTab,
} from '@/@noctua.core/components/drawer/drawerSlice'
import { getSourceDbUrl } from '@/@noctua.core/services/goLinker/goLinker'
import { formatDate } from '@/@noctua.core/services/dateUtils'
import { selectAuthUser } from '@/features/auth/slices/authSlice'
import type { AnnotationExtension, StandardAnnotation } from '../models/annotation'
import {
  selectCommentAnnotation,
  selectSelectedCommentAnnotationId,
} from '../slices/annotationsSlice'
import { useAnnotationActions } from '../hooks/useAnnotationActions'
import AnnotationEditorDropdown, { EditorCategory } from './AnnotationEditorDropdown'
import AddGenesDialog from './dialogs/AddGenesDialog'
import { ANNOTATION_COLUMNS } from './annotationColumns'

const TermLink: React.FC<{ id: string; label?: string; url?: string | null }> = ({
  id,
  label,
  url,
}) => {
  const href = url === undefined ? getSourceDbUrl(id) : url
  return (
    <span className="break-words">
      {label && (
        <>
          {label}
          <br />
        </>
      )}
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
          {id}
        </a>
      ) : (
        <span>{id}</span>
      )}
    </span>
  )
}

/** Each reference as its own link, in Noctua's display order (`B| A`). */
const References: React.FC<{ sources: string[] }> = ({ sources }) => (
  <span className="flex flex-col">
    {[...sources]
      .sort((a, b) => (a > b ? -1 : 1))
      .map(source => (
        <TermLink key={source} id={source} />
      ))}
  </span>
)

/** A with/from list that wraps between its identifiers rather than inside them. */
const WithFrom: React.FC<{ value: string }> = ({ value }) => (
  <span className="[overflow-wrap:anywhere]">
    {value.split(/([,|])/).map((part, i) =>
      part === ',' || part === '|' ? (
        <span key={i}>
          {part}
          <wbr />
        </span>
      ) : (
        <span key={i} className="whitespace-nowrap">
          {part}
        </span>
      )
    )}
  </span>
)

interface CellProps {
  className: string
  onEdit?: (anchor: HTMLElement) => void
  editLabel?: string
  testId?: string
  children: React.ReactNode
}

/** A table cell whose edit button shows on hover (Angular `noc-entity-cell`). */
const Cell: React.FC<CellProps> = ({ className, onEdit, editLabel, testId, children }) => (
  <div
    role="cell"
    data-testid={testId}
    className={`group/cell relative flex min-w-0 flex-col justify-center border-r border-gray-300 px-1.5 py-2 text-xs text-black ${className}`}
  >
    {children}
    {onEdit && (
      <button
        type="button"
        aria-label={editLabel}
        title={editLabel}
        onClick={e => onEdit(e.currentTarget)}
        className="pointer-events-none absolute right-0 bottom-0 flex h-5 w-5 items-center justify-center text-gray-400 opacity-0 transition-opacity group-hover/cell:pointer-events-auto group-hover/cell:opacity-100 hover:bg-primary-500 hover:text-white focus:pointer-events-auto focus:opacity-100"
      >
        <FaPencilAlt size={9} />
      </button>
    )}
  </div>
)

type PendingConfirm = 'not' | 'delete' | { extension: AnnotationExtension } | null

interface AnnotationRowProps {
  annotation: StandardAnnotation
}

const AnnotationRow: React.FC<AnnotationRowProps> = ({ annotation }) => {
  const dispatch = useAppDispatch()
  const isLoggedIn = !!useAppSelector(selectAuthUser)
  const selectedCommentId = useAppSelector(selectSelectedCommentAnnotationId)
  const actions = useAnnotationActions()
  const editor = usePopover<{ category: EditorCategory }>()
  const [actionAnchor, setActionAnchor] = useState<HTMLElement | null>(null)
  const [pending, setPending] = useState<PendingConfirm>(null)
  const [addGenesOpen, setAddGenesOpen] = useState(false)

  const { gp, goTerm, evidence, relation } = annotation
  const columns = ANNOTATION_COLUMNS

  const edit = useCallback(
    (category: EditorCategory) => (anchor: HTMLElement) => editor.open(anchor, { category }),
    [editor]
  )
  const editIf = (category: EditorCategory, allowed = true) =>
    isLoggedIn && allowed ? edit(category) : undefined

  // Menu items that open an inline editor anchor it at the row's ⋮ button.
  const openFromMenu = (category: EditorCategory) => {
    if (actionAnchor) editor.open(actionAnchor, { category })
  }

  const openComments = () => {
    dispatch(selectCommentAnnotation(annotation.uid))
    dispatch(setRightPanelTab(RightPanelTab.COMMENTS))
    dispatch(setRightDrawerOpen(true))
  }

  const confirm = async () => {
    const current = pending
    setPending(null)
    if (current === 'not') await actions.toggleNot(annotation)
    else if (current === 'delete') await actions.deleteAnnotation(annotation)
    else if (current && typeof current === 'object')
      await actions.deleteExtension(current.extension)
  }

  return (
    <div
      role="row"
      data-testid="annotation-row"
      data-annotation-id={annotation.uid}
      className="flex w-full items-stretch border-b border-gray-300 bg-white hover:bg-accent-50"
    >
      <Cell
        className={columns.gp.className}
        onEdit={editIf(EditorCategory.GP)}
        editLabel="Edit gene product"
        testId="cell-gp"
      >
        <TermLink id={gp.id} label={gp.label} />
      </Cell>

      <Cell
        className={columns.relation.className}
        onEdit={editIf(
          EditorCategory.RELATION,
          // A relation SAE doesn't know (a root MF `occurs_in` from a GO-CAM) can't be swapped.
          !!relation.id && annotation.relationChoices.length > 0
        )}
        editLabel="Edit relation"
        testId="cell-relation"
      >
        <span>
          {annotation.isComplement && <strong className="mr-1">NOT</strong>}
          <span>{relation.label}</span>
        </span>
      </Cell>

      <Cell
        className={columns.term.className}
        onEdit={editIf(EditorCategory.TERM)}
        editLabel="Edit GO term"
        testId="cell-term"
      >
        <TermLink id={goTerm.id} label={goTerm.label} />
      </Cell>

      <Cell
        className={columns.evidence.className}
        onEdit={editIf(EditorCategory.EVIDENCE_CODE)}
        editLabel="Edit evidence"
        testId="cell-evidence"
      >
        {evidence && <TermLink id={evidence.evidenceCode.id} label={evidence.evidenceCode.label} />}
      </Cell>

      <Cell
        className={columns.reference.className}
        onEdit={editIf(EditorCategory.REFERENCE)}
        editLabel="Edit reference"
        testId="cell-reference"
      >
        {evidence && <References sources={evidence.sources} />}
      </Cell>

      <Cell
        className={columns.with.className}
        onEdit={editIf(EditorCategory.WITH)}
        editLabel="Edit with/from"
        testId="cell-with"
      >
        <WithFrom value={evidence?.with ?? ''} />
      </Cell>

      <Cell className={`${columns.extensions.className} !py-0`} testId="cell-extensions">
        {annotation.extensions.map(extension => (
          <div
            key={extension.edge.uid}
            className="group/ext relative flex flex-col border-b border-gray-200 py-1.5 pr-5 last:border-b-0"
          >
            <span className="text-[10px] text-gray-700 italic">{extension.relation.label}</span>
            <span>
              {extension.term.label}{' '}
              <a
                href={getSourceDbUrl(extension.term.id) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
              >
                {extension.term.id}
              </a>
            </span>
            {isLoggedIn && (
              <button
                type="button"
                aria-label={`Delete extension ${extension.relation.label} ${extension.term.label}`}
                onClick={() => setPending({ extension })}
                className="absolute top-1 right-0 flex h-5 w-5 items-center justify-center text-red-400 opacity-0 group-hover/ext:opacity-100 hover:bg-red-400 hover:text-white focus:opacity-100"
              >
                <FaRegTrashAlt size={10} />
              </button>
            )}
          </div>
        ))}
      </Cell>

      <Cell className={`${columns.date.className} items-center`} testId="cell-date">
        {annotation.date && (
          <span className="flex h-5 items-center gap-1 rounded-full border border-violet-300 bg-violet-50 pr-2 text-[10px] text-gray-800">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-violet-500">
              <FaCalendarDay size={10} />
            </span>
            {formatDate(annotation.date)}
          </span>
        )}
      </Cell>

      <Cell
        className={`${columns.comments.className} items-center ${selectedCommentId === annotation.uid ? 'bg-accent-500' : ''}`}
        testId="cell-comments"
      >
        {annotation.comments.length > 0 && (
          <Tooltip
            label={annotation.comments.join(' | ')}
            multiline
            w={300}
            openDelay={1000}
            position="right"
          >
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              aria-label={`Comments (${annotation.comments.length})`}
              onClick={openComments}
            >
              <FaComment size={14} />
              <span className="absolute top-0 right-0 rounded-md bg-green-700 px-1 py-px text-[9px] font-medium text-white">
                {annotation.comments.length}
              </span>
            </ActionIcon>
          </Tooltip>
        )}
      </Cell>

      <div
        role="cell"
        className={`${columns.action.className} flex items-start justify-center pt-1`}
      >
        {isLoggedIn && (
          <Menu position="bottom-end" withinPortal shadow="md">
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Annotation actions"
                onClick={e => setActionAnchor(e.currentTarget)}
              >
                <FaEllipsisV size={12} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => openFromMenu(EditorCategory.ADD_EXTENSION)}>
                Add Extension
              </Menu.Item>
              <Menu.Item onClick={() => setPending('not')}>
                {annotation.isComplement ? 'Remove' : 'Add'} <strong>NOT</strong> Qualifier
              </Menu.Item>
              <Menu.Item onClick={() => openFromMenu(EditorCategory.ADD_COMMENT)}>
                Add Comment
              </Menu.Item>
              <Menu.Item onClick={() => setAddGenesOpen(true)}>Add More Gene(s)</Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<FaRegTrashAlt size={12} />}
                onClick={() => setPending('delete')}
              >
                Delete Annotation
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </div>

      {editor.isOpen && editor.data && (
        <AnnotationEditorDropdown
          anchorEl={editor.anchor}
          category={editor.data.category}
          annotation={annotation}
          onClose={editor.close}
        />
      )}

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirm}
        title={pending === 'not' ? 'Confirm Update?' : 'Confirm Delete?'}
        message={
          pending === 'not'
            ? 'You are about to update NOT Qualifier.'
            : pending === 'delete'
              ? 'You are about to delete an annotation.'
              : 'You are about to delete an extension.'
        }
        confirmLabel={pending === 'not' ? 'Update' : 'Delete'}
        confirmColor={pending === 'not' ? 'primary' : 'red'}
      />

      {addGenesOpen && (
        <AddGenesDialog
          open={addGenesOpen}
          onClose={() => setAddGenesOpen(false)}
          onSave={async genes => {
            const saved = await actions.copyToGenes(
              annotation,
              genes.map(gene => gene.id)
            )
            if (saved) setAddGenesOpen(false)
          }}
        />
      )}
    </div>
  )
}

export default AnnotationRow
