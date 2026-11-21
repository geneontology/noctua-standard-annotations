# annotation-creation Specification

## Purpose
Above the annotations table, a create form lets a logged-in curator make a standard GO
annotation: a gene product, a relation, a GO term (optionally NOT), evidence with reference and
with/from, optional extensions and comments. The relations and term ranges the form offers follow
the GO-CAM shape rules for the terms chosen. On Save the annotation is written to the model in
one batch as its own small subgraph, and the model is stored.

## Requirements

### Requirement: Create form requires a login
The create form SHALL be covered with "Log in to Continue" when no curator is logged in, so that
none of its fields can be used.

#### Scenario: Logged-out visitor
- **WHEN** a logged-out visitor opens a model
- **THEN** the create form is shown dimmed under "Log in to Continue"

### Requirement: Gene product field
The "Gene Product" field SHALL search gene products and protein-containing complexes, excluding
GO classes, and before anything is typed SHALL offer the matching terms already in the model.

#### Scenario: Searching a gene product
- **WHEN** the curator types in "Gene Product"
- **THEN** the search covers molecular entities and protein-containing complexes
- **AND** no `GO:` class is offered

### Requirement: GO term range follows the gene product and relation
The "GO Term" field SHALL search only the categories the gene-product-to-term rules allow for the
chosen gene product and, once chosen, relation; until a gene product is chosen the field SHALL
search nothing. Before anything is typed it SHALL offer the model's terms in that range.

#### Scenario: Before a gene product
- **WHEN** no gene product is chosen
- **THEN** typing in "GO Term" returns no search results

#### Scenario: After a gene product
- **WHEN** the curator picks a gene product
- **THEN** "GO Term" searches the categories the rules allow for it (for example biological_process)

#### Scenario: After a "located in" relation
- **WHEN** the curator has picked a gene product and the relation "located in"
- **THEN** "GO Term" searches cellular_component terms

### Requirement: Relation choices and automatic relation
The "GP to Term Relation" field SHALL offer the relations the gene-product-to-term rules allow
between the gene product's and GO term's types, each shown with its relation id, and SHALL be
clearable. When both terms are chosen and the relation is empty or not allowed, the form SHALL
set it to the first allowed relation, or to "part of" when the GO term is a protein-containing
complex. With no allowed relation the field SHALL show "No relation applies".

#### Scenario: A gene product and a biological process
- **WHEN** the curator picks a gene product and a biological process GO term
- **THEN** "GP to Term Relation" becomes "involved in"

#### Scenario: A protein-containing complex term
- **WHEN** the curator picks a gene product and a protein-containing complex GO term
- **THEN** "GP to Term Relation" becomes "part of"

#### Scenario: Keeping an allowed choice
- **WHEN** the curator has chosen an allowed relation and then changes the GO term to one for which
  it is still allowed
- **THEN** the relation is kept

### Requirement: NOT qualifier
The form SHALL offer a "NOT" checkbox, left out of the Tab order; while ticked, the GO term field
SHALL be outlined in orange with the tooltip "NOT", and the GO term SHALL be stored as a
complement class expression.

#### Scenario: Ticking NOT
- **WHEN** the curator ticks "NOT" and saves
- **THEN** Minerva receives the GO term individual as the complement of the GO term class

### Requirement: Root term shortcuts
The GO term's "Term options" menu SHALL offer "Add MF Root", "Add BP Root" and "Add CC Root",
which set the GO term to `molecular_function` (GO:0003674), `biological_process` (GO:0008150) or
`cellular_component` (GO:0005575) and fill the first evidence row with "no biological data found
used in manual assertion" (ECO:0000307) and the reference `GO_REF:0000015`.

#### Scenario: Add BP Root
- **WHEN** the curator chooses "Add BP Root"
- **THEN** "GO Term" is biological_process
- **AND** the evidence is ECO:0000307 with reference `GO_REF:0000015`

