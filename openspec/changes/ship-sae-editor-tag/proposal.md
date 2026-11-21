# Proposal

## Why

Models a curator starts in SAE should say so, so Noctua and the landing page can tell them apart from models made in the other editors (#97). The model annotation was agreed on geneontology/minerva#612 and is being added to Minerva in geneontology/minerva#613, which is still open. SAE already writes the tag on `dev`, but it must not reach production before Minerva accepts it.

## What Changes

- The first annotation created in an empty, untagged model also adds the model annotation `http://geneontology.org/lego/annotation-editor-sae` = `true` in the same batch, before its store.
- A model that already has individuals, or is already tagged (for example by the landing page), gets no tag.
- The code is done and merged to `dev`; this change holds it until Minerva is ready, then ships it.

Out of scope: tagging existing models on edit, showing the tag anywhere in SAE, and the landing page side (geneontology/noctua-landing-page#140).

## Capabilities

### New Capabilities

### Modified Capabilities
- `annotation-creation`: the first create in an empty, untagged model also tags it as made in SAE.

## Impact

- The create batch for an empty model gains one model annotation operation.
- Depends on geneontology/minerva#613 being deployed wherever SAE runs.
- **Release:** `dev` already contains the code; merging `dev` into `main` before minerva#613 is deployed would ship it early.
