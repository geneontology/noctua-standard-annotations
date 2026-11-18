import { vi } from 'vitest'
import type { Operation } from '@/features/gocam/models/operations'

/** One request the app sent to Barista, decoded. */
export interface RecordedRequest {
  url: string
  method: string
  contentType: string | null
  /** Query string (GET) or form body (POST) parameters. */
  params: URLSearchParams
  /** The decoded `requests` parameter — the m3Batch operations. */
  operations: Operation[]
}

type Responder = (request: RecordedRequest) => unknown

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

/** A Minerva success envelope around an m3Batch `data` payload. */
export const batchSuccess = (data: unknown) => ({
  'message-type': 'success',
  message: 'success',
  signal: 'rebuild',
  data,
})

/**
 * Stub `fetch` for Barista m3Batch calls. Every request is decoded and recorded;
 * `respond` builds the JSON body to return (defaults to an empty success).
 */
export const mockBarista = (respond: Responder = () => batchSuccess(null)) => {
  const requests: RecordedRequest[] = []

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const url = new URL(request.url)
    const body = request.method === 'GET' ? '' : await request.clone().text()
    const params = request.method === 'GET' ? url.searchParams : new URLSearchParams(body)
    const recorded: RecordedRequest = {
      url: `${url.origin}${url.pathname}`,
      method: request.method,
      contentType: request.headers.get('Content-Type'),
      params,
      operations: JSON.parse(params.get('requests') ?? '[]'),
    }
    requests.push(recorded)
    return json(respond(recorded))
  })

  vi.stubGlobal('fetch', fetchMock)
  return { requests, fetchMock }
}
