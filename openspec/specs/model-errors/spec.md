# model-errors Specification

## Purpose
Tell the curator when the open model holds content that the standard annotations table does not
show, so nothing in the model goes unnoticed. Anything a row does not show is counted as an
error: individuals no annotation uses, and facts that are neither an annotation's relation nor
one of its extensions. The toolbar shows the count, and a panel in the right drawer lists each
hidden individual and fact.

## Requirements

### Requirement: What a row shows
The system SHALL treat as shown, for each annotation in the table: its gene product, its GO term, the individual the annotation is rooted at (the root molecular function for "involved in" and "acts upstream of" annotations), its starting fact, its relation fact, and each extension's fact and term. Every other individual and fact in the model SHALL count as not shown.

#### Scenario: A model made only of standard annotations
- **WHEN** the model holds only standard annotations and their one-hop extensions
- **THEN** nothing is counted as not shown

### Requirement: Evidence is never an error
Evidence individuals SHALL never be counted or listed as errors: neither individuals referenced as a fact's evidence nor individuals typed as evidence (rooted at `ECO:0000000`).

#### Scenario: A GO-CAM with evidence on hidden facts
- **WHEN** the model has facts the table doesn't show, each with evidence
- **THEN** the facts are counted, but none of their evidence individuals are

### Requirement: Error count
The error total SHALL be the number of individuals not shown plus the number of facts not shown.

#### Scenario: An unused individual
- **WHEN** the model holds one individual (for example a chemical) that no annotation uses and no fact connects
- **THEN** the total is 1

#### Scenario: A nested extension
- **WHEN** an annotation's extension term has its own extension (a fact two hops from the GO term)
- **THEN** that fact and its term individual are both counted, for a total of 2

#### Scenario: A GO-CAM model
- **WHEN** the model is a GO-CAM with causal facts between molecular functions
- **THEN** each causal fact the table doesn't show is counted

### Requirement: Toolbar error chip
Whenever a model is loaded, logged in or not, the model toolbar SHALL show, right after the title, a chip reading "<N> Errors Found" ("1 Error Found" when N is 1). With one or more errors the chip SHALL be red with a warning icon; with none it SHALL be green with a check and read "0 Errors Found". Clicking the chip SHALL open the right drawer on the Model Errors panel.

#### Scenario: Errors present
- **WHEN** the model has one hidden individual
- **THEN** the toolbar shows a red "1 Error Found" chip

#### Scenario: No errors
- **WHEN** the table shows the whole model
- **THEN** the toolbar shows a green "0 Errors Found" chip

#### Scenario: Opening the panel
- **WHEN** the curator clicks the chip
- **THEN** the right drawer opens showing the Model Errors panel

### Requirement: Counts follow the model
The error count and panel SHALL be recomputed from the currently loaded model whenever it changes, including after the curator's own edits and after a refresh.

#### Scenario: Deleting the content the table didn't show
- **WHEN** an edit removes the only hidden individual and the model is refreshed
- **THEN** the chip turns green and reads "0 Errors Found"

### Requirement: Model Errors panel summary
The panel SHALL be headed "Errors" with a "Close" button that closes the right drawer, and SHALL show two totals: the number of individuals not shown, labelled "Nodes not in the table", and the number of facts not shown, labelled "Relations not in the table".

#### Scenario: Closing the panel
- **WHEN** the curator clicks "Close" in the panel
- **THEN** the right drawer closes

### Requirement: Empty panel
When nothing is hidden, the panel SHALL show a check and the text "No errors: the table shows everything in this model."

#### Scenario: A clean model
- **WHEN** the curator opens the panel on a model the table fully shows
- **THEN** the panel reads "No errors: the table shows everything in this model." and both totals are 0

### Requirement: Panel introduction
When the model has errors, the panel SHALL say "This model has content that isn't a standard annotation, so the table doesn't show it." above the lists.

#### Scenario: A model with hidden content
- **WHEN** the curator opens the panel on a model with at least one error
- **THEN** the panel reads "This model has content that isn't a standard annotation, so the table doesn't show it."

### Requirement: Hidden individuals, standalone and in relations
When individuals are hidden, the panel SHALL show a "Nodes not shown" section with their count, split into "Not used by any annotation" (used by no hidden fact) and "Only in a relation the table doesn't show" (used by a hidden fact), each with its count and shown only when non-empty. Each individual SHALL show its label (or individual id), prefixed "NOT " when negated, and its class id.

#### Scenario: A standalone chemical
- **WHEN** the model holds a chemical individual with no facts
- **THEN** it is listed under "Not used by any annotation" and no "Only in a relation the table doesn't show" group is shown

#### Scenario: The term of a nested extension
- **WHEN** a hidden fact points to the term "G0 to G1 transition"
- **THEN** "G0 to G1 transition" is listed under "Only in a relation the table doesn't show"

### Requirement: Hidden facts
If any facts are hidden, the panel SHALL show a "Relations not shown" section with their count and the note "Neither an annotation's relation nor one of its extensions", listing each fact as "<subject> —— <relation> ——> <object>", using the subject's and object's labels, or their individual ids when the individual is not found.

#### Scenario: A nested extension fact
- **WHEN** the model has the fact DNA-templated DNA replication part of G0 to G1 transition, which no row shows
- **THEN** the panel lists "DNA-templated DNA replication —— part of ——> G0 to G1 transition" under "Relations not shown"
