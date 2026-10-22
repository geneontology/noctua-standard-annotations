# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Noctua Standard Annotations (SAE) — a React 19 + TypeScript SPA for creating and editing
standard GO annotations (gene product → relation → GO term, with evidence, extensions and
comments) stored as small GO-CAM subgraphs in Minerva. It follows the Noctua Visual Pathway
Editor's stack and layout: Vite, Tailwind CSS v4, Redux Toolkit + RTK Query, Mantine v9.

Ported from the Angular app (`noctua-annotations`, see `.plans/refactor/angular-to-react.md`).

### Directories to Ignore

- `./workbenches/*/public/` — compiled deploy output; do not analyze or hand-edit.

## Commands

- `npm run dev` — dev server on port **4203** (`development` mode, served under the workbench base path)
- `npm run start` — same on host `0.0.0.0` (variants: `start:development`, `start:staging`, `start:production`)
- `npm run build` — type-check, then `vite build --mode production` into `workbenches/noctua-standard-annotations/public` (replaces the deployed build; `index.html` is renamed to `inject.tmpl`)
- `npm run build:beta-test` — same against `noctua-standard-annotations-beta` in `staging` mode
- `npm run test` — Vitest (only `tests/**/*.test.{ts,tsx}`); single file: `npx vitest run tests/features/annotations/services/annotationExtraction.test.ts`
- `npm run test:e2e` — Playwright against a dev server on `/` (`--mode e2e`), with an in-memory Minerva and GOlr (`e2e/mocks/minerva.ts`). Stop any dev server on 4203 first: Playwright reuses it.
- `LIVE=1 npx playwright test e2e/live` — read-only smoke test against barista-dev and the real GOlr (writes are aborted)
- `LOCAL=1 LOCAL_BARISTA_TOKEN=<token> npx playwright test e2e/local` — real writes against a local Barista (`localhost:3400`, `minerva_local`) on a new scratch model per run
- `npm run lint` / `lint:fix` — ESLint; `npm run format` — Prettier; `npm run type-check` — `tsc -p tsconfig.app.json`

Environment modes: `development`, `staging`, `production` (`.env.<mode>`, committed — no secrets). Runtime vars are `VITE_`-prefixed: `VITE_APP_ENV` (dev/beta/prod), `VITE_BASE_URL`, `VITE_OUTPUT_PATH`. Barista, Minerva and GOlr locations come from `window.global_*`, injected by the Noctua workbench host; the fallbacks in `src/@noctua.core/data/constants.ts` are for a local Barista. To build somewhere harmless, override the output: `VITE_OUTPUT_PATH=<dir> npx vite build --mode production`.

## Architecture

### Source Layout

- `src/@noctua.core/` — shared library: dialogs (`SimpleDialog`, `ConfirmDialog`, `GlobalDialog`), drawer/toast/loading-overlay slices, popover/menu, chip, `CommentListEditor`, theme, constants, GO linker, date formatting, and the shape data (`shapes.json`, `shape-terms.json`, `gp-to-term.json`, known `relations.ts`).
- `src/app/` — store (`store/store.ts`, `store/apiService.ts`), typed hooks (`hooks.ts`), layout (`Layout`, `Toolbar`, `RightDrawer`), and the page `StandardAnnotations.tsx`.
- `src/features/`
  - `gocam/` — model layer: Minerva graph parsing (`services/graphServices.ts`), m3Batch API (`slices/camApiSlice.ts`: get / update / reset), the model slice and prelookup selectors (`slices/camSlice.ts`), the cam toolbar and the Model Details form.
  - `annotations/` — the SAE domain:
    - `services/annotationExtraction.ts` — reads standard annotations out of a `GraphModel`
    - `services/annotationOperations.ts` — builds the m3Batch operations for every edit
    - `services/shapeRules.ts` — the shape / gp-to-term rule queries
    - `services/annotationFormRules.ts` — the create form's derived relations, ranges and validation
    - `components/` — form, table, inline editor, comments panel, and dialogs
  - `search/` — GOlr term search (JSONP) and the term `Autocomplete`, gene-id lookup, PubMed lookup.
  - `auth/` — Barista token (`?barista_token=`, then localStorage) and user info.
  - `users/` — Barista users/groups metadata and the splash screen.
- `tests/` — Vitest specs mirroring `src/`; fixtures in `tests/fixtures/` (real barista-dev payloads in `raw/models/`, the synthetic `saeModel.ts`, `mockBarista` for stubbing m3Batch at `fetch`); `renderWithProviders` in `tests/test-utils.tsx`.
- `e2e/` — Playwright specs; `e2e/mocks/barista.ts` mocks Barista m3Batch and GOlr JSONP.

### How a standard annotation is stored (and read back)

Every SAE annotation gets its own individuals:

| Relation shown | Stored as |
| --- | --- |
| enables | `MF enabled_by GP` |
| involved in, acts upstream of (or within)[, ±] | `MF(GO:0003674) enabled_by GP` + `MF(GO:0003674) part_of / causally_upstream_of… BP` |
| located in, is active in, part of, contributes to | `GP <edge> term` |

The mapping lives in `annotations/data/annotationConfig.ts` (`ANNOTATION_EDGE_CONFIG`, ported from Angular `simpleAnnotationEdgeConfig`).

- **Reading.** `extractAnnotations` starts a row at every `enabled_by` fact and every gene-product-subject `located_in` / `is_active_in` / `part_of` / `contributes_to` fact. It walks the annotation's subgraph over shape predicates, skipping causal edges except a root MF's "acts upstream" edge.
- **Display.** The relation shown is the inverse from the config.
- **Extensions.** These are the GO term's outgoing facts that `shapes.json` allows as extensions.
- **Evidence and comments edits** fan out to every fact/evidence in the annotation's subgraph, as the Angular app did.
- **NOT** is a complement class expression on the GO term individual.

