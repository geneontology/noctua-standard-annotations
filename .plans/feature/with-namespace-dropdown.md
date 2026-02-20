# Task: Add restricted namespace dropdown to SAE "with" field (issue #76)

**Status:** ACTIVE
**Issue:** [#76](https://github.com/geneontology/noctua-standard-annotations/issues/76)
**Branch:** issue-76-with-dropdown

## Goal

Replace the free-text autocomplete on the SAE "with/from" field with a structured dropdown UI that restricts DB namespace selection to the ~20 approved databases only — matching the VPE's `NoctuaWithDropdownComponent` behaviour.

## Context

- **Related files:**
  - `src/@noctua.form/data/withfrom.ts` — current full 207-item autocomplete list (keep, used elsewhere)
  - `src/@noctua.form/data/index.ts` — barrel export for `@geneontology/noctua-form-base`
  - `src/@noctua.editor/inline-with/with-dropdown/with-dropdown.component.ts` — outdated
  - `src/@noctua.editor/inline-with/with-dropdown/with-dropdown.component.html` — outdated
  - `src/@noctua.editor/inline-with/with-dropdown/with-dropdown.component.scss` — minor fix
  - `src/@noctua.editor/inline-editor/standard-dropdown/standard-dropdown.component.ts` — key change
  - `src/@noctua.editor/inline-editor/standard-dropdown/standard-dropdown.component.html` — key change
- **Reference implementation:** `C:\work\go\noctua-visual-pathway-editor\src\@noctua.editor\inline-with\`
- **Triggered by:** [geneontology/noctua-standard-annotations#76](https://github.com/geneontology/noctua-standard-annotations/issues/76)

## Current State

- **What works now:**
  - `NoctuaWithDropdownComponent` exists in SAE but uses the old `companies`/`projects` pattern
  - `standard-dropdown.component.ts` handles `EditorCategory.WITH` via a plain `noc-term-autocomplete` text field
  - Saving with/from value works via `annotationFormService.editEvidence()`

- **What's broken/missing:**
  - `WithDropdownComponent` is never opened when editing WITH in SAE — standard-dropdown shows a text field instead
  - `WithDropdownComponent` in SAE uses outdated free-text structure (old `companies`/`projects` FormArrays, `matAutocomplete`, `CdkDragDrop`)
  - Constructor parses existing with-from values but never populates the form (`setCompanies()` is commented out)
  - `withFromAllowedDBs` constant (20 approved DBs) does not exist in SAE's `@noctua.form` — only the full 207-item `withfrom` list is present

## Steps

### Phase 1: Add `withFromAllowedDBs` to the form library

- [x] Create `src/@noctua.form/data/withfrom-dbs.ts` with the 20-item `withFromAllowedDBs` array
- [x] Export `withFromAllowedDBs` from `src/@noctua.form/data/index.ts`

### Phase 2: Update `WithDropdownComponent` to match VPE

- [x] Replace `with-dropdown.component.ts` — use `databaseGroups`/`entities` FormArrays, import `withFromAllowedDBs`, proper parse/validate/serialize logic, remove `CdkDragDrop`/`withfrom`/`NoctuaLookupService`
- [x] Replace `with-dropdown.component.html` — `mat-select` for DB namespace + accession input, add/delete group/entity buttons; `$any()` casts to satisfy template type checker
- [x] Fix `with-dropdown.component.scss` — correct typo `noc-form-secion` → `noc-form-section`, update `deep-width` to `450px`

### Phase 3: Wire standard-dropdown to open WithDropdown for WITH category

- [x] Modify `standard-dropdown.component.ts`:
  - Import `InlineWithService`, `FormControl`, `take`
  - Add `withFormControl: FormControl` field
  - In `_displaySection(WITH)`: set `displaySection.with = true`, initialise `withFormControl` with current value, subscribe to `valueChanges` to auto-call `editEvidence()` + toast + close
  - Add `openAddWith(event)` method that calls `inlineWithService.open()`
  - Remove `EditorCategory.WITH` branch from `save()` (handled by subscription)
- [x] Modify `standard-dropdown.component.html`:
  - Add `@if (displaySection.with)` block showing current value + playlist_add button → `openAddWith()`
  - Hide the save (check_circle) button when `displaySection.with` is true

### Phase 3.5: Add WithDropdown trigger inside `noc-term-autocomplete` (same pattern as reference)

- [x] Modify `term-autocomplete.component.ts`:
  - Import `InlineWithService`
  - Inject `InlineWithService` in constructor
  - Add `openAddWith(event)` method (mirrors `openAddReference`)
- [x] Modify `term-autocomplete.component.html`:
  - Add `@if (autocompleteType === AutocompleteType.WITH)` button as matSuffix (mirrors reference button)

### Phase 4: Verify

- [ ] Smoke-test: open an annotation, click edit on a WITH cell, confirm DB dropdown appears with ~20 options
- [ ] Test save round-trip: select DB, enter accession, click Ok → value updates in table
- [ ] Test cancel: click Cancel / backdrop → value unchanged

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** Phase 3.5 — wired WithDropdown trigger into annotation form
- **Next immediate action:** Smoke-test in browser (npm start)
- **Recent commands run:** none
- **Uncommitted changes:** 9 files modified/created (not yet committed)
- **Environment state:** branch `issue-76-with-dropdown`, clean except for implementation changes

## Failed Approaches

| What was tried | Why it failed | Date |
| -------------- | ------------- | ---- |
|                |               |      |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
| `src/@noctua.form/data/withfrom-dbs.ts` | Create | ✓ done |
| `src/@noctua.form/data/index.ts` | Modify — add export | ✓ done |
| `src/@noctua.editor/inline-with/with-dropdown/with-dropdown.component.ts` | Replace | ✓ done |
| `src/@noctua.editor/inline-with/with-dropdown/with-dropdown.component.html` | Replace | ✓ done |
| `src/@noctua.editor/inline-with/with-dropdown/with-dropdown.component.scss` | Modify | ✓ done |
| `src/@noctua.editor/inline-editor/standard-dropdown/standard-dropdown.component.ts` | Modify | ✓ done |
| `src/@noctua.editor/inline-editor/standard-dropdown/standard-dropdown.component.html` | Modify | ✓ done |
| `src/@noctua.autocomplete/term-autocomplete/term-autocomplete.component.ts` | Modify | ✓ done |
| `src/@noctua.autocomplete/term-autocomplete/term-autocomplete.component.html` | Modify | ✓ done |

## Blockers

- None currently

## Notes

- `@geneontology/noctua-form-base` is a tsconfig path alias for `src/@noctua.form/` — changes there are immediately available to the rest of the app
- The `WithDropdownComponent` is loaded dynamically via CDK overlay (not declared in templates), so no module changes are needed
- The standard-dropdown auto-save pattern (subscribe to `withFormControl.valueChanges`, call `editEvidence()`) means the check_circle save button is **not needed** for the WITH case — hide it to avoid confusion
- Keep `withfrom.ts` (207-item list) untouched — it may be used elsewhere for other autocompletes
- VPE reference files to port from: `C:\work\go\noctua-visual-pathway-editor\src\@noctua.editor\inline-with\`

## Additional Context

### Data flow after the fix

```text
User clicks edit icon on WITH cell
  → NoctuaInlineEditorComponent.openEditorDropdown()
    → InlineEditorService.open() → NoctuaEditorStandardDropdownComponent (category=WITH)
      → _displaySection(WITH): displaySection.with=true, withFormControl initialised
        → withFormControl.valueChanges subscribed → auto-save on change
      → HTML shows current value + "Edit With/From" button
        → openAddWith(event) → InlineWithService.open() → NoctuaWithDropdownComponent overlay
          → user selects DB from mat-select (20 options), enters accession
          → clicks Ok → formControl.setValue(serialized) → overlay closes
        → withFormControl.valueChanges fires → editEvidence() → toast → standard-dropdown closes
```

### Why not modify `inline-editor.component.ts` instead?

Keeping the WITH save logic in `standard-dropdown.component.ts` avoids injecting `NoctuaAnnotationFormService`, `CamService`, and `NoctuaFormDialogService` into the generic `inline-editor.component.ts`, which should stay lean. All save-path services are already present in `standard-dropdown`.
