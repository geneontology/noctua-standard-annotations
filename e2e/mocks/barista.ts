import type { Page } from '@playwright/test'

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
