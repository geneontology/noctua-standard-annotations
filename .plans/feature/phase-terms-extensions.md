# Task: Allow biological phase terms in annotation extensions

**Status:** ACTIVE
**Issue:** geneontology/noctua#1040
**Branch:** issue-noctua-1040-phase-terms

## Goal
Allow biological phase terms (GO:0044848 descendants) to be used in SAE annotation extensions despite being marked `gocheck_do_not_annotate`. Phase terms should only be selectable in extension fields with the appropriate relations (`happens_during`, `existence_overlaps`, `existence_starts_and_ends_during`), not in the primary GO term field.

## Context
- **Related files:**
  - `src/@noctua.form/services/lookup.service.ts` — GOLr response mapping, `notAnnotatable` flag, `termPreLookup`
  - `src/@noctua.form/data/config/shape-definition.ts` — extension configs per node type (lines 282-296, 466-502)
  - `src/@noctua.form/data/config/entity-definition.ts` — `GoBiologicalPhase` category (GO:0044848)
  - `src/@noctua.form/data/config/noctua-form-config.ts` — relation definitions (happens_during, existence_overlaps, etc.)
  - `src/@noctua.form/models/annotation-activity.ts` — `AnnotationExtension` model
  - `src/@noctua.form/data/config/shape-utils.ts` — GOLr query param builders
- **Triggered by:** geneontology/noctua#1040 — curators cannot use phase terms for `happens_during` extensions

## Current State (all changes in `lookup.service.ts`)

### What's been done
1. **Import:** Added `GoBiologicalPhase` from `entity-definition.ts`
2. **`search()` → `termLookup()` → `_lookupMap()` pipeline:** Pass `categories` through the full chain so `_lookupMap` knows the search context
3. **`_lookupMap()` (line ~525):** Added `allowNotAnnotatable` — when categories include `GoBiologicalPhase.category` (GO:0044848), sets `notAnnotatable: true` for all results, bypassing `gocheck_do_not_annotate` filtering. This fixes type-ahead search.
4. **`termPreLookup()` (line ~119):** Added same `allowNotAnnotatable` pattern. Checks if categories include `GoBiologicalPhase.category`. Per-result, also checks if the term is a phase term (`isPhase` via rootTypes). Sets `notAnnotatable: allowNotAnnotatable || !isPhase` — phase terms are only enabled when the field allows phase. Filter is unchanged (rootTypes matching).

### What works
- Type-ahead search in `happens_during` extension: phase terms appear and are annotatable
- Pre-lookup (on-focus) in `happens_during` extension: phase terms marked annotatable when categories include GoBiologicalPhase
- Non-phase terms unaffected — `notAnnotatable` defaults to `true` for non-phase terms in pre-lookup

## Steps

### Phase 1: Implement phase term exception in search ✅
- [x] Pass `categories` from `search()` → `termLookup()` → `_lookupMap()`
- [x] In `_lookupMap()`, check if categories include `GO:0044848` (biological phase)
- [x] If so, set `notAnnotatable: true` for all results (bypasses do_not_annotate filter)
- [x] Build succeeds with no errors

### Phase 2: Fix prelookup for phase terms ✅
- [x] In `termPreLookup()`, add `allowNotAnnotatable` check (same pattern as `_lookupMap`)
- [x] Per-result `isPhase` check via rootTypes to set `notAnnotatable: allowNotAnnotatable || !isPhase`
- [x] Filter unchanged — still uses rootTypes matching against categories

### Phase 3: Verify and test
- [ ] Test that phase terms appear in `happens_during` extension prelookup on focus
- [ ] Test that phase terms appear and are selectable in `happens_during` extension autocomplete (type-ahead)
- [ ] Test that phase terms remain blocked in the primary GO term field
- [ ] Test that `existence_overlaps` and `existence_starts_and_ends_during` extensions also work
- [ ] Verify non-phase extension relations (e.g. has_input) still block do_not_annotate terms

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** Fixed `termPreLookup` notAnnotatable logic
- **Next immediate action:** Test phase terms in extension fields
- **Recent commands run:**
  - `git diff HEAD~1 -- src/` to verify all changes
- **Uncommitted changes:** `termPreLookup` notAnnotatable fix (committed changes include `_lookupMap` fix and categories passthrough)
- **Environment state:** On branch issue-noctua-1040-phase-terms

## Failed Approaches

| What was tried | Why it failed | Date |
| -------------- | ------------- | ---- |
| Replace rootTypes filter with node.category matching in termPreLookup | User corrected: don't touch the filter, just fix notAnnotatable | 2026-03-17 |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
| `src/@noctua.form/services/lookup.service.ts` | Added GoBiologicalPhase import, categories passthrough, `_lookupMap` allowNotAnnotatable, `termPreLookup` allowNotAnnotatable | Done |

## Blockers
- None currently

## Notes
- The `notAnnotatable` flag has inverted-sounding logic: `notAnnotatable: !item.subset?.includes('gocheck_do_not_annotate')` — so `true` = annotatable, `false` = do_not_annotate.
- `GoBiologicalPhase` (GO:0044848) is already a defined category in `entity-definition.ts` and used in shape-definition.ts for extension configurations
- `happens_during` (RO:0002092) in shapes.json explicitly lists `GO:0044848` as an object — so `getObjectRange` returns `GoBiologicalPhase` in categories, triggering the `allowNotAnnotatable` bypass
- `existence_overlaps` (RO:0002490) and `existence_starts_and_ends_during` (RO:0002491) in shapes.json only list `GO:0008150` (BP) as object — `getObjectRange` does NOT return `GoBiologicalPhase`, so the `allowNotAnnotatable` bypass does not trigger for these. May need shapes.json update if phase terms should also be selectable there.
