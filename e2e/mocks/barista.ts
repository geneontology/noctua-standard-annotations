import type { Page, Route } from '@playwright/test'

/** A curator as Barista's `user_info_by_token` returns them. */
export const fakeUserInfo = {
  uri: 'https://orcid.org/0000-0000-0000-0099',
  token: 'test-barista-token',
  nickname: 'Test Curator',
  groups: [{ id: 'http://geneontology.org', label: 'GO Central' }],
}

const json = (body: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

/** Barista users/groups, used by the splash screen. */
export const mockBaristaMetadata = async (page: Page): Promise<void> => {
  await page.route('**/users', route =>
    route.fulfill(json([{ nickname: 'Test Curator', uri: fakeUserInfo.uri }]))
  )
  await page.route('**/groups', route => route.fulfill(json(fakeUserInfo.groups)))
}

/** Log the browser in (`?barista_token=` is resolved through `user_info_by_token`). */
export const mockLoggedIn = async (page: Page): Promise<void> => {
  await page.route('**/user_info_by_token/**', route => route.fulfill(json(fakeUserInfo)))
}

export interface BatchRequest {
  intention: string | null
  operations: { entity: string; operation: string; arguments: Record<string, unknown> }[]
}

const decode = (route: Route): BatchRequest => {
  const request = route.request()
  const params =
    request.method() === 'GET'
      ? new URL(request.url()).searchParams
      : new URLSearchParams(request.postData() ?? '')
  return {
    intention: params.get('intention'),
    operations: JSON.parse(params.get('requests') ?? '[]'),
  }
}

/**
 * Serve m3Batch from `model` (an m3Batch `data` payload). Writes are recorded and
 * answered with the same model, so the app re-reads it as after a real edit.
 */
export const mockM3Batch = async (page: Page, model: unknown): Promise<BatchRequest[]> => {
  const writes: BatchRequest[] = []
  await page.route('**/m3Batch*', async route => {
    const batch = decode(route)
    if (batch.intention !== 'query' || batch.operations[0]?.operation === 'reset') {
      writes.push(batch)
    }
    await route.fulfill(json({ 'message-type': 'success', signal: 'rebuild', data: model }))
  })
  return writes
}

/**
 * GOlr is read with JSONP: answer each `select` with the callback the request
 * names, wrapping `docs` chosen by `respond` from the query.
 */
export const mockGolr = async (
  page: Page,
  respond: (params: URLSearchParams) => Record<string, unknown>[]
): Promise<void> => {
  await page.route('**/select?**', route => {
    const params = new URL(route.request().url()).searchParams
    const callback = params.get('json.wrf') ?? 'callback'
    const body = { response: { docs: respond(params) } }
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `${callback}(${JSON.stringify(body)})`,
    })
  })
}
