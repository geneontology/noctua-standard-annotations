import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadingOverlayMiddleware } from '@/@noctua.core/components/loading-overlay/loadingOverlayMiddleware'

const action = (
  type: string,
  requestId: string,
  endpointName: string,
  originalArgs: unknown = {}
) => ({
  type: `apiService/executeQuery/${type}`,
  meta: { requestId, arg: { endpointName, originalArgs } },
})

describe('loadingOverlayMiddleware', () => {
  const dispatch = vi.fn()
  const run = (a: unknown) =>
    (loadingOverlayMiddleware as any)({ dispatch, getState: () => ({}) })((x: unknown) => x)(a)

  beforeEach(() => {
    vi.useFakeTimers()
    dispatch.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  const shownMessages = () =>
    dispatch.mock.calls.filter(([a]) => a.type.endsWith('/show')).map(([a]) => a.payload)
  const hides = () => dispatch.mock.calls.filter(([a]) => a.type.endsWith('/hide')).length

  it('covers the first load of a model, not the refresh after an edit', () => {
    const middleware = (loadingOverlayMiddleware as any)({ dispatch, getState: () => ({}) })(
      (x: unknown) => x
    )
    const args = { modelId: 'gomodel:1', baristaToken: 't' }
    middleware(action('pending', 'r1', 'getGraphModel', args))
    middleware(action('fulfilled', 'r1', 'getGraphModel', args))
    middleware(action('pending', 'r2', 'updateGraphModel', []))
    middleware(action('fulfilled', 'r2', 'updateGraphModel', []))
    middleware(action('pending', 'r3', 'getGraphModel', args))
    middleware(action('fulfilled', 'r3', 'getGraphModel', args))
    vi.runAllTimers()
    expect(shownMessages()).toEqual(['Loading Model Activities...', 'Saving...'])
    expect(hides()).toBe(2)
  })

  it('never hides for a rejection it did not show', () => {
    run(action('rejected', 'stray', 'updateGraphModel', []))
    vi.runAllTimers()
    expect(hides()).toBe(0)
  })
})
