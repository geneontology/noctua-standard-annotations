# Task: Convert Noctua Standard Annotations (SAE) from Angular to React

**Status:** ACTIVE
**Issue:** n/a (platform upgrade)
**Branch:** upgrade-to-react

## Goal

Rebuild the SAE workbench as a React 19 + TypeScript SPA that uses the same stack, folder layout,
and Minerva/Barista calling pattern as the Visual Pathway Editor (VPE). Only the
`noctua-annotations` app is ported. Done means: the table, the create form, every inline edit,
comments, add genes, and model details all work against Barista with the same m3Batch semantics
as the Angular app, and lint, type-check, unit tests, and the build all pass.

## Context

- **Angular source:** `C:\work\go\old-noctua-standard-annotations` (branch `main`); the app is
  `src/app/main/apps/noctua-annotations`, and the logic lives in `src/@noctua.form`
  (annotation-form.service, bbop-graph.service, noctua-form-config(.service), annotation-activity,
  lookup.service) and `src/@noctua.editor` (standard-dropdown inline editor).
- **Cleanup reference:** branch `cleanup` in the old repo. It dropped `@noctua.announcement`,
  `@noctua.doctor`, `@noctua.graph`, and the noctua-form, graph, search, doctor, tutorial, and
  pathway apps, and removed the copy-model, find-replace, and terms-summary panels from the
  annotations page. None of those are ported.
- **Pattern source:** `C:\work\go\noctua-visual-pathway-editor` (branch `dev`): Vite, React 19,
  Redux Toolkit + RTK Query, Mantine v9, Tailwind v4, Vitest, and Playwright.
- **This repo:** commit `1dc3444 refresh to start on the upgrade` cleared the Angular tree. Only
  `workbenches/` (deploy output + `config.yaml`) remains.

## Decisions

| Topic | Decision |
| --- | --- |
| Stack / layout | Mirror VPE: `src/@noctua.core`, `src/app`, `src/features/*`, `tests/` mirroring `src/`. |
| Minerva | No bbop manager. Build m3Batch operation JSON (VPE `Operation` shape) and POST it via RTK Query `updateGraphModel` to `m3BatchPrivileged` (`intention=action`, `provided-by`). Reads use GET `m3Batch(Privileged)` with `intention=query`. |
| Reasoner | Not used (`use-reasoner` omitted), matching the old SAE manager. `root-type` comes back without it (verified on barista-dev). |
| Shape data | Use SAE's own `shapes.json`, `shape-terms.json`, and `gp-to-term.json` (SAE replaced CARO with `UBERON:0001062`; VPE's copy still has CARO). `relations.ts` (known relations) is identical, so VPE's copy is reused. |
| Features layout | `features/gocam` = model layer (graph parse, m3Batch API, cam toolbar, model details). `features/annotations` = SAE domain (annotation extraction, operation builders, form, table, inline editor, comments, add genes). |
| Model details | One "Model Details" dialog (title, state, group, comments), because every SAE toolbar affordance opened the single cam-form panel. VPE splits these into separate dialogs. |
| Announcements / socket / GA | Not ported. The cleanup branch removed announcements, and the old SAE had no socket and no analytics. |
| Env files | `.env.development/.staging/.production` are committed (no secrets, makes builds reproducible). VPE ignores them; this is a conscious difference. |

## Angular → React map

