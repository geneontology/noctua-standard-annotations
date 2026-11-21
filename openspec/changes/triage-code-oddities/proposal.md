# Proposal

## Why

Writing the baseline specs turned up behavior that looks unintended or inconsistent. The specs record the code as it is; nobody has yet decided which of these are intended. This change keeps the list open so none is lost.

## What Changes

- No code or requirement changes. Each task is a decision: intended (close the task, nothing else) or a bug (close the task and start its own change with `/opsx:propose`, which then modifies the owning spec).

Out of scope: fixing anything in this change.

## Capabilities

### New Capabilities

### Modified Capabilities

## Impact

- None until an item is turned into its own change.
