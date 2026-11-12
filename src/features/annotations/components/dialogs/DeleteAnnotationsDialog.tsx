import type React from 'react'
import ConfirmDialog from '@/@noctua.core/components/dialog/ConfirmDialog'
import type { StandardAnnotation } from '../../models/annotation'

interface DeleteAnnotationsDialogProps {
  open: boolean
  annotations: StandardAnnotation[]
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}

/** Confirm "delete selected" (#96): what goes, one line per annotation. */
const DeleteAnnotationsDialog: React.FC<DeleteAnnotationsDialogProps> = ({
  open,
  annotations,
  busy,
  onClose,
  onConfirm,
}) => {
  const count = annotations.length
  const noun = count === 1 ? 'annotation' : 'annotations'
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      busy={busy}
      size="sm"
      title="Confirm Delete?"
      confirmLabel={`Delete ${count}`}
      message={
        <>
          <p className="mb-2">
            You are about to delete {count} {noun}.
          </p>
          <ul
            aria-label="Annotations to delete"
            className="max-h-60 overflow-y-auto rounded border border-gray-200 bg-gray-50 text-xs"
          >
            {annotations.map(annotation => (
              <li
                key={annotation.uid}
                className="border-b border-gray-200 px-2 py-1 last:border-b-0"
              >
                <strong>{annotation.gp.label || annotation.gp.id}</strong>{' '}
                {annotation.isComplement && <strong>NOT </strong>}
                {annotation.relation.label} {annotation.goTerm.label || annotation.goTerm.id}{' '}
                <span className="text-gray-500">{annotation.goTerm.id}</span>
              </li>
            ))}
          </ul>
        </>
      }
    />
  )
}

export default DeleteAnnotationsDialog
