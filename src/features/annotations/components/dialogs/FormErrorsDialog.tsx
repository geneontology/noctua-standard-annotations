import type React from 'react'
import { Button } from '@mantine/core'
import SimpleDialog from '@/@noctua.core/components/dialog/SimpleDialog'
import type { FormError } from '../../models/annotationForm'

interface FormErrorsDialogProps {
  open: boolean
  errors: FormError[]
  onClose: () => void
}

/** "Why is the Save button disabled?" (Angular `ActivityErrorsDialogComponent`). */
const FormErrorsDialog: React.FC<FormErrorsDialogProps> = ({ open, errors, onClose }) => (
  <SimpleDialog open={open} onClose={onClose} title="Errors" size="sm">
    <ol className="flex flex-col divide-y divide-gray-200 px-4 py-2">
      {errors.map((error, index) => (
        <li key={`${index}-${error.message}`} className="flex items-start gap-3 py-2 text-sm">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-semibold text-red-800">
            {index + 1}
          </span>
          <span className="text-gray-800">{error.message}</span>
        </li>
      ))}
    </ol>
    <div className="flex shrink-0 justify-end border-t border-gray-200 bg-gray-50 px-4 py-3">
      <Button variant="filled" onClick={onClose}>
        Close
      </Button>
    </div>
  </SimpleDialog>
)

export default FormErrorsDialog