| Angular | React |
| --- | --- |
| `NoctuaAnnotationsComponent` | `src/app/StandardAnnotations.tsx` (page) |
| `AnnotationFormComponent` + `NoctuaAnnotationFormService.processAnnotationFormGroup` | `features/annotations/components/AnnotationForm.tsx` + `services/annotationFormRules.ts` |
| `AnnotationsTableComponent` / `AnnotationNodeComponent` | `AnnotationsTable.tsx` / `AnnotationRow.tsx` |
| `noctua-inline-editor` + `NoctuaEditorStandardDropdownComponent` | `AnnotationEditorDropdown.tsx` |
| `CommentsSidenavComponent` | `CommentsPanel.tsx` (right drawer) |
| `AddGenesDialogComponent` | `dialogs/AddGenesDialog.tsx` |
| `CommentsDialogComponent` / `ActivityErrorsDialogComponent` | `dialogs/CommentsDialog.tsx` / `dialogs/FormErrorsDialog.tsx` |
| `noc-cam-toolbar` / `noc-cam-form` | `gocam/components/CamToolbar.tsx` / `CamDetailsForm.tsx` |
| `noc-term-autocomplete` | `search/components/Autocomplete.tsx` (VPE) |
| inline reference / with dropdowns | `annotations/components/fields/{ReferenceDropdown,WithDropdown,DatabaseField}.tsx` (VPE) |
| `BbopGraphService.graphToActivities` + `NoctuaFormConfigService.activityToAnnotation` | `annotations/services/annotationExtraction.ts` |
| `BbopGraphService` write methods | `annotations/services/annotationOperations.ts` |
| `NoctuaFormConfigService.getTermRelations/getObjectRange` + `DataUtils` | `annotations/services/shapeRules.ts` |
| `NoctuaUserService` | `features/auth` (VPE) |
| `CamService.getGenesDetails` / `NoctuaLookupService.getGenesDetails` | `lookupApiSlice.getGenesDetails` + `services/geneList.ts` |

## m3Batch operation map (old bbop call → new builder)

- `addActivity` (form save / add genes) → `buildCreateAnnotationsOperations`: one new GP, GO term,
  and (optional) root-MF individual set per evidence row, an evidence individual per fact,
  comments on every fact, a model title only when the model has none, then STORE.
- `editNode` (GP / term) → `buildEditNodeTypeOperations` (complement-aware remove-type/add-type).
- `toggleIsComplement` → `buildToggleComplementOperations`.
- `editEvidenceCode` / `editReference` / `editWith` → `buildEditEvidence*Operations` over every
  evidence individual in the annotation subgraph, plus the contributor/providedBy refresh.
- `editConnection` (relation) → `buildEditRelationOperations` (remove old fact, add the new fact
  with copied evidence and comments, and drop the now-orphaned evidence individuals).
- `addExtension` → `buildAddExtensionOperations`.
- `deleteAnnotation` (extension) → `buildDeleteExtensionOperations`.
- `deleteActivity` → `buildDeleteAnnotationOperations` (remove every subgraph individual).
- `updateAnnotationComments` → `buildReplaceCommentsOperations` (all facts in the subgraph).
- `storeCam` / `resetModel` → `buildStoreModelOperations` / reset mutation (`intention=query`).
- `saveCamAnnotations` → `buildSaveModelDetailsOperations`.

## Deliberate deviations (bugs fixed while porting)

- GP-subject start edges also accept non-GO protein complexes (ComplexPortal), so
  "complex located in X" annotations created by SAE now display.
- Each start edge yields its own row. The old code duplicated rows when one GP had two CC edges.
- A comment row's delete button deletes the comment (old code called `deleteExtension(i)`).
- "GP to Term Relation is required" validation. The old form could save orphan individuals when no
  relation applied.
- The relation column sorts by the displayed relation label, and a third header click clears the
  sort back to GP ascending.
- Multi-source references are removed value-by-value when edited.
- Comments panel boxes show which annotation (GP, relation, term) the comments belong to.
- With/from allowed DBs use VPE's list (adds CGD, dictyBase, Ensembl, TAIR), which is synced to
  `geneontology/noctua metadata/with-from-allowed-namespaces.yaml`.
- Simplified "Not Saved" bar: Reset and Save get confirm dialogs, but not the stored-vs-active
  change-stats review (SAE stores after every edit, so this state only arises from other tools).
- Several references on one evidence (`PMID:1| PMID:2`) are written as separate `source` values,
  on create and on edit, and each is linked in the table. Angular wrote one joined string and
  never linked references.
- Add More Gene(s) on a row whose relation SAE can't write (e.g. root MF `occurs in`) warns.
  Angular wrote orphan individuals and reported success.
