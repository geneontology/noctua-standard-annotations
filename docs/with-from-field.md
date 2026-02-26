# With/From Field — Architecture & Data Flow

## Overview

The "with/from" field in SAE (Standard Annotation Editor) captures supporting database identifiers for an evidence line. Each evidence row can have a with/from value in the format `DATABASE:accession`, with support for multiple entries via groups and alternatives.

### Value format

```
UniProtKB:P12345                       # single entity
MGI:MGI:123456|FB:FBgn0001234          # two alternatives (OR) in one group
GO:0008150,CHEBI:24867|EC:1.1.1.1      # two groups separated by comma
```

| Separator | Meaning |
|-----------|---------|
| `\|` (pipe) | Alternatives within one group (OR) |
| `,` (comma) | Separate groups (AND) |


## Allowed Databases

Only 21 database prefixes are accepted. Defined in [`withfrom-dbs.ts`](../src/@noctua.form/data/withfrom-dbs.ts):

| # | DB Prefix |
|---|-----------|
| 1 | AGI_LocusCode |
| 2 | EcoCyc |
| 3 | FB |
| 4 | GO |
| 5 | MGI |
| 6 | PomBase |
| 7 | PR |
| 8 | RGD |
| 9 | RNAcentral |
| 10 | SGD |
| 11 | UniProtKB |
| 12 | WB |
| 13 | Xenbase |
| 14 | ZFIN |
| 15 | CHEBI |
| 16 | ComplexPortal |
| 17 | EC |
| 18 | InterPro |
| 19 | PANTHER |
| 20 | RHEA |

This is a restricted subset of the full 207-item `withfrom.ts` list. The full list is kept for other autocomplete uses but the dropdown and validation only use the 21-item `withFromAllowedDBs`.

### Why the restriction?

The Gene Ontology consortium specifies a curated set of databases valid for the with/from column in standard annotations. The full 207-item list covers all known DB prefixes across the GO ecosystem, but only the 21 above are accepted for with/from evidence support.


## Files Involved

### Data layer (`@noctua.form`)

| File | Purpose |
|------|---------|
| [`data/withfrom-dbs.ts`](../src/@noctua.form/data/withfrom-dbs.ts) | `withFromAllowedDBs` — the 21 allowed DB prefixes |
| [`data/withfrom.ts`](../src/@noctua.form/data/withfrom.ts) | `withfrom` — the full 207-item DB prefix list (used elsewhere) |
| [`data/index.ts`](../src/@noctua.form/data/index.ts) | Barrel export — re-exports `withFromAllowedDBs` |
| [`services/annotation-form.service.ts`](../src/@noctua.form/services/annotation-form.service.ts) | Form-level validation in `getActivityFormErrors()` |

### UI layer (`@noctua.editor`)

| File | Purpose |
|------|---------|
| [`inline-with/with-dropdown/with-dropdown.component.ts`](../src/@noctua.editor/inline-with/with-dropdown/with-dropdown.component.ts) | The dropdown overlay — DB select + accession input |
| [`inline-with/with-dropdown/with-dropdown.component.html`](../src/@noctua.editor/inline-with/with-dropdown/with-dropdown.component.html) | Template — `mat-select` for DB, text input for accession |
| [`inline-with/with-dropdown/with-dropdown.component.scss`](../src/@noctua.editor/inline-with/with-dropdown/with-dropdown.component.scss) | Styles |
| [`inline-with/with-dropdown/with-dropdown-ref.ts`](../src/@noctua.editor/inline-with/with-dropdown/with-dropdown-ref.ts) | Overlay reference handle (close/dispose) |
| [`inline-with/with-dropdown/with-dropdown.tokens.ts`](../src/@noctua.editor/inline-with/with-dropdown/with-dropdown.tokens.ts) | Injection token for passing data into the overlay |
| [`inline-with/inline-with.service.ts`](../src/@noctua.editor/inline-with/inline-with.service.ts) | CDK Overlay service — creates/positions the dropdown |
| [`inline-editor/standard-dropdown/standard-dropdown.component.ts`](../src/@noctua.editor/inline-editor/standard-dropdown/standard-dropdown.component.ts) | Standard editor dropdown — handles `EditorCategory.WITH` |

### Autocomplete layer (`@noctua.autocomplete`)

| File | Purpose |
|------|---------|
| [`term-autocomplete/term-autocomplete.component.ts`](../src/@noctua.autocomplete/term-autocomplete/term-autocomplete.component.ts) | Hosts the "edit with" trigger button for WITH type |
| [`term-autocomplete/term-autocomplete.component.html`](../src/@noctua.autocomplete/term-autocomplete/term-autocomplete.component.html) | Shows the medical-file icon button when `autocompleteType === WITH` |


## Data Flow — Editing a With/From Value