### Requirement: Evidence fields
The form SHALL have one evidence row with an "Evidence" field that searches ECO evidence terms
(offering the model's evidence codes before anything is typed), a "Reference" field and a
"With/From" field, and an "Evidence options" menu offering "Add ISS Evidence".

#### Scenario: Add ISS Evidence
- **WHEN** the curator chooses "Add ISS Evidence"
- **THEN** the evidence is "sequence similarity evidence used in manual assertion" (ECO:0000250)
- **AND** the reference is `GO_REF:0000024`

### Requirement: Reference and with/from suggestions
The Reference and With/From fields SHALL suggest the model's existing values that contain the
typed text, and SHALL trim surrounding whitespace when the field loses focus.

#### Scenario: Suggesting a reference from the model
- **WHEN** the model already cites `PMID:12345` and the curator types `123` in Reference
- **THEN** `PMID:12345` is suggested

#### Scenario: Trimming on blur
- **WHEN** the curator types ` PMID:1 ` in Reference and leaves the field
- **THEN** the field reads `PMID:1`

### Requirement: Reference picker
The Reference field's "Pick a reference" button SHALL open a picker with a database choice of
`PMID:`, `DOI:` or `GO_REF:` and an "Accession" field suggesting the model's accessions for that
database; saving SHALL set the field to `<DB>:<accession>`, and an empty accession SHALL be
refused with "`<DB>` accession is required".

#### Scenario: Picking a PMID
- **WHEN** the curator enters accession `12345` under `PMID:` and saves
- **THEN** the Reference field reads `PMID:12345`

#### Scenario: Empty accession
- **WHEN** the curator saves the picker with no accession under `DOI:`
- **THEN** the picker shows "DOI accession is required" and stays open

#### Scenario: Prefilling the picker
- **WHEN** the Reference field holds `DOI:10.1/x`
- **THEN** the picker opens on `DOI:` with accession `10.1/x`
- **AND** a field holding a database the picker does not offer opens it blank on `PMID:`

#### Scenario: PubMed preview
- **WHEN** the curator enters a PMID accession
- **THEN** the picker shows the paper's title (linked to PubMed), authors and date

### Requirement: With/From picker
The With/From field's "Pick with/from" button SHALL open a picker of "With/From" groups of
entities, each a database from the allowed with/from namespaces (or "None") and an accession.
"Ok" SHALL join entities in a group with `|` and groups with `,`, ignoring fully empty entities,
and SHALL refuse an entity missing its database or its accession.

#### Scenario: Two groups
- **WHEN** the curator enters `UniProtKB:P1` and `UniProtKB:P2` in one group and `MGI:3` in another, and clicks "Ok"
- **THEN** With/From reads `UniProtKB:P1|UniProtKB:P2,MGI:3`

#### Scenario: Accession without a database
- **WHEN** an entity has accession `P1` and database "None"
- **THEN** "Ok" shows "Please select a database for the accession value "P1"" and the picker stays open

#### Scenario: Database without an accession
- **WHEN** an entity has database `MGI` and no accession
- **THEN** "Ok" shows "Accession value is required for database "MGI"" and the picker stays open

#### Scenario: Picker controls
- **WHEN** the picker is open
- **THEN** it offers "Add Entity", "Delete Entity", "Delete Group", "Add Group", "Cancel" and "Ok"

### Requirement: Extension rows
The form SHALL add an extension row with "Add Extension" ("Add Another Extension" once one
exists). Each row SHALL have a clearable "Extension Relation" offering the GO-CAM extension
relations allowed from the GO term (to the row's term, once chosen), an "Extension Term" whose
search range follows the GO term and the row's relation, and a "Delete extension" button. Rows
with neither relation nor term SHALL be ignored on save.

#### Scenario: Adding an extension
- **WHEN** the curator clicks "Add Extension", picks a relation and a term, and saves
- **THEN** Minerva receives a new individual of that term and a fact from the GO term individual to it with that relation

#### Scenario: Removing an extension row
- **WHEN** the curator clicks "Delete extension" on a row
- **THEN** the row is removed from the form

### Requirement: Comment rows
The form SHALL add a "Comment" row with "Add Comment" ("Add Another Comment" once one exists),
each with a "Delete comment" button. On save, comments SHALL be trimmed, blank ones dropped and
duplicates collapsed.

#### Scenario: Duplicate and blank comments
- **WHEN** the curator saves with comments "a", " a " and ""
- **THEN** each fact of the new annotation carries the single comment "a"

### Requirement: Validation before Save
Save SHALL be disabled while the form has errors, and once the curator has changed the form a
"Why is the "Save" button disabled?" button SHALL open an "Errors" dialog listing the numbered
error messages, and outline the fields in error in red.

#### Scenario: Explaining a disabled Save
- **WHEN** the curator has changed any field and the form has errors
- **THEN** a "Why is the "Save" button disabled?" button shows
- **AND** clicking it opens an "Errors" dialog listing the numbered messages with a "Close" button
- **AND** the fields with errors are outlined in red with their first message as tooltip

#### Scenario: A pristine form
- **WHEN** the form has not been changed since it was opened or cleared
- **THEN** Save is disabled and no "Why is the "Save" button disabled?" button shows

#### Scenario: Missing terms and relation
- **WHEN** the gene product, GO term or relation is missing
- **THEN** the errors include "GP is required", "GO Term is required", or (with both terms chosen) "GP to Term Relation is required"

#### Scenario: Incomplete extension row
- **WHEN** extension row N has only a relation or only a term
- **THEN** the errors include "Both Extension relation and Extension Term must be filled (N)"

### Requirement: Evidence row validation
For the evidence row at position N the form SHALL require an evidence code and a reference, each
`|`-separated reference being `DB:accession` with an accession, and SHALL check a non-empty
with/from entry by entry (split on `,` and `|`) against the allowed with/from namespaces,
matching the database prefix case-insensitively.

#### Scenario: Missing evidence and reference
- **WHEN** evidence row 1 has no evidence code and no reference
- **THEN** the errors include "Evidence is required @ 1" and "Reference is required @ 1"

#### Scenario: Malformed reference
- **WHEN** evidence row 1's reference is `12345`
- **THEN** the errors include "Use DB:accession format for reference @ 1"

#### Scenario: Malformed with/from entries
- **WHEN** evidence row 1's with/from is `P1`, or `MGI:`
- **THEN** the errors include "With/From @ 1 - Invalid format: "P1" - expected format is "DATABASE:accession"", or "With/From @ 1 - Invalid format: "MGI:" - accession cannot be empty"

#### Scenario: A with/from outside the allowed namespaces
- **WHEN** the With/From field holds `FOO:1`
- **THEN** the errors include "With/From @ 1 - Invalid database prefix: "FOO" is not part of allowed entities"

#### Scenario: Prefix case
- **WHEN** the With/From field holds `uniprotkb:P1`
- **THEN** it is valid

### Requirement: Facts Minerva receives for a new annotation
On Save the system SHALL send Minerva one batch, ending in a model store, that adds new
individuals for the gene product, the GO term (as a complement when NOT is ticked) and each
extension term, the facts for the chosen relation, and `GO term <relation> extension term` for
each extension.

#### Scenario: Saving an "enables" annotation
- **WHEN** the curator saves gene product P, "enables", MF term M
- **THEN** Minerva receives the fact `M enabled_by P` and no extra molecular_function individual

#### Scenario: Saving an "involved in" annotation
- **WHEN** the curator saves gene product P, "involved in", BP term B
- **THEN** Minerva receives a new `molecular_function` (GO:0003674) individual with facts `GO:0003674 enabled_by P` and `GO:0003674 part_of B`
- **AND** the batch ends with a store of the model

#### Scenario: Saving an "acts upstream of" annotation
- **WHEN** the curator saves an "acts upstream of", "acts upstream of or within" or effect-form relation to BP term B
- **THEN** Minerva receives a new GO:0003674 individual `enabled_by P` with the matching `causally_upstream_of…` fact to B

#### Scenario: Saving a "located in" annotation
- **WHEN** the curator saves gene product P, "located in", CC term C
- **THEN** Minerva receives the fact `P located_in C`
- **AND** "is active in", "part of" and "contributes to" are likewise stored from P to the term

### Requirement: Evidence and comments on every new fact
Every fact of a new annotation SHALL carry the comments and its own new evidence individual of
the chosen evidence class, annotated with each reference as a separate `source` and the
with/from as one `with` value.

#### Scenario: Saving with reference and with/from
- **WHEN** the curator saves an "involved in" annotation with ECO:0000315, reference `PMID:12345` and with/from `zfin:ZDB-MRPHLNO-1`
- **THEN** each of the two facts has its own ECO:0000315 evidence individual with `source` `PMID:12345` and `with` `ZFIN:ZDB-MRPHLNO-1`

#### Scenario: Several references
- **WHEN** the reference is `PMID:1| PMID:2`
- **THEN** each evidence individual has two `source` values, `PMID:1` and `PMID:2`

#### Scenario: With/from as stored
- **WHEN** the with/from is `uniprotkb:P1, mgi:2`
- **THEN** the `with` value is `UniProtKB:P1,MGI:2`

### Requirement: First annotation titles the model
When the model has no title, the create batch SHALL add the title "enabled by `<gene product
label>`".

#### Scenario: Untitled model
- **WHEN** the curator saves the first annotation for gene product "NEW1 Hsap" in a model with no title
- **THEN** the batch adds the model title "enabled by NEW1 Hsap"

### Requirement: Save outcome and Clear
After a successful save the system SHALL toast "Annotation successfully created.", clear the
form and refresh the model; after a failed save it SHALL toast the Barista or Minerva error
message and keep the form as filled in. "Clear" SHALL reset every field, including text typed
but never picked, and hide the error explanation.

#### Scenario: Successful save
- **WHEN** Minerva accepts the create batch
- **THEN** the toast reads "Annotation successfully created."
- **AND** the form is empty and the new row appears in the table

#### Scenario: Failed save
- **WHEN** Minerva answers the create batch with an error `<message>`
- **THEN** an error toast shows `<message>`
- **AND** the form keeps its values
