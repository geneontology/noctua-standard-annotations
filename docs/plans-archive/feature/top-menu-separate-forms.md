# Task: Top menu opens a separate form per field, like the VPE

**Status:** COMPLETE (uncommitted, awaiting review)
**Issue:** https://github.com/geneontology/noctua-standard-annotations/issues/94
**Branch:** issue-94-top-menu-forms

## Goal

In the cam toolbar, each control opens its own form, as in the VPE, instead of every control
opening the one big Model Details form.

## Decisions

- Title pencil → **Edit Title** (`sm`). State chip → **Change State** (`xs`). Comment icon →
  **Model Comments** (`sm`).
- Date and contributor chips → a slimmer **Model Details**: the group edits are attributed to,
  plus the summary (contributors, groups, Open In). It writes nothing to the model; the group is
  applied with `setUserGroup`.
- **Group guard** ported from the VPE (`GroupGuardProvider`, mounted around `CamToolbar` in
  `Layout`). It covers the three model forms, not Model Details. Annotation edits (form, table)
  are *not* guarded yet; that would be a follow-up.
- Logged out (as the VPE, #278 there): no title pencil and the state chip isn't clickable. Model
  Comments opens read-only, and Model Details shows the summary only.
- Each form writes only its own key (remove all current values, add the new one, store). This is
  unlike the VPE, which rewrites title, state and comments on every save.

## Done

- [x] `modelOperations.ts`: `buildSaveModelTitleOperations` / `State` / `Comments` over one
      `buildReplaceModelAnnotationOperations`. The old `buildSaveModelDetailsOperations` is
      removed.
- [x] `useSaveModelAnnotations` hook (batch, toast, close on success, stay open on error);
      `ModelFormActions` footer.
- [x] `CamTitleForm` (Save disabled when blank or unchanged), `CamStateForm` (keeps off-list
      states, no default for a stateless model), `CamCommentsForm` (`CommentListEditor`).
- [x] `CamDetailsForm` cut down to group + summary.
- [x] `dialogSlice` / `App.tsx` registrations; `CamToolbar` wiring; CLAUDE.md, `camConstants`
      and `ContributorChips` comments.
- [x] Tests: `modelOperations.test.ts`, `CamModelForms.test.tsx`, `CamToolbar.test.tsx`
      (each control, logged out, guard confirm/cancel), `CamDetailsForm.test.tsx`; e2e
      `model.spec.ts` with one test per form and the guard.
- [x] 249 unit tests, 31 e2e, type-check, lint; screenshots of Edit Title / Change State match
      the issue.

## Recovery Checkpoint

- **Last completed action:** all checks green
- **Next immediate action:** commit on the user's go-ahead; open a PR to `dev` per the template
- **Uncommitted changes:** see `git status` (src/features/gocam, Layout, App, dialogSlice,
  tests, e2e/model.spec.ts, CLAUDE.md, this plan)
