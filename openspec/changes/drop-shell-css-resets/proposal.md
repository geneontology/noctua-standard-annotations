# Proposal

## Why

SAE now disables the Noctua shell's stylesheet links (Bootstrap 3, jQuery UI, `bbop.css`, `amigo.css`) before it renders (geneontology/noctua-landing-page#139). The CSS workarounds written for those stylesheets may no longer be needed, but that can only be confirmed on a deployed workbench inside the real shell.

## What Changes

- After a deployed check, remove the workarounds that are no longer needed: `html { font-size: 16px }`, the `:where(#root)` reset block in `src/index.css`, and possibly the Tailwind `important` flag.
- Anything the deployed check shows is still needed stays.

Out of scope: the stylesheet disabling itself and the Mantine Checkbox theme backup, which both stay.

## Capabilities

### New Capabilities

### Modified Capabilities

## Impact

- `src/index.css` (and the Tailwind import if `important` goes), plus the CLAUDE.md line explaining why `important` is required.
- No behavior change for curators if the check is right.