- Evidence edits credit the editor's ORCID even when they have no group.
- Delete Annotation never removes an individual another annotation also uses.

## Steps

### Phase 1: Scaffold (VPE stack)
- [x] package.json (VPE lockfile, unused deps dropped), vite.config.ts, tsconfig*, .eslintrc.json, .prettierrc.json, .gitattributes, .gitignore
- [x] index.html, env files, public assets (logos, favicon)
- [x] npm install (same versions as VPE)

### Phase 2: Core + auth + users + search (port from VPE)
- [x] `@noctua.core`: dialog, drawer, toast, loading overlay, popover, menu, chip, textarea, SectionHeading, CommentListEditor, usePopover, constants, linker, date utils, theme, data JSON
- [x] `features/auth`, `features/users` (SplashScreen + metadata)
- [x] `features/search`: Autocomplete (+ `excludeIdspaces`, typing clears a pick), lookupApiSlice (`searchTerms`, `getGenesDetails`, `getPubmedInfo`)

### Phase 3: gocam model layer
- [x] models (cam, operations), graphServices (transform; metadata passed in, no store import; m3Batch error bodies)
- [x] camApiSlice (get / update / reset), camSlice (+ prelookup selectors carrying root types)
- [x] CamToolbar, CamDetailsForm (title/state/group/comments), ContributorChips, ToolbarLinkMenu. GroupGuardProvider was not ported: the Angular SAE had no other-group warning.

### Phase 4: annotations domain
- [x] data: annotation edge config, root nodes, evidence auto-populate, search filters, allowed DBs
- [x] services: shapeRules, annotationExtraction, annotationOperations, annotationFormRules, annotationSort, databaseIdentifiers, geneList
- [x] slice: sort (persisted under the Angular key), selected comment annotation

### Phase 5: annotations UI
- [x] AnnotationForm (GP, NOT, relation, GO term, root-term menu, evidence + ISS, extensions, comments, errors)
- [x] AnnotationsTable + AnnotationRow (sort headers, links, hover edit, extensions, date, comments, row menu)
- [x] AnnotationEditorDropdown (GP, relation, term, evidence, reference, with, add extension, add comment)
- [x] CommentsPanel, CommentsDialog, FormErrorsDialog, AddGenesDialog
- [x] Page + Layout + Toolbar + RightDrawer + not-logged-in / not-saved bars

### Phase 6: Tests
- [x] fixtures: 4 real barista-dev payloads + synthetic `saeModel.ts`; `mockBarista` (fetch stub that decodes m3Batch)
- [x] unit: extraction, operations, shape rules, form rules, sort, db identifiers, gene list, slices, graph parsing, API slice
- [x] component: form, table/row actions, editor dropdown, comments panel, add genes, cam toolbar, model details, page
- [x] e2e: Playwright with Barista + GOlr (JSONP) mocked; read-only live suite against barista-dev (`LIVE=1`)

### Phase 7: Verify + docs
- [x] lint, type-check, 175 unit/component tests, 3 e2e, 2 live; production build into the scratchpad (workbenches untouched)
- [x] independent fidelity review vs Angular; findings fixed with regression tests
- [x] browser smoke test against barista-dev and the real GOlr (read-only): real model renders, GOlr search works
- [x] CLAUDE.md, README.md
- [x] Committed on `upgrade-to-react` in chronological chunks (scaffold → core → features → page → tests → e2e → docs)
- [ ] User review; PR; `npm run build` to replace the deployed Angular build when ready to ship

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** fixed the fidelity review findings: unclassified BP targets, every title/state removed on save, multi-reference split and links, Add Genes warning, contributor without group, shared-node delete, last-type reading. 175 tests pass; lint, type-check and 3 e2e are clean.
- **Next immediate action:** the user's review; push and PR on request
- **Recent commands run:** `npx vitest run`, `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint .`, `VITE_OUTPUT_PATH=<scratch> npx vite build --mode production`
- **Uncommitted changes:** none; the React app is committed on `upgrade-to-react` (not pushed, `npm run build` not run)
- **Environment state:** `node_modules` installed from VPE's lockfile (same versions)

