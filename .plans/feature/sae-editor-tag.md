# Task: Tag models made in SAE with `annotation-editor-sae = true`

**Status:** ACTIVE
**Issue:** #97 (Minerva side: geneontology/minerva#612; landing page: geneontology/noctua-landing-page#140)
**Branch:** issue-97-sae-tag

## Goal
Models made in SAE carry exactly one `annotation-editor-sae` model annotation, value `true`
typed `xsd:boolean`. SAE reads it back.

## Context
- Models are created by the landing page (`model add`), not SAE. The landing page will tag at
  creation (prompt handed to that session; not changed from here).
- Minerva rejects bare non-shorthand keys ("Relative IRIs are not allowed"), so until minerva#612
  adds a shorthand, clients write the full IRI. Minerva's `getShorthand(String)` also matches a
  key by its resolved IRI, so full-IRI writes keep working after the shorthand ships, stored data
  is unchanged, and only the key `model get` returns flips from the IRI to the shorthand.
- `conforms-to-gpad` is expected to be removed later; not touched here.

## Steps
- [x] Ask Jim for the IRI on minerva#612 (posted 2026-11-13)
- [x] `AnnotationKey` gets the shorthand and IRI; `GraphModel.annotationEditorSAE` read from either
- [x] SAE backfill: the first create in an empty, untagged model adds the tag in the same batch
- [x] Unit tests (parser, builders, form batch) — full suite, type-check, lint green
- [ ] Optional: real write against local Barista (needs a token from the user)
- [x] Jim settled it (minerva#612 comment 2026-11-18, PR minerva#613): lowercase key
  `annotation-editor-sae`, IRI `http://geneontology.org/lego/annotation-editor-sae`; code updated
- [ ] Merge only once minerva#613 is deployed where SAE runs

## Recovery Checkpoint
- **Last completed action:** lowercase key/IRI per Jim; tests green; committed on `issue-97-sae-tag`
- **Next immediate action:** wait for minerva#613 deploy, then merge to dev (user's call)
- **Uncommitted changes:** none

## Notes
- SAE writes the full IRI, not the shorthand: same stored property, and a Minerva without #613
  still accepts it (the shorthand would fail the whole create there). Reads accept both keys.
- Minerva: model annotations are a set, so cardinality 1 holds; `model copy` doesn't carry the
  tag (SAE has no copy; the landing page's Copy Model decides). `/search/models` reports
  `"annotation-editor-sae": true` (omitted when untagged) and filters with
  `?annotation-editor-sae=true|false`.
- Jim's fresh minerva `dev` drops `conforms-to-gpad`; SAE only parses it into an unused field.
- Backfill condition: model has no individuals and no tag → exactly one instance, and a model
  the landing page already tagged is left alone.
