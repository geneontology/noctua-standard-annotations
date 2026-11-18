import { useCallback, useEffect, useState } from 'react'
import { ENVIRONMENT } from '@/@noctua.core/data/constants'
import { baristaSocketService } from '../services/baristaSocketService'

interface BaristaModelWatch {
  /** Someone else changed the model since it was loaded. */
  externalChangePending: boolean
  /** The model is being refreshed: clear the flag and listen again. */
  acknowledge: () => void
}

/** Watch `modelId` on Barista's socket for changes made in another tab or by another user. */
export const useBaristaModelWatch = (modelId: string | null): BaristaModelWatch => {
  const [externalChangePending, setExternalChangePending] = useState(false)

  useEffect(() => {
    if (!modelId) return
    baristaSocketService.connect(ENVIRONMENT.globalBaristaLocation)
    const unsubscribe = baristaSocketService.watchModel(modelId, {
      onExternalChange: () => setExternalChangePending(true),
    })
    return () => {
      unsubscribe()
      setExternalChangePending(false)
    }
  }, [modelId])

  const acknowledge = useCallback(() => {
    if (modelId) baristaSocketService.acknowledgeRefresh(modelId)
    setExternalChangePending(false)
  }, [modelId])

  return { externalChangePending, acknowledge }
}