```
User clicks edit icon on a WITH cell in the annotations table
  |
  v
NoctuaInlineEditorComponent.openEditorDropdown()
  --> InlineEditorService.open()
    --> Creates NoctuaEditorStandardDropdownComponent (category = WITH)
          |
          v
        standard-dropdown._displaySection(WITH)
          - Sets label = "With"
          - Sets autocompleteType = AutocompleteType.WITH
          - Populates term FormControl with current with/from value
          |
          v
        Template renders:
          <noc-term-autocomplete autocompleteType="WITH" ...>
            - Text input shows current value (e.g. "UniProtKB:P12345")
            - Medical-file icon button appears (matSuffix)
          </noc-term-autocomplete>
          |
          v
        User clicks the medical-file icon button
          --> term-autocomplete.openAddWith(event)
            --> inlineWithService.open(event.target, { data: { formControl } })
              |
              v
            CDK Overlay opens NoctuaWithDropdownComponent
              - Receives formControl via injection token
              - Parses existing value into groups/entities
              - Builds reactive form: databaseGroups[] -> entities[] -> { db, accession }
              |
              v
            WithDropdownComponent template renders:
              For each group:
                For each entity:
                  [mat-select: DB dropdown (21 options + "None")]  [text input: accession]
                  [+ add entity]  [x delete entity]
                [+ add group]
              [Cancel]  [Save]
              |
              v
            User selects DB, enters accession, clicks Save (check_circle)
              --> with-dropdown.save()
                - Validates each entity:
                  1. Skip if db=None AND accession empty
                  2. ERROR if accession present but db=None
                  3. ERROR if db selected but accession empty
                  4. Valid: both db and accession present
                - Serializes: entities joined by "|", groups joined by ","
                - Sets formControl.setValue(serializedString)
                - Closes overlay
              |
              v
            Back in standard-dropdown:
              User clicks Save (check_circle) button
                --> standard-dropdown.save()
                  --> annotationFormService.editEvidence(WITH, cam, annotationActivity, newValue)
                    --> bbopGraphService.editWith(cam, oldAnnotations, newValue)
                      --> Minerva request to update evidence with/from
                  --> Toast "With successfully updated."
                  --> camService.getCam() to refresh
                  --> Dropdown closes
```


## Validation

### 1. WithDropdownComponent.save() — UI-level validation

Runs when the user clicks Save inside the DB dropdown overlay.

| Rule | Condition | Result |
|------|-----------|--------|
| Skip empty | `db === 'None'` AND accession blank | Entry ignored |
| Missing DB | accession present AND `db === 'None'` | Error: "Please select a database for the accession value ..." |
| Missing accession | `db !== 'None'` AND accession blank | Error: "Accession value is required for database ..." |
| Valid | `db !== 'None'` AND accession present | Serialized as `DB:accession` |

Errors are shown in a dialog via `noctuaFormDialogService.openActivityErrorsDialog(errors)`.

### 2. annotation-form.service.ts — Form-level validation

Runs in `getActivityFormErrors()` on every form change. Validates the serialized string.

```typescript
// Case-insensitive DB prefix check
const allowedLowerCase = new Set(withFromAllowedDBs.map(db => db.toLowerCase()));

// For each entity in the with/from value:
if (!db || !accession) {
  // Error: "Use DB:accession format for with/from"
}
if (!allowedLowerCase.has(db.toLowerCase())) {
  // Error: "X is not an allowed database for with/from"
}
```

The DB prefix check is **case-insensitive** — `CheBI`, `chebi`, `CHEBI` all match `CHEBI` in the allowed list. This matches the VPE behavior.

### What is NOT validated

- Accession format is not checked (any non-empty string passes)
- No server-side round-trip validation at edit time
- No check that the DB:accession actually exists in the target database


## Comparison with VPE (Visual Pathway Editor)

The SAE with/from implementation was ported from the VPE. Key differences:

| Aspect | VPE | SAE |
|--------|-----|-----|
| `withFromAllowedDBs` | Identical 21-item list | Identical 21-item list |
| `DataUtils.validateDatabaseIdentifiers()` | Present — standalone validation function | Not present — validation is inline in `getActivityFormErrors()` |
| `DataUtils.correctDatabaseIdentifierCase()` | Present — normalizes `CheBI` to `CHEBI` before save | **Not yet implemented** |
| `evidence.enableWithFromSubmit()` | Present — called during form submission | Not present — validation happens in `getActivityFormErrors()` instead |
| `evidence-form.populateEvidence()` | Applies case correction + whitespace removal | Not present |
| WithDropdown UI | Identical pattern | Identical pattern |

### Missing from SAE (potential follow-up)

1. **Case correction on save** — The VPE normalizes `CheBI` to `CHEBI` before persisting. The SAE currently saves whatever casing the user entered or the dropdown produced. Since the dropdown sets the DB value directly from `withFromAllowedDBs`, new entries from the dropdown will have correct casing, but values edited via the text input or pre-existing values won't be corrected.


## How the Overlay System Works

The with-dropdown uses Angular CDK Overlay (not a MatDialog):

1. `InlineWithService.open(elementRef, config)` is called with the trigger element
2. Creates an `OverlayRef` with:
   - Backdrop (dark, clicking closes the overlay)
   - Position strategy: connected to trigger element, bottom-aligned
   - Block scroll strategy
3. Creates a `PortalInjector` with:
   - `WithDropdownOverlayRef` — handle to close the overlay
   - `withDropdownData` — injection token carrying `{ formControl }`
4. Attaches `NoctuaWithDropdownComponent` via `ComponentPortal`
5. The component reads `formControl` from injected data, parses its value, builds the form
6. On save, sets `formControl.setValue(serialized)` and calls `dialogRef.close()`

This is the same pattern used by `InlineReferenceService` for the reference DB dropdown.
