import type { Middleware } from '@reduxjs/toolkit'
import { hide, show } from './loadingOverlaySlice'
import { OperationType } from '@/features/gocam/models/operations'
import type { Operation } from '@/features/gocam/models/operations'

const HIDE_LINGER_MS = 300

const TRACKED_ENDPOINTS = new Set(['getGraphModel', 'updateGraphModel', 'resetGraphModel'])

const messageForUpdate = (operations: Operation[] | undefined): string => {
  if (operations?.some(op => op.operation === OperationType.REMOVE)) {
    return 'Deleting...'
  }
  return 'Saving...'
}

const messageFor = (endpointName: string, originalArgs: unknown): string => {
  switch (endpointName) {
    case 'getGraphModel':
      return 'Loading Model Activities...'
    case 'resetGraphModel':
      return 'Resetting Model...'
    case 'updateGraphModel':
      return messageForUpdate(originalArgs as Operation[] | undefined)
    default:
      return 'Loading...'
  }
}

const modelIdOf = (originalArgs: unknown): string | undefined =>
  (originalArgs as { modelId?: string } | undefined)?.modelId

/**
 * The global overlay for the first load of a model and for every write. The
 * refresh that follows a write runs under the page the user is looking at, as in
 * Angular, rather than blocking it a second time. Each overlay is paired with its
 * request id, so a rejection RTK Query raises without a pending never hides another.
 */
export const loadingOverlayMiddleware: Middleware = ({ dispatch }) => {
  const loadedModels = new Set<string>()
  const shown = new Set<string>()

  return next => action => {
    const result = next(action)

    if (typeof action !== 'object' || action === null) return result

    const a = action as {
      type?: string
      meta?: { requestId?: string; arg?: { endpointName?: string; originalArgs?: unknown } }
    }

    const endpointName = a.meta?.arg?.endpointName
    const requestId = a.meta?.requestId
    if (!endpointName || !TRACKED_ENDPOINTS.has(endpointName) || !a.type || !requestId) {
      return result
    }
    const originalArgs = a.meta?.arg?.originalArgs
    const modelId = endpointName === 'getGraphModel' ? modelIdOf(originalArgs) : undefined

    if (a.type.endsWith('/pending')) {
      if (modelId && loadedModels.has(modelId)) return result
      shown.add(requestId)
      dispatch(show(messageFor(endpointName, originalArgs)))
    } else if (a.type.endsWith('/fulfilled') || a.type.endsWith('/rejected')) {
      if (modelId && a.type.endsWith('/fulfilled')) loadedModels.add(modelId)
      if (!shown.delete(requestId)) return result
      setTimeout(() => dispatch(hide()), HIDE_LINGER_MS)
    }

    return result
  }
}
