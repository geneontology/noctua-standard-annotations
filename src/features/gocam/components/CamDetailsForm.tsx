import type React from 'react'
import { useMemo, useState } from 'react'
import { Button, Select } from '@mantine/core'
import { useAppSelector, useAppDispatch } from '@/app/hooks'
import { selectCamModel } from '@/features/gocam/slices/camSlice'
import { selectAuthUser, selectBaristaToken, setUserGroup } from '@/features/auth/slices/authSlice'
import { closeDialog } from '@/@noctua.core/components/dialog/dialogSlice'
import { showToast } from '@/@noctua.core/components/toast/toastSlice'
import SectionHeading from '@/@noctua.core/components/form/SectionHeading'
import { useModelUrls } from '../hooks/useModelUrls'

/**
 * Model Details: the group edits are attributed to, and the model summary
 * (contributors, groups, the other editors). Title, state and comments have
 * their own forms (#94). Opened from the date and contributor chips.
 */
const CamDetailsForm: React.FC = () => {
  const dispatch = useAppDispatch()
  const cam = useAppSelector(selectCamModel)
  const user = useAppSelector(selectAuthUser)
  const urls = useModelUrls(cam?.id, useAppSelector(selectBaristaToken))
  const [groupId, setGroupId] = useState<string | null>(user?.group?.id ?? null)

  const groupOptions = useMemo(
    () => (user?.groups ?? []).map(g => ({ value: g.id, label: g.label || g.id })),
    [user?.groups]
  )
  const canChooseGroup = !!user && groupOptions.length > 0

  // The group applies to every edit from now on (`provided-by`); nothing is written to the model.
  const handleSave = () => {
    if (groupId && groupId !== user?.group?.id) {
      dispatch(setUserGroup(groupId))
      const label = groupOptions.find(g => g.value === groupId)?.label ?? groupId
      dispatch(showToast({ message: `Edits are now attributed to ${label}.` }))
    }
    dispatch(closeDialog())
  }

  if (!cam) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {canChooseGroup && (
          <>
            <SectionHeading>Your Group</SectionHeading>
            <div className="px-4 py-4">
              <Select
                label="Group"
                description="The group your edits are attributed to"
                value={groupId}
                onChange={setGroupId}
                size="sm"
                data={groupOptions}
              />
            </div>
          </>
        )}
        <SectionHeading>Model Summary</SectionHeading>
        <dl
          className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 px-4 py-4 text-xs"
          data-testid="model-summary"
        >
          <dt className="font-semibold">Contributors:</dt>
          <dd>{cam.contributors.map(c => c.name ?? c.uri).join('; ') || '—'}</dd>
          <dt className="font-semibold">Groups:</dt>
          <dd>{cam.groups.map(g => g.label ?? g.id).join('; ') || '—'}</dd>
          <dt className="font-semibold">Open In:</dt>
          <dd className="flex flex-wrap gap-x-2">
            <a href={urls?.pathwayEditor} target="_blank" rel="noopener noreferrer">
              Pathway Editor
            </a>
            <span>&bull;</span>
            <a href={urls?.formEditor} target="_blank" rel="noopener noreferrer">
              Form Editor
            </a>
            <span>&bull;</span>
            <a href={urls?.graphEditor} target="_blank" rel="noopener noreferrer">
              Graph Editor
            </a>
          </dd>
        </dl>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
        <Button variant="outline" size="sm" onClick={() => dispatch(closeDialog())}>
          {canChooseGroup ? 'Cancel' : 'Close'}
        </Button>
        {canChooseGroup && (
          <Button variant="filled" size="sm" onClick={handleSave}>
            Save
          </Button>
        )}
      </div>
    </div>
  )
}

export default CamDetailsForm