### State Management

Redux Toolkit with `combineSlices` (`store.ts`): `auth`, `metadata`, `cam`, `annotations`, `drawer`, `dialog`, `toast`, `loadingOverlay`, plus the RTK Query reducer.

- `cam.model` holds the parsed `GraphModel`. The page copies the `getGraphModel` result into it.
- Annotations are derived with `selectAnnotations` / `selectSortedAnnotations`. The sort is persisted in localStorage under the Angular key `annotationActivitySortBy`.
- `loadingOverlayMiddleware` ties the m3Batch endpoints to the global overlay.

### API Layer (Minerva via Barista)

- **Reads:** `intention=query` with `[model get]`, no reasoner (like the Angular manager). Logged in: a POST to `m3BatchPrivileged` (token in the body, not the URL); logged out: a GET to the public `m3Batch`.
- **Writes:** one POST to `m3BatchPrivileged` per edit (form-urlencoded `token`, `provided-by` = the acting group, `intention=action`, `requests`). Every batch ends in a model `store`, so edits are saved as they are made; a store-only batch (the Not Saved bar's Save) is `intention=query`, as Angular's `storeCam` sent it. Successful writes invalidate the `graph` tag, which refetches the model.
- **Errors:** Minerva and Barista report failures as HTTP 200 with `message-type` / `message_type: "error"`. `getBatchErrorMessage` turns them into RTK Query errors, and `useAnnotationActions` toasts them. A failed refresh keeps the last model on the page.
- **Minerva rules the builders rely on:** removing a fact deletes its evidence individuals (never remove them again — the batch fails before its `store`); a batch has no rollback; a model with no individuals or no title can't be stored (so the last annotation can't be deleted, and the first create titles the model).
- **GOlr:** JSONP via `<script>` (no CORS).
- **Barista socket (socket.io 4.x):** `baristaSocketService` listens for Barista's `relay` (sent to every client for each `intention=action` batch). `useBaristaModelWatch` shows the page's "Model Updated" dialog when another tab or user changes the open model (geneontology/noctua#1077). `updateGraphModel` records its response's `packet-id` so SAE's own writes aren't reported; a relay that beats the response waits 500 ms for it.

## Enforced Patterns

- **Typed Redux hooks only** — `useAppDispatch`/`useAppSelector` from `src/app/hooks.ts`; direct `useSelector`/`useDispatch`/`useStore` are lint errors.
- **`import type`** for type-only imports (`@typescript-eslint/consistent-type-imports`).
- **Path aliases** — `@/*` for `src/*`, `@tests/*` for `tests/*`.
- **UI** — Mantine v9 for complex components, Tailwind for layout. Use the dialog wrappers in `src/@noctua.core/components/dialog/` rather than raw `<Modal>`.
- **Writes go through `useAnnotationActions`** (or `useUpdateGraphModelMutation` with an operation builder) — build operations in a pure `services/*Operations.ts` function and test it there.
- **Unused parameters** — prefix with `_`.

## Conventions

- Prettier: no semicolons, single quotes, 2-space indent, trailing comma `es5`, 100-char width, `arrowParens: avoid`, Tailwind classes sorted.
- PascalCase components; camelCase hooks and utilities.
- Tailwind scans only `src/` (`@import 'tailwindcss' important source('.')`), never the committed workbench build. `important` is required because the Noctua shell loads Bootstrap 3.

## Testing

Vitest + React Testing Library + jsdom. `renderWithProviders` gives an isolated store and the Mantine theme in `env="test"` (no transitions/portals).

- Stub m3Batch with `mockBarista` (`tests/fixtures/barista.ts`). It records the decoded `operations` of every request, so UI tests can assert the exact batch.
- e2e: `openModel(page, { model })` (`e2e/helpers.ts`) serves a `FakeMinerva` seeded from `e2e/fixtures/world.ts` and answers GOlr from its catalog. The fake applies batches like Minerva (variables, evidence removed with its fact, unknown ids fail, store/reset), so specs assert both the table and `minerva.factSummaries()` / `evidenceOf()`.
- Replace the term `Autocomplete` with `vi.mock('@/features/search/components/Autocomplete', () => import('@tests/mocks/autocompleteMock'))`.
- `tests/setup.ts` replaces `socket.io-client` with `tests/mocks/socketIoMock.ts` everywhere; drive Barista's relays with `lastSocket().receive('relay', …)` and reset with `baristaSocketService.disconnect()`. Mocked e2e runs cut `/socket.io/` off (`routeMinerva`).
- Prefer `saeModelRaw` / `loadModel` over hand-built graphs.

## Task Management

Create and maintain plan files in `.plans/<category>/<task-name>.md` for non-trivial work; see [.plans/template.md](.plans/template.md). On context resume, check `.plans/` for ACTIVE plans first.

## Git

- Branches: `issue-<number>-<short-description>` (features), `fix-<number>-<short-description>` (bugs).
- Commit messages: a short subject plus a few brief bullets; reference issue numbers. **Never** add `Co-Authored-By` or any Claude attribution.

## Reviewers

@pgaudet @vanaukenk @kltm @thomaspd

## PR Template

```markdown
### Issues

- <link to related issue>

### Changes

- <description of changes>

### Tests

- [ ] <manual test steps>

cc @pgaudet @vanaukenk @kltm @thomaspd
```