## Failed Approaches

| What was tried | Why it failed | Date |
| -------------- | ------------- | ---- |
| VPE's `npm run lint` setup as-is | lints the committed `workbenches/` JS and config files outside the TS project; fixed with ignorePatterns + tsconfig.node.json | 2026-10-12 |
| Tailwind v4 auto source detection | scanned the committed Angular build in `workbenches/` (CSS warning, junk classes); fixed with `source('.')` | 2026-10-12 |
| Model prelookup options without root types | the form's relation rule fell back to "enables" for a BP picked from the model (caught by e2e); options now carry root types | 2026-10-12 |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
| .plans/template.md | copied from VPE | done |
| .plans/refactor/angular-to-react.md | created | active |

## Blockers
- None currently

## Notes

- Old extraction semantics to keep:
  - **Start edges:** `enabled_by`, or `part_of`/`located_in`/`contributes_to`/`is_active_in`
    whose subject is a gene product.
  - **Activity type:** ccOnly when the start edge is GP-subject; bpOnly when a root MF has a
    causal edge; otherwise default/proteinComplex.
  - **DFS:** follows shape predicates minus causal edges, except a bpOnly root MF may follow the
    bpOnly causal edges.
  - **Root MF** (`GO:0003674`) with an mf-to-term edge (part_of, occurs_in, causally upstream ...)
    → that edge's object is the GO term. The last such edge wins.
  - **Displayed relation** is the inverse from `simpleAnnotationEdgeConfig` (enables, involved in,
    acts upstream of ..., located in, is active in, part of, contributes to).
  - **Evidence** is the first evidence on the start edge.
  - **Extensions** are GO-term outgoing edges whose predicate is extension-eligible in
    `shapes.json` for (term root types, object root types).
  - **Date** is the latest node or evidence date in the subgraph. **Comments** are the union over
    subgraph facts.
- Edits to evidence and comments fan out to every fact/evidence in the annotation subgraph (the old
  `getEvidenceNodes()` / `getPredicates()` behavior).
- Form GO term range = `getObjectRange(gpRootTypes, relation, gp-to-term)`. It stays empty until a
  GP is chosen, as in the old app.
- GP search filter: `isa_closure:"CHEBI:33695" OR isa_closure:"GO:0032991" OR NOT idspace:"GO"`.

## Summary

- **The React app:** a React 19 SAE on the VPE stack (same dependency versions, from VPE's lockfile), with the VPE folder layout. Only the `noctua-annotations` app was ported; everything the `cleanup` branch dropped is gone.
- **Minerva:** one m3Batch POST per edit via RTK Query (`camApiSlice.updateGraphModel`), built by pure operation builders in `annotations/services/annotationOperations.ts`. Every batch ends in `store`, and Minerva/Barista error bodies become toasts.
- **Verification:**
  - 175 Vitest unit/component tests, run against real barista-dev payloads and a synthetic SAE model.
  - 3 Playwright e2e tests with Barista + GOlr mocked.
  - 2 live read-only tests against barista-dev and the real GOlr.
  - lint and type-check clean; production build verified in a temp dir.
- **Not done (needs the user):** commits, and `npm run build` to replace the Angular build in `workbenches/noctua-standard-annotations/public`.

## Follow-ups to consider

- Live model refresh (VPE's barista socket) — not in the Angular SAE, so not ported.
- The "editing another group's model" warning (VPE `GroupGuardProvider`) — not in the Angular SAE.
- A stored-vs-active change review for the Not Saved bar (the Angular `openCamReviewChangesDialog` stats).

## Lessons Learned
-

## Additional Context (Claude)

- barista-dev models used for fixtures: `gomodel:6a2b236300000482` (two SAE "acts upstream of or
  within" annotations with with/from), `gomodel:6ab067da00005997` (MF + part_of extension),
  `gomodel:69b432fc00000161` (mixed GO-CAM, used for robustness).
- `workbenches/noctua-standard-annotations/public` still holds the Angular build. `npm run build`
  replaces it, so run that only when the user wants to ship.
