# Task: Allow biological phase terms in annotation extensions

**Status:** ACTIVE
**Issue:** geneontology/noctua#1040
**Branch:** issue-noctua-1040-phase-terms

## Goal
Allow biological phase terms (GO:0044848 descendants) to be used in SAE annotation extensions despite being marked `gocheck_do_not_annotate`. Phase terms should only be selectable in extension fields with the appropriate relations (`happens_during`, `existence_overlaps`, `existence_starts_and_ends_during`), not in the primary GO term field.

## Context
- **Related files:**
  - `src/@noctua.form/services/lookup.service.ts` — GOLr response mapping, `notAnnotatable` flag (line ~542)
  - `src/@noctua.form/data/config/shape-definition.ts` — extension configs per node type (lines 282-296, 466-502)
  - `src/@noctua.form/data/config/entity-definition.ts` — `GoBiologicalPhase` category (GO:0044848)
  - `src/@noctua.form/data/config/noctua-form-config.ts` — relation definitions (happens_during, existence_overlaps, etc.)
  - `src/@noctua.form/models/annotation-activity.ts` — `AnnotationExtension` model
  - `src/@noctua.form/data/config/shape-utils.ts` — GOLr query param builders
  - `src/@noctua.editor/inline-reference-editor/` — term autocomplete
- **Triggered by:** geneontology/noctua#1040 — curators cannot use phase terms for `happens_during` extensions

## Current State
- What works now: Extension fields exist for `happens_during` (BP), `existence_overlaps` (CC), `existence_starts_and_ends_during` (CC). The `GoBiologicalPhase` category (GO:0044848) is already defined and used in shape-definition.ts for these extensions.
- What's broken: Phase terms are returned by GOLr but marked `notAnnotatable: false` because they belong to `gocheck_do_not_annotate` subset. The UI likely disables or hides these terms.

## Steps

### Phase 1: Implement phase term exception
- [x] Pass `categories` from `search()` → `termLookup()` → `_lookupMap()`
- [x] In `_lookupMap()`, check if categories include `GO:0044848` (biological phase)
- [x] If so, set `notAnnotatable: true` for all results (bypasses do_not_annotate filter)
- [x] Build succeeds with no errors

### Phase 2: Verify and test
- [ ] Test that phase terms appear and are selectable in `happens_during` extension autocomplete
- [ ] Test that phase terms remain blocked in the primary GO term field
- [ ] Test that `existence_overlaps` and `existence_starts_and_ends_during` extensions also work
- [ ] Verify non-phase extension relations (e.g. has_input) still block do_not_annotate terms

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** Created branch and plan
- **Next immediate action:** Trace how `notAnnotatable` is used in the UI
- **Recent commands run:**
  - `git checkout -b issue-noctua-1040-phase-terms`
- **Uncommitted changes:** None
- **Environment state:** On branch issue-noctua-1040-phase-terms

## Failed Approaches

| What was tried | Why it failed | Date |
| -------------- | ------------- | ---- |
|                |               |      |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
|      |        |        |

## Blockers
- None currently

## Notes
- The `notAnnotatable` flag has inverted-sounding logic: `notAnnotatable: !item.subset?.includes('gocheck_do_not_annotate')` — so `true` = annotatable, `false` = do_not_annotate. This is confusing but confirmed by reading the code.
- `GoBiologicalPhase` (GO:0044848) is already a defined category in `entity-definition.ts` and already used in shape-definition.ts for extension configurations
- The simplest fix may be: when lookup categories include GO:0044848, skip the do_not_annotate check for terms in that closure. This scopes the exception precisely to extension lookups that explicitly request phase terms.

## Additional Context (Claude)
The key insight is that `GoBiologicalPhase` is already configured as an allowed category for the relevant extensions. The only problem is the `notAnnotatable` flag filtering them out. Since the lookup categories already tell us what context we're searching in, we can use that to selectively allow phase terms through.
