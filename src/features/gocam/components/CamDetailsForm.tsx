import { useCallback, useMemo, useState } from 'react'
import { Button, Select, Textarea } from '@mantine/core'
import { v4 as uuidv4 } from 'uuid'
import { useAppSelector, useAppDispatch } from '@/app/hooks'
import { selectCamModel } from '@/features/gocam/slices/camSlice'
import { selectAuthUser, setUserGroup } from '@/features/auth/slices/authSlice'
import { closeDialog } from '@/@noctua.core/components/dialog/dialogSlice'
import { showToast } from '@/@noctua.core/components/toast/toastSlice'
import SectionHeading from '@/@noctua.core/components/form/SectionHeading'
import CommentListEditor from '@/@noctua.core/components/form/CommentListEditor'
import type { CommentItem } from '@/@noctua.core/components/form/CommentListEditor'
import { MODEL_STATES } from '../data/camConstants'
import { getMutationErrorMessage, useUpdateGraphModelMutation } from '../slices/camApiSlice'
import { buildSaveModelDetailsOperations } from '../services/modelOperations'

const toItems = (comments: string[]): CommentItem[] =>
  comments.map(text => ({ uid: uuidv4(), text }))

/**
 * Model Details (Angular `noc-cam-form`): title, state, the group edits are
 * attributed to, and the model comments. Read-only when not logged in.
 */
const CamDetailsForm: React.FC = () => {
  const dispatch = useAppDispatch()
  const cam = useAppSelector(selectCamModel)
  const user = useAppSelector(selectAuthUser)
  const isLoggedIn = !!user
  const [updateGraphModel, { isLoading }] = useUpdateGraphModelMutation()

  const [title, setTitle] = useState(cam?.title ?? '')
  const [state, setState] = useState(cam?.state ?? 'development')
  const [groupId, setGroupId] = useState<string | null>(user?.group?.id ?? null)
  const [comments, setComments] = useState<CommentItem[]>(() => toItems(cam?.comments ?? []))

  // A state outside the usual list (e.g. "template") still shows as selected.
  const stateOptions = useMemo(() => {
    const options: { value: string; label: string }[] = MODEL_STATES.map(s => ({ ...s }))
    if (cam?.state && !options.some(o => o.value === cam.state)) {
      options.push({ value: cam.state, label: cam.state })
    }
    return options
  }, [cam?.state])

  const groupOptions = useMemo(
    () => (user?.groups ?? []).map(g => ({ value: g.id, label: g.label || g.id })),
    [user?.groups]
  )

  const handleSave = useCallback(async () => {
    if (!cam?.id) return
    // The group applies to this save and to every edit after it (`provided-by`).
    if (groupId && groupId !== user?.group?.id) dispatch(setUserGroup(groupId))

    const ops = buildSaveModelDetailsOperations(
      cam.id,
      { titles: cam.titles, states: cam.states, comments: cam.comments },
      { title, state, comments: comments.map(c => c.text) }
    )
    const result = await updateGraphModel(ops)
    if ('error' in result) {
      dispatch(showToast({ message: getMutationErrorMessage(result.error), severity: 'error' }))
      return
    }
    dispatch(showToast({ message: 'Model details successfully updated.' }))
    dispatch(closeDialog())
  }, [cam, groupId, user?.group?.id, title, state, comments, updateGraphModel, dispatch])

  if (!cam) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!isLoggedIn && (
          <div className="bg-red-100 px-4 py-2 text-center text-xs text-red-900">
            Log in to edit the model details
          </div>
        )}
        <SectionHeading>Model Information</SectionHeading>
        <div className="flex flex-col gap-3 px-4 py-4">
          <Textarea
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            readOnly={!isLoggedIn}
            size="sm"
            autosize
            minRows={2}
            maxRows={6}
          />
          <Select
            label="State"
            value={state}
            onChange={value => value && setState(value)}
            disabled={!isLoggedIn}
            size="sm"
            data={stateOptions}
          />
          {isLoggedIn && groupOptions.length > 0 && (
            <Select
              label="Group"
              value={groupId}
              onChange={setGroupId}
              size="sm"
              data={groupOptions}
            />
          )}
        </div>
        <SectionHeading>Model Comments</SectionHeading>
        <div className="px-4 py-4">
          <CommentListEditor
            comments={comments}
            onChange={setComments}
            createItem={() => ({ uid: uuidv4(), text: '' })}
            readOnly={!isLoggedIn}
          />
        </div>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
        <Button variant="outline" size="sm" onClick={() => dispatch(closeDialog())}>
          {isLoggedIn ? 'Cancel' : 'Close'}
        </Button>
        {isLoggedIn && (
          <Button variant="filled" size="sm" onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>
    </div>
  )
}

export default CamDetailsForm
