import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '@/app/store/store'
import type { AppStore } from '@/app/store/store'
import { useAuthSetup } from '@/features/auth/hooks/useAuthSetup'
import { CURATOR } from '@tests/fixtures/state'

const userInfo = {
  token: 'tok-123',
  uri: CURATOR.uri,
  nickname: CURATOR.name,
  groups: CURATOR.groups,
}

const stubFetch = (respond: (url: string) => Promise<Response>) => {
  const fetchMock = vi.fn((input: RequestInfo | URL) =>
    respond(input instanceof Request ? input.url : String(input))
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const json = (body: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
  )

const setup = () => {
  localStorage.setItem('barista_token', 'tok-123')
  const store: AppStore = makeStore()
  const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>
  renderHook(() => useAuthSetup(), { wrapper })
  return store
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('useAuthSetup', () => {
  it('logs in with the stored token', async () => {
    stubFetch(() => json(userInfo))
    const store = setup()
    await waitFor(() => expect(store.getState().auth.user?.name).toBe(CURATOR.name))
    expect(store.getState().auth.userChecked).toBe(true)
  })

  it('logs out when Barista no longer knows the token', async () => {
    stubFetch(() => json({}))
    const store = setup()
    await waitFor(() => expect(store.getState().auth.userChecked).toBe(true))
    expect(store.getState().auth.baristaToken).toBeNull()
    expect(localStorage.getItem('barista_token')).toBeNull()
  })

  it('keeps the login when Barista cannot be reached', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    const store = setup()
    await waitFor(() => expect(store.getState().auth.userChecked).toBe(true))
    expect(store.getState().auth.baristaToken).toBe('tok-123')
    expect(localStorage.getItem('barista_token')).toBe('tok-123')
  })

  it("picks up another tab's login when the tab regains focus", async () => {
    const fetchMock = stubFetch(url =>
      json(
        url.endsWith('/tok-456') ? { ...userInfo, token: 'tok-456', nickname: 'Other' } : userInfo
      )
    )
    const store = setup()
    await waitFor(() => expect(store.getState().auth.user?.name).toBe(CURATOR.name))

    localStorage.setItem('barista_token', 'tok-456')
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    await waitFor(() => expect(store.getState().auth.user?.name).toBe('Other'))
    expect(store.getState().auth.baristaToken).toBe('tok-456')
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input instanceof Request ? input.url : input).endsWith('/tok-456')
      )
    ).toBe(true)
  })
})
