# Task: Fix SAE "fill with root term" to also fill evidence and reference

**Status:** COMPLETE
**Issue:** #79
**Branch:** issue-79-root-term-evidence
**PR:** https://github.com/geneontology/noctua-standard-annotations/pull/84

## Goal
When "Add MF/BP/CC Root" is clicked in the SAE annotation form, auto-fill the evidence code (ECO:0000307) and reference (GO_REF:0000015) in addition to the GO term.

## Summary
Fixed `_addRootTerm` in `annotation-form.component.ts`. The method was accessing `evidenceCode` and `reference` as top-level form controls, but they live inside the `evidences` FormArray. Now patches the first evidence group correctly, and adds one if the array is empty.

## Recovery Checkpoint
> TASK COMPLETE

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
| annotation-form.component.ts | Fix _addRootTerm to use evidences FormArray | done |
