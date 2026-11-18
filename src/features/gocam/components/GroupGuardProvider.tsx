import type React from 'react'
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { useAppSelector } from '@/app/hooks'
import { selectCamModel } from '@/features/gocam/slices/camSlice'
import { selectAuthUser } from '@/features/auth/slices/authSlice'
import ConfirmDialog from '@/@noctua.core/components/dialog/ConfirmDialog'

/**
 * Gate an edit behind the "editing another group's model" warning (ported from
 * the VPE, #94). Runs `onConfirm` at once when nobody is logged in (the forms
 * open view-only), the model has no group, or the user belongs to one of its
 * groups; otherwise it asks first and runs `onConfirm` only on Continue.
 */
type CheckGroup = (onConfirm: () => void) => void

const GroupGuardContext = createContext<CheckGroup | null>(null)

export const useGroupGuard = (): CheckGroup => {
  const checkGroup = useContext(GroupGuardContext)
  if (!checkGroup) throw new Error('useGroupGuard must be used within a GroupGuardProvider')
  return checkGroup
}

const GroupGuardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const model = useAppSelector(selectCamModel)
  const user = useAppSelector(selectAuthUser)

  const [open, setOpen] = useState(false)
  const [groupNames, setGroupNames] = useState('')
  const pendingAction = useRef<(() => void) | null>(null)

  const checkGroup = useCallback<CheckGroup>(
    onConfirm => {
      const modelGroups = model?.groups ?? []
      const isGroupMember = modelGroups.some(mg => user?.groups?.some(ug => ug.id === mg.id))
      if (!user || modelGroups.length === 0 || isGroupMember) {
        onConfirm()
        return
      }
      pendingAction.current = onConfirm
      setGroupNames(
        modelGroups
          .map(g => g.label || g.id)
          .filter(Boolean)
          .join(', ')
      )
      setOpen(true)
    },
    [model, user]
  )

  const handleConfirm = useCallback(() => {
    setOpen(false)
    const action = pendingAction.current
    pendingAction.current = null
    action?.()
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
    pendingAction.current = null
  }, [])

  return (
    <GroupGuardContext.Provider value={checkGroup}>
      {children}
      <ConfirmDialog
        open={open}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Warning: Editing another group's model"
        message={`You are about to edit a model associated with a different group(s) (${groupNames}). Do you want to continue or cancel?`}
        confirmLabel="Continue and edit anyway"
        cancelLabel="Cancel"
        highlightCancel
      />
    </GroupGuardContext.Provider>
  )
}

export default GroupGuardProvider
