# Task: Clear the fixable Wiz dependency findings for SAE

**Status:** COMPLETE
**Issue:** geneontology/noctua#1103 (Wiz report read 2026-10-14)
**Branch:** `upgrade-to-react`

## Goal

Every finding in the Wiz report for `noctua-standard-annotations` that a version bump or toolchain
upgrade can clear is gone from `package-lock.json`; lint, type-check, tests and build still pass.

## Summary

- The 246 findings were scanned on the Angular `dev` tree. The React rewrite on `upgrade-to-react`
  drops all but the toolchain ones; after this change 96/98 report packages are gone or at a fixed
  version. The 2 left are the patched 6.x lines (`semver@6.3.1`, `ajv@6.15.0`), not the flagged
  versions.
- ESLint 8 + `eslint-config-react-app` → ESLint 10 flat `eslint.config.js` (`@eslint/js`,
  `typescript-eslint`, `eslint-plugin-react-hooks`, `globals`, `eslint-config-prettier` 10). Same
  project rules; `no-explicit-any` off (react-app never enforced it). Clears `eslint`,
  `@humanwhocodes/*`, `rimraf`, `glob@7`, `inflight`, `@babel/plugin-proposal-*`.
- `vite-plugin-checker` 0.8 → 0.14 (`chokidar@5`, no `fast-glob`) — clears `braces`.
- `npm update` of `js-yaml`, `postcss`, `brace-expansion`, `nanoid`, `browserslist`, `source-map-js`.
- Installs used `--before=2026-10-01` (nothing published in the last two weeks).
- Verified: lint 0 problems, type-check, 175 unit tests, production build.

## Follow-up

- `vite-plugin-checker` is in `dependencies`; it is build-only and belongs in `devDependencies`.
- The landing page's ESLint 10 config ports the full react-app rule set (`@eslint-react`,
  `jsx-a11y-x`); worth aligning this config with it.

## Round 2 (2026-10-22)

Advisories on the React tree (GitHub advisory DB; `npm audit`'s endpoint timed out):

| Package                     | Was    | Now    | Advisories cleared                                                       |
| --------------------------- | ------ | ------ | ------------------------------------------------------------------------ |
| `react-router` / `-dom`     | 7.17.0 | 7.18.4 | 2 high, 3 medium (fixed in 7.18.2)                                       |
| `vite`                      | 6.4.3  | 6.4.4  | `fs.allow` bypass, cross-origin script, bundled `launch-editor` (1 high) |
| `vitest` / `@vitest/mocker` | 3.2.6  | 4.1.12 | path traversal (4.1.11), manual-mock code injection (4.1.12)             |
| `tinypool`                  | 1.1.1  | gone   | 2 critical (vitest 4 no longer uses it)                                  |

- `package.json` floors raised (`^7.18.4`, `^6.4.4`, `^4.1.12`) so a fresh install can't resolve
  a vulnerable version. vitest 4 needed no code or config changes.
- vitest 4.1.12 is a week old (under the two-week rule) but is the only fix for GHSA-qxg6-89mg-rqv8;
  `npm audit signatures`: 385/385 verified registry signatures, 123 attestations.
- Verified: 227 unit tests, 27 mocked e2e, lint, both type-checks, production build (temp dir).
