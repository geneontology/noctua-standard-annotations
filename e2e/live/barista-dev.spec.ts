import { expect, test } from '@playwright/test'
import { mockLoggedIn } from '../mocks/barista'

/**
 * Read-only smoke test against barista-dev and the real GOlr. Skipped unless
 * `LIVE=1`; it never writes: every m3Batch POST is aborted, and the fake login is
 * answered with public (non-privileged) reads.
 *
 *   LIVE=1 npx playwright test e2e/live
 */
test.skip(!process.env.LIVE, 'set LIVE=1 to run against barista-dev')

const MODEL_ID = 'gomodel:6a2b236300000482'
const BARISTA = 'http://barista-dev.berkeleybop.org'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(barista => {
    const w = window as unknown as Record<string, string>
    w.global_barista_location = barista
    w.global_minerva_definition_name = 'minerva_public_dev'
    w.global_golr_neo_server = 'http://noctua-golr.berkeleybop.org/'
  }, BARISTA)

  // Read-only: no write ever reaches barista-dev, and privileged reads (POSTs with
  // `intention=query` and only a `get`) go to the public endpoint, without the token.
  await page.route('**/m3BatchPrivileged*', async route => {
    const params = new URLSearchParams(route.request().postData() ?? '')
    const operations = JSON.parse(params.get('requests') ?? '[]') as { operation: string }[]
    const isRead =
      params.get('intention') === 'query' && operations.every(op => op.operation === 'get')
    if (!isRead) return route.abort()
    const url = new URL(route.request().url())
    url.pathname = url.pathname.replace('m3BatchPrivileged', 'm3Batch')
    url.search = new URLSearchParams({
      intention: 'query',
      requests: params.get('requests') ?? '[]',
    }).toString()
    const response = await route.fetch({ url: url.toString(), method: 'GET' })
    return route.fulfill({ response })
  })
  await page.route(`${BARISTA}/api/**/m3Batch`, route =>
    route.request().method() === 'GET' ? route.continue() : route.abort()
  )
})

test('reads a real SAE model', async ({ page }) => {
  await page.goto(`/?model_id=${MODEL_ID}`)
  const rows = page.getByTestId('annotation-row')
  await expect(rows).toHaveCount(2, { timeout: 30_000 })
  await expect(rows.first()).toContainText('acts upstream of or within')
  await page.screenshot({ path: test.info().outputPath('live-model.png'), fullPage: true })
  await page
    .getByTestId('annotations-table')
    .screenshot({ path: test.info().outputPath('live-table.png') })
})

test('searches GOlr from the form', async ({ page }) => {
  await mockLoggedIn(page)
  await page.goto(`/?barista_token=test-barista-token&model_id=${MODEL_ID}`)
  await expect(page.getByTestId('annotation-row')).toHaveCount(2, { timeout: 30_000 })

  const form = page.getByRole('form', { name: 'Create annotation' })
  await form.getByRole('textbox', { name: 'Gene Product', exact: true }).fill('tgds')
  const gp = page.getByRole('option').filter({ hasText: 'ZFIN:' }).first()
  await expect(gp).toBeVisible({ timeout: 30_000 })
  await gp.click()

  await form.getByRole('textbox', { name: 'GO Term', exact: true }).fill('apoptotic process')
  await expect(page.getByRole('option', { name: /apoptotic process/ }).first()).toBeVisible({
    timeout: 30_000,
  })
  await page.screenshot({ path: test.info().outputPath('live-search.png'), fullPage: true })
})
