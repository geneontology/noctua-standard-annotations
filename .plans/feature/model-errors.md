# Task: SAE model errors — anything the table doesn't show is an error

**Status:** ACTIVE
**Issue:** #98
**Branch:** issue-98-model-errors

## Goal
Like the VPE's Validation Errors chip + panel: the cam toolbar shows "N Errors Found", and a
right-drawer panel lists what the model holds that the SAE table doesn't show.

## Context
- VPE reference (read only): `noctua-visual-pathway-editor/src/features/gocam/services/violationService.ts`
  (`computeOrphans` / `splitOrphanedNodes`) and `components/CamErrors.tsx`.
- Errors are judged by **SAE**, not VPE: "shown" = what a row shows.

## Design
- `annotations/services/modelErrors.ts` — `findModelErrors(model, annotations)`.
  - Shown nodes: each row's `rootNode`, `gp`, `goTerm`, extension terms.
  - Shown edges: each row's `startEdge`, `termEdge`, extension edges.
  - Hidden nodes exclude evidence individuals (referenced as evidence, or rooted at `ECO:0000000`).
  - Hidden nodes split into standalone (no hidden fact) and relation nodes (used by a hidden fact), as VPE.
- `selectModelErrors` (annotationsSlice), `RightPanelTab.MODEL_ERRORS`, `ModelErrorsPanel`,
  chip in `CamToolbar` after the title (red with count / green at 0).
- No ShEx section: SAE reads without the reasoner, so there are no `validation-results`.

## Steps
- [x] Service + fixture checks (sae: `water`; mf-with-bp: nested BP; gocam-mixed: causal MF→MF, chemicals)
- [x] Panel, drawer tab, toolbar chip
- [x] Unit tests (service, panel, toolbar); full suite, lint, type-check green
- [ ] Curator review of wording / whether hidden nested extensions should count
- [ ] Optional: e2e spec; ShEx violations if SAE ever reads with the reasoner

## Recovery Checkpoint
- **Last completed action:** committed on `issue-98-model-errors` (#98)
- **Next immediate action:** push; merge into dev when asked
- **Uncommitted changes:** only the rebuilt workbench deploy (not part of #98)
