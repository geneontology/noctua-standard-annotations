# Task: "Add More Reference(s)" on an annotation row

**Status:** COMPLETE (uncommitted, awaiting review)
**Issue:** https://github.com/geneontology/noctua-standard-annotations/issues/93
**Branch:** issue-93-add-references (from `dev`; #94 is on its own branch)

## Goal

A curator can paste extra PMIDs on an existing annotation, and SAE creates one new annotation per
paper: the same annotation with only the reference swapped. This mirrors "Add More Gene(s)".

## Decisions (the defaults the user accepted)

- **With/From is copied**, as Add More Gene(s) does; easy to edit per row afterwards.
- **PMIDs only.** `12345`, `PMID:12345` and `PMID: 12345` are accepted, one per line or separated
  by commas, semicolons, spaces or `|`. Anything else is listed under Not Found.
- **PubMed check before saving:** one esummary request for all PMIDs; tabs Found / Not Found /
  Already Cited, with titles, authors and date, and a link to PubMed.
- **Duplicates skipped:** a PMID the annotation already cites goes under Already Cited.
- Cap: `MAX_REFERENCES` = 50 (one PubMed request, one batch).
- Each copy's evidence has that PMID alone as its source, even when the original cites several
  (`A| B`).

## Done

- [x] `services/referenceList.ts`: `parseReferences`, `classifyReferences`, `pmidNumber`.
- [x] `annotationOperations.ts`: `copyInputOf` shared by the genes copy and the new
      `buildCopyAnnotationToReferencesOperations`.
- [x] `lookupApiSlice.getPubmedSummaries`: several PMIDs per esummary call; an `error` entry
      means not found.
- [x] `dialogs/AddReferencesDialog.tsx`, `useAnnotationActions.copyToReferences`, and the row
      menu item **Add More Reference(s)** below Add More Gene(s).
- [x] e2e PubMed mock answers several ids; ids from 9000000 up are "not on PubMed".
- [x] Tests: `referenceList.test.ts`, `AddReferencesDialog.test.tsx`, builder and hook tests,
      and an e2e in `edit.spec.ts` (Minerva evidence: that PMID alone, same code and with/from).
- [x] 261 unit tests, 32 e2e (twice), type-check, lint.

## Notes

- The first full e2e run failed the new test once: Save sent no batch. Five reruns (3 alone,
  2 full suite) passed and the cause wasn't found. Most likely the reused dev server reloaded
  mid-test after the files were rewritten.

## Recovery Checkpoint

- **Last completed action:** all checks green
- **Next immediate action:** commit on the user's go-ahead
- **Uncommitted changes:** see `git status`
