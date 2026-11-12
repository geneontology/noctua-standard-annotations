# Task: Delete multiple annotations at once (checkboxes, max 13)

**Status:** COMPLETE
**Issue:** https://github.com/geneontology/noctua-standard-annotations/issues/96
**Branch:** issue-96-bulk-delete (to create from `dev`)

## Goal

A curator ticks several rows and deletes them with one confirmation and one Minerva
batch (one store), up to 13 at a time, as VPE does for a multi-node selection.

## Context

- **SAE today:** row ⋮ → Delete → `ConfirmDialog` in `AnnotationRow.tsx` →
  `useAnnotationActions.deleteAnnotation` → `getDeletableNodeUids` + `leavesModelEmpty`
  (`annotationExtraction.ts`) → `buildDeleteAnnotationOperations` (`annotationOperations.ts`):
  remove the start fact, then the annotation's individuals, then `store`.
- **VPE reference (read-only, don't edit):** `noctua-visual-pathway-editor`
  - `src/features/pathway/data/selectionLimits.ts`: `MAX_BULK_NODES = 13`, one constant
  - `GraphToolbar.tsx`: selection pill "N selected" + Copy / Delete; red and disabled over
    the cap, tooltip "Select 13 or fewer to delete"
  - `PathwayViewer.handleDeleteSelection`: over the cap → warning toast (the Delete key
    bypasses the disabled button); otherwise `checkGroup(() => requestDelete(...))`
  - `useRegionDelete`: request → confirm dialog → `buildDeleteRegionOperations` (all
    removals + one store, deduped with a `seen` set) → toast "Deleted N nodes"
- **Group guard:** `useGroupGuard()` (`gocam/components/GroupGuardProvider.tsx`) is only
  used by the model toolbar today; single row delete doesn't use it. Bulk delete will
  (as VPE does). The issue text says "same guard as single delete"; fix that wording.

## Design

### Pure services (where the risk is)

- `annotationExtraction.ts`
  - `getDeletableNodeUids(selected[], annotations)`: individuals of the selected
    annotations that no **unselected** annotation uses, each once. The single delete
    calls it with `[annotation]`. (Today it subtracts every other annotation's nodes;
    with a selection, nodes shared only *among* selected rows must go too.)
  - `leavesModelEmpty(model, selected[], nodeUids)`: same, for a list of start edges.
- `annotationOperations.ts`
  - `buildDeleteAnnotationsOperations(selected[], nodeUids, modelId)`: every selected
    start edge first, then each individual once, then one `store`. The single delete
    becomes a call with one annotation.
  - Minerva rules to respect (CLAUDE.md): a removed fact takes its evidence (never remove
    evidence again); removing an individual takes its facts, so all start edges go
    **before** any individual; nothing is removed twice; no rollback.
  - Check: whether `annotation.nodes` can include evidence individuals (must not).

### State

- `annotations` slice: `selectedIds: string[]` with `toggleSelected(uid)`,
  `setSelected(uids)`, `clearSelected()`.
- `selectSelectedAnnotations`: selected ids ∩ current annotations, so rows that a
  refresh removed (deleted here or by another user) drop out by themselves.
- Clear on a different model id, and after a bulk delete. Keep the selection through
  other edits (an annotation's uid is its start fact, stable unless the edit recreates it).
- `annotations/data/selectionLimits.ts`: `MAX_BULK_DELETE = 13`.

### UI (logged-in editors only)

- `annotationColumns.ts`: a narrow `select` column first.
- `AnnotationsTable.tsx`: header checkbox (checked / indeterminate) selects or clears
  every row shown.
- `AnnotationRow.tsx`: row checkbox (`aria-label="Select annotation <gp> <term>"`), a
  tint on selected rows.
- `components/SelectionBar.tsx` (new), above the table while anything is selected:
  "N selected", **Delete** (red) and **Clear**. Over 13: red bar, "N selected — max 13",
  Delete disabled with tooltip "Select 13 or fewer to delete".
- `components/dialogs/DeleteAnnotationsDialog.tsx` (new), on `ConfirmDialog`:
  "Delete N annotations?" with one line per annotation (gene product · relation · term),
  scrolling past ~8.
- `useAnnotationActions.deleteAnnotations(selected)`: refuse over the cap (toast, for any
  path that skips the disabled button); block when `leavesModelEmpty` (existing message);
  else `run(…, 'Deleted N annotations.')`; on success clear the selection.
- The bar's Delete runs `checkGroup(() => openDialog())`.

## Steps

### Phase 1: services + tests
- [x] Generalize `getDeletableNodeUids` / `leavesModelEmpty` to a selection; single delete unchanged in behaviour
- [x] `buildDeleteAnnotationsOperations`; single-delete builder delegates to it
- [x] Tests: SAE model (own individuals); shared individuals (one GP, two CC rows; one MF
      with two GPs) — delete one vs both; selecting all → empty; batch order and no
      duplicate removals; one `store`

### Phase 2: state
- [x] Slice actions, `selectSelectedAnnotations`, clear on model id change
- [x] `MAX_BULK_DELETE`
- [x] Slice tests (toggle, select all, prune after refresh, clear on new model)

### Phase 3: UI
- [x] Select column, row and header checkboxes (hidden when logged out)
- [x] `SelectionBar` (count, over-cap state, Clear)
- [x] `DeleteAnnotationsDialog` + `deleteAnnotations` action + group guard
- [x] Component tests with `mockBarista`: exact batch for 3 rows; 14 selected → Delete
      disabled with the message (build a 14-row model with the `saeModel` helpers);
      all selected → blocked; logged out → no checkboxes

### Phase 4: e2e + wrap-up
- [x] `e2e/edit.spec.ts`: select 3 of the seeded rows → delete → table and
      `minerva.factSummaries()`; `FakeMinerva` fails a double removal, so a bad batch shows
- [x] e2e: select all → blocked message, nothing sent
- [ ] Fix the group-guard line in issue #96 (ask first)
- [x] type-check, lint, vitest, playwright

## Recovery Checkpoint

- **Last completed action:** all phases done; type-check (app + e2e), lint, vitest 292,
  playwright 36 (+7 skipped) green
- ✅ TASK COMPLETE — merged into `dev` (issue guard line still to fix, ask first)

## Found while implementing

- `GroupGuardProvider` wrapped only `CamToolbar`, so the table couldn't use it (the
  page crashed in e2e). It now wraps the whole `Layout`; `renderWithProviders` wraps
  it too, as the app does.
- A refresh prunes the selection (`setModel` → keep ids whose start fact still
  exists), so the action doesn't clear it: a single row delete keeps other ticks.
- The SAE fixture keeps an unconnected chemical, so deleting all 9 of its rows is
  allowed; the "empty model" block is tested on an all-annotation model.

## Notes

- Limit 13, the same as VPE (first 21, then changed to match).
- Not in scope: Delete-key shortcut (VPE has one), bulk copy, selection across models.
- The e2e world has 4 annotations; test the cap in unit tests, not e2e.
