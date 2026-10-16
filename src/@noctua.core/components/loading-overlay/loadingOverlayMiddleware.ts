import type { Middleware } from '@reduxjs/toolkit'
import { hide, show } from './loadingOverlaySlice'
import { OperationType } from '@/features/gocam/models/operations'
import type { Operation } from '@/features/gocam/models/operations'

const HIDE_LINGER_MS = 1000

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

export const loadingOverlayMiddleware: Middleware = ({ dispatch }) => next => action => {
  const result = next(action)

  if (typeof action !== 'object' || action === null) return result

  const a = action as {
    type?: string
    meta?: { arg?: { endpointName?: string; originalArgs?: unknown } }
  }

  const endpointName = a.meta?.arg?.endpointName
  if (!endpointName || !TRACKED_ENDPOINTS.has(endpointName)) return result
  if (!a.type) return result

  if (a.type.endsWith('/pending')) {
    dispatch(show(messageFor(endpointName, a.meta?.arg?.originalArgs)))
  } else if (a.type.endsWith('/fulfilled') || a.type.endsWith('/rejected')) {
    setTimeout(() => dispatch(hide()), HIDE_LINGER_MS)
  }

  return result
}
