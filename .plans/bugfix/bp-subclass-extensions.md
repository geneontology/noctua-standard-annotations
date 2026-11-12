# Task: Show and add extensions whose shape rule belongs to a GO term subclass

**Status:** COMPLETE
**Issue:** https://github.com/geneontology/noctua-standard-annotations/issues/85
**Branch:** issue-85-bp-extensions

## Goal

The table shows a BP's one-hop extensions like `results in development of`, and its
Add Extension menu offers them for the right BP terms, as the create form already does.

## Context

- **Related files:** `annotations/services/shapeRules.ts`, `annotations/services/annotationExtraction.ts`,
  `annotations/components/AnnotationEditorDropdown.tsx`, `search/slices/lookupApiSlice.ts`
- **Triggered by:** #85 (example `gomodel:MGI_MGI_102780`)

## Root cause

`shapes.json` keys some extension rules on a subclass, not the root:
`GO:0048856 → results in development of`, `GO:0030154 → results in acquisition of features of`,
`GO:0040011 → results in movement of`, `GO:0022607 → results in assembly of`, … (23 under
`GO:0008150`, 5 under `GO:0003674`, e.g. `GO:0005215` transporter activity). Rules carry the
root in `root_subject`.

- The **create form** gets terms from GOlr, whose `isa_closure` has every ancestor, so it works.
- The **table** reads terms from Minerva, whose `root-type` is only the top category
  (`GO:0008150`; a CL cell gets `UBERON:0001062`). So `getTermRelations(goTerm.rootTypes, …)`
  never matched these rules: the extension was dropped on read and missing from Add Extension.

## Changes

- `shapeRules.getExtensionPredicatesForRoots(rootTypes)`: extension-eligible predicates of
  every rule whose `root_subject || subject` is one of the root types. No object check (CL
  targets only have `UBERON:0001062`).
- `getExtensions` keeps an edge when the old pair check allows it **or** its predicate is in
  that set.
- `lookupApi.getTermClosure(id)`: GOlr `isa_closure` for one class.
- `AnnotationEditorDropdown`: for Add Extension, looks up the GO term's closure and uses
  root types ∪ closure for the relation choices and the term range. Root rules show while it loads.

## Tests

- `shapeRules.test.ts`: subclass rules need the ancestry; `getExtensionPredicatesForRoots`
  for BP / MF roots, excluded predicates stay out.
- `annotationExtraction.test.ts` + new real fixture `raw/models/bp-one-hop-extensions.json`
  (trimmed from production `gomodel:MGI_MGI_102780`): three BP rows with
  `results in development of` / `acquisition of features of` / `movement of`. Fails without the fix.
- `AnnotationEditorDropdown.test.tsx`: closure looked up for Add Extension only; relation
  offered once known, not before; saves an `RO:0002296` fact. 3 of 4 fail without the fix.
- e2e `edit.spec.ts`: the fake Minerva now takes `CatalogClass.rootTypes` (Minerva's
  root types, apart from the GOlr closure); `subclassExtensionModel()` shows the existing
  extension and adds another through the menu.

## Recovery Checkpoint

- **Last completed action:** all checks green (type-check, lint, vitest 280, e2e 34 + 7 skipped)
- ✅ TASK COMPLETE — merged into `dev`

## Notes

- Out of scope: a "two-hop" extension, e.g. `regulation of neuron differentiation` →
  `regulates` → `neuron differentiation` → `results in acquisition of features of` →
  `sensory neuron` (also in `MGI_MGI_102780`). Only the GO term's own facts are extensions.
- Pre-existing: several touched files already failed `prettier --check` at HEAD; they were
  left as they were to keep the diff to the issue.
