# Tasks

## 1. Already done (merged to `dev`)

- [x] 1.1 Read the tag from the model under the short or full key; the first create in an empty, untagged model adds it in the same batch
- [x] 1.2 Key and IRI follow the agreement on geneontology/minerva#612: lowercase `annotation-editor-sae`, IRI `http://geneontology.org/lego/annotation-editor-sae`
- [x] 1.3 Unit tests for the parser, the builders and the form batch; full suite, type-check and lint green

## 2. Before release

- [ ] 2.1 Confirm geneontology/minerva#613 is merged and deployed on the Minerva SAE talks to in production — verify on the PR and with the Minerva maintainers
- [ ] 2.2 (Optional) Real write against a local Barista running minerva#613: `LOCAL=1 LOCAL_BARISTA_TOKEN=<token> npx playwright test e2e/local` — the scratch model's first annotation is stored, and reading the model back shows `annotation-editor-sae` = `true`
- [ ] 2.3 Merge `dev` into `main` only after 2.1 — verify `git merge-base --is-ancestor 5b69063 main` succeeds afterwards

## Workflow follow-up

- Archive the change after release; that adds the requirement to `openspec/specs/annotation-creation/spec.md`.
