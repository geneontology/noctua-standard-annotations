import { useMemo } from 'react'
import { ENVIRONMENT } from '@/@noctua.core/data/constants'

export function useModelUrls(modelId: string | undefined, baristaToken: string | null) {
  return useMemo(() => {
    if (!modelId) return null
    const params = new URLSearchParams()
    params.set('model_id', modelId)
    if (baristaToken) params.set('barista_token', baristaToken)
    const qs = params.toString()
    // The graph editor takes the model from its path, as the Angular links did.
    const tokenQs = baristaToken
      ? new URLSearchParams({ barista_token: baristaToken }).toString()
      : ''
    return {
      annotationPreview: `${ENVIRONMENT.workbenchUrl}annpreview?${qs}`,
      pathwayViewer: `${ENVIRONMENT.workbenchUrl}noctua-alliance-pathway-preview?${qs}`,
      pathwayEditor: `${ENVIRONMENT.workbenchUrl}noctua-visual-pathway-editor?${qs}`,
      formEditor: `${ENVIRONMENT.workbenchUrl}noctua-form?${qs}`,
      graphEditor: `${ENVIRONMENT.noctuaUrl}/editor/graph/${modelId}?${tokenQs}`,
      gpad: `${ENVIRONMENT.noctuaUrl}/download/${modelId}/gpad`,
      owl: `${ENVIRONMENT.noctuaUrl}/download/${modelId}/owl`,
    }
  }, [modelId, baristaToken])
}
