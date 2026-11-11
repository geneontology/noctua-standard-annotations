import type React from 'react'
import { useMemo, useState } from 'react'
import { Select } from '@mantine/core'
import { useAppSelector } from '@/app/hooks'
import { selectCamModel } from '@/features/gocam/slices/camSlice'
import { selectAuthUser } from '@/features/auth/slices/authSlice'
import { MODEL_STATES } from '../data/camConstants'
import { buildSaveModelStateOperations } from '../services/modelOperations'
import { useSaveModelAnnotations } from '../hooks/useSaveModelAnnotations'
import ModelFormActions from './ModelFormActions'

/** Change State, as in the VPE (#94): the model state only. */
const CamStateForm: React.FC = () => {
  const cam = useAppSelector(selectCamModel)
  const isLoggedIn = !!useAppSelector(selectAuthUser)
  const { save, isSaving } = useSaveModelAnnotations('Model state successfully updated.')
  // No state is chosen for the user: a model without one must be given one (Angular `required`).
  const [state, setState] = useState(cam?.state ?? '')

  // A state outside the usual list (e.g. "template") still shows as selected.
  const stateOptions = useMemo(() => {
    const options: { value: string; label: string }[] = MODEL_STATES.map(s => ({ ...s }))
    if (cam?.state && !options.some(o => o.value === cam.state)) {
      options.push({ value: cam.state, label: cam.state })
    }
    return options
  }, [cam?.state])

  if (!cam) return null

  const unchanged = state === cam.state && cam.states.length === 1

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <Select
          label="State"
          placeholder="Choose a state"
          required
          value={state || null}
          onChange={value => value && setState(value)}
          disabled={!isLoggedIn}
          size="sm"
          data={stateOptions}
        />
      </div>
      <ModelFormActions
        canEdit={isLoggedIn}
        onSave={() => save(buildSaveModelStateOperations(cam.id, cam.states, state))}
        saveDisabled={!state || unchanged}
        isSaving={isSaving}
      />
    </div>
  )
}

export default CamStateForm
