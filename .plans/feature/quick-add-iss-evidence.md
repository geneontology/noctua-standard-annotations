# Task: Quick Add ISS Evidence to SAE

**Status:** ACTIVE
**Issue:** #78
**Branch:** issue-78-quick-add-iss

## Goal

Add a `more_vert` menu button on each evidence row in the annotation form with an "Add ISS Evidence" option that fills in ECO:0000250 + GO_REF:0000024.

## Context

- **Related files:**
  - `src/@noctua.form/noctua-form-config.ts` — evidence auto-populate config (has `nd`, needs `iss`)
  - `src/app/main/apps/noctua-annotations/forms/annotation-form/annotation-form.component.html` — annotation form template (evidence row at line 72-83)
  - `src/app/main/apps/noctua-annotations/forms/annotation-form/annotation-form.component.ts` — annotation form component
- **Triggered by:** [Issue #78](https://github.com/geneontology/noctua-standard-annotations/issues/78)
- **VPE reference:** VPE has this in `entity-form.component.ts:261`

## Current State

- The evidence row (line 72-83 in template) has 3 autocomplete fields + an empty `<div fxFlex="40px"></div>` placeholder
- The form works with in-memory data (patchValue), no API calls needed — same as VPE
- `_addRootTerm()` (line 170) already shows the pattern: patch evidenceCode + reference from `noctuaFormConfig.evidenceAutoPopulate`

## Steps

### Phase 1: Config

- [ ] Add `iss` to `evidenceAutoPopulate` in `src/@noctua.form/noctua-form-config.ts` (line ~491)
  - `evidence.id`: `ECO:0000250`, `evidence.label`: `sequence similarity evidence used in manual assertion`
  - `reference`: `GO_REF:0000024`

### Phase 2: UI

- [ ] Replace the empty `<div fxFlex="40px"></div>` on the evidence row (line 81) with a `more_vert` menu button + mat-menu containing "Add ISS Evidence"
- [ ] Add `addEvidenceISS()` method to `annotation-form.component.ts` that patches evidenceCode and reference using `noctuaFormConfig.evidenceAutoPopulate.iss` (same pattern as `_addRootTerm`)

### Phase 3: Build

- [ ] Run `npm run build`

## Recovery Checkpoint

> **Last completed action:** Branch created: `issue-78-quick-add-iss`
> **Next immediate action:** Add ISS config to noctua-form-config.ts
> **Uncommitted changes:** None

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
| `src/@noctua.form/noctua-form-config.ts` | Add ISS to evidenceAutoPopulate | pending |
| `src/app/.../annotation-form/annotation-form.component.html` | Replace empty div with menu button | pending |
| `src/app/.../annotation-form/annotation-form.component.ts` | Add addEvidenceISS() method | pending |

## Blockers

- None

## Notes

- This is form-level (in-memory patchValue), no service/API changes needed.
