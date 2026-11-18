# Task: Fix the misaligned Mantine checkbox under the Noctua shell's Bootstrap

**Status:** COMPLETE
**Issue:** geneontology/noctua-landing-page#139 (same fix as the landing page)
**Branch:** dev

## Goal

Checkboxes line up with their tick and labels aren't bold when SAE runs inside the Noctua shell.

## Context

- **Related files:** `src/@noctua.core/theme/shellStyles.ts`, `src/main.tsx`,
  `src/@noctua.core/theme/mantineTheme.ts`, `tests/@noctua.core/shellStyles.test.ts`
- **Cause:** noctua.js `pup_tent.set_common('css_libs', …)` links `/bootstrap.min.css`,
  `/jquery-ui-1.10.3.custom.min.css`, `/bbop.css`, `/amigo.css` into every workbench. Bootstrap 3's
  `input[type="checkbox"] { margin: 4px 0 0 }` outranks Mantine's single-class rule; its `label`
  rule bolds labels.

## Steps

- [x] `disableShellStylesheets()` disables the shell's stylesheet links, called in `main.tsx`
      before `createRoot`
- [x] Backup: Checkbox `styles` in the Mantine theme (inline margin 0, normal label weight)
- [x] Unit tests for the link matching
- [x] Bootstrap dependency check: shell navbar is already hidden (`.navbar { display: none }` in
      `src/index.css`); no `btn`/`glyphicon`/`col-`/`navbar` classes in `src/`
- [x] Tests (230), type-check, lint
- [x] Playwright check with the shell's `bootstrap.min.css` injected: link disabled, input margin-top 0 and level with `.mantine-Checkbox-inner`, label 400, html 16px; same with Bootstrap re-enabled (theme backup holds)
- [x] Commit
- [ ] Later, after a deployed check: drop the `html { font-size: 16px }`, `#root` resets and
      possibly Tailwind `important`

## Recovery Checkpoint

- **Last completed action:** all checks passed; scratch Playwright spec removed
- **Next immediate action:** after a deployed check, remove the old workarounds
- **Uncommitted changes:** none
