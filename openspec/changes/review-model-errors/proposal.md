# Proposal

## Why

The Model Errors chip and panel shipped with #98 and are described in the `model-errors` spec. Two things were left for curators: confirming the wording, and deciding whether a hidden nested extension (a fact two hops from the GO term, and its term) should count as an error. Today it does.

## What Changes

- No code or requirement changes. This change tracks a browser check of the shipped behavior and the curator review.
- If curators change the wording or decide nested extensions should not count, revise this change with a delta to `model-errors` before editing code.

Out of scope: ShEx violations. SAE reads the model without the reasoner, so Minerva returns no validation results to list.

## Capabilities

### New Capabilities

### Modified Capabilities

## Impact

- None unless the review asks for a change.
