import { useMemo } from 'react'
import { ENVIRONMENT } from '@/@noctua.core/data/constants'

export function useModelUrls(modelId: string | undefined, baristaToken: string | null) {
  return useMemo(() => {
    if (!modelId) return null
    const params = new URLSearchParams()
    params.set('model_id', modelId)
    if (baristaToken) params.set('barista_token', baristaToken)
    const qs = params.toString()
    return {
      annotationPreview: `${ENVIRONMENT.workbenchUrl}annpreview?${qs}`,
      pathwayViewer: `${ENVIRONMENT.workbenchUrl}noctua-alliance-pathway-preview?${qs}`,
      graphEditor: `${ENVIRONMENT.noctuaUrl}/editor/graph/${modelId}?${qs}`,
      gpad: `${ENVIRONMENT.noctuaUrl}/download/${modelId}/gpad`,
      owl: `${ENVIRONMENT.noctuaUrl}/download/${modelId}/owl`,
    }
  }, [modelId, baristaToken])
}
