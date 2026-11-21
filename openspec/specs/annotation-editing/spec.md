# annotation-editing Specification

## Purpose
A logged-in curator edits an existing annotation from its table row: each cell's edit button
opens a small inline editor for the gene product, relation, GO term, evidence code, reference or
with/from, and the row's action menu adds an extension or a comment, toggles NOT, or copies the
annotation onto more genes or more references. Comments are also listed and edited in the
Comments panel. Evidence and comment edits apply to every fact and evidence individual of the
row's subgraph, so a row stays consistent. Every edit is one batch to Minerva that ends in a
model store.

## Requirements

### Requirement: One stored batch per edit
Every edit SHALL be sent as one batch that ends in a model store. On success the system SHALL
toast the edit's success message, close the editor or dialog and refresh the model; on failure it
SHALL toast the Barista or Minerva error message and leave the editor or dialog open.

#### Scenario: A rejected edit
- **WHEN** Minerva answers an edit batch with an error `<message>`
- **THEN** an error toast shows `<message>`
- **AND** the inline editor stays open with the curator's input

#### Scenario: An accepted edit
- **WHEN** Minerva accepts an edit batch
- **THEN** the batch's last operation was a store of the model
- **AND** the table shows the refreshed model

### Requirement: Inline cell editors
For a logged-in curator, hovering a Gene Product, Relationship, Term, Evidence, Reference or With
cell SHALL reveal an edit button that opens an editor prefilled with the current value, with
"Cancel" and "Save" buttons. Saving a value equal to the current one SHALL close the editor
without writing.

#### Scenario: Edit button labels
- **WHEN** a logged-in curator hovers the row's cells
- **THEN** the edit buttons are labelled "Edit gene product", "Edit relation", "Edit GO term", "Edit evidence", "Edit reference" and "Edit with/from"

#### Scenario: Opening an editor
- **WHEN** the curator clicks "Edit GO term" on a row
- **THEN** an editor opens with a "GO Term" field holding the row's GO term

#### Scenario: Saving an unchanged value
- **WHEN** the curator saves the GO term editor without changing the term
- **THEN** no batch is sent and the editor closes

### Requirement: Change the gene product or GO term
The "Gene Product" and "GO Term" editors SHALL replace the class of the existing individual in
place, keeping its NOT qualifier, as a remove-type of the old class expression and an add-type of
the new one on the same individual. A save without a term picked from the list SHALL warn
"Please select term from autocomplete." and send nothing.

#### Scenario: Swapping a NOT GO term
- **WHEN** the curator changes a NOT row's GO term from C1 to C2
- **THEN** Minerva receives remove-type NOT C1 and add-type NOT C2 on the GO term individual
- **AND** the toast reads "GO Term successfully updated."

#### Scenario: Swapping the gene product
- **WHEN** the curator picks another gene product and saves
- **THEN** the gene product individual's class is replaced
- **AND** the toast reads "Gene Product successfully updated."

#### Scenario: Search ranges
- **WHEN** the curator edits the gene product, or the GO term of a "located in" row
- **THEN** the gene product search covers gene products and protein-containing complexes without GO classes
- **AND** the GO term search covers the range the gene-product-to-term rules give for the row's relation (here cellular_component), falling back to the GO term's own root types

#### Scenario: Typed text that was not picked
- **WHEN** the curator saves the editor with no term picked
- **THEN** a warning reads "Please select term from autocomplete." and nothing is sent

### Requirement: Change the relation
The "GP To Term Relation" editor SHALL offer the relations the gene-product-to-term rules allow
for the row's gene product and GO term. Saving SHALL remove the fact that carries the relation
and add the new fact between the same individuals, carrying the old fact's comments and a new
copy of each of its evidences, without removing the old evidence individuals itself.

#### Scenario: "located in" to "is active in"
- **WHEN** the curator changes a row from "located in" to "is active in"
- **THEN** Minerva receives removal of `GP located_in CC` and addition of `GP is_active_in CC` with the old comments and evidence copied
- **AND** the toast reads "Relation successfully updated."

#### Scenario: To or from "enables"
- **WHEN** the curator changes a row between "enables" and a relation stored from the gene product
- **THEN** the new fact runs in the opposite direction to the old one (`MF enabled_by GP` versus `GP <relation> term`)

#### Scenario: "involved in" to "acts upstream of or within"
- **WHEN** the curator changes an "involved in" row to "acts upstream of or within"
- **THEN** Minerva receives removal of `GO:0003674 part_of BP` and addition of `GO:0003674 causally_upstream_of_or_within BP`

#### Scenario: Crossing storage shapes
- **WHEN** the curator changes an "involved in" row to a relation stored directly from the gene product
- **THEN** the warning "This relation can't be changed in place. Delete the annotation and create it again." shows and nothing is sent

#### Scenario: A relation the table cannot name
- **WHEN** a row's relation cannot be named, or no relation is allowed for its pair
- **THEN** its Relationship cell offers no edit button

### Requirement: Change the evidence code on every evidence
The "Evidence" editor SHALL search ECO evidence terms and on save set the new evidence class on
every evidence individual of the row's subgraph, re-attributing each to the current curator; it
SHALL close without writing only when every evidence already has the chosen code.

#### Scenario: An "involved in" row
- **WHEN** the curator changes the evidence of an "involved in" row whose two facts each have an evidence individual
- **THEN** Minerva receives remove-type of the old class and add-type of the new one on both evidence individuals
- **AND** the toast reads "Evidence successfully updated."

#### Scenario: Unifying disagreeing evidence
- **WHEN** the row's facts carry different evidence codes and the curator saves the code shown
- **THEN** every evidence individual is set to that code

#### Scenario: Re-attribution
- **WHEN** a curator with ORCID O in group G edits a row's evidence
- **THEN** each edited evidence individual has `contributor` O removed and then added again with `providedBy` G
- **AND** a curator without a group is added as `contributor` alone

### Requirement: Change the reference on every evidence
The "Reference" editor SHALL accept one or more `DB:accession` references separated by `|`, and
on save SHALL replace every `source` of every evidence individual in the row's subgraph with the
new references as separate `source` values, re-attributing each evidence individual to the
current curator.

#### Scenario: Two references
- **WHEN** the curator saves `PMID:1| PMID:2`
- **THEN** each evidence individual of the row ends with `source` values `PMID:1` and `PMID:2`
- **AND** the toast reads "Reference successfully updated."

#### Scenario: Invalid reference
- **WHEN** the curator saves `12345`
- **THEN** the warning "Use DB:accession format for reference." shows and nothing is sent

### Requirement: Change the with/from on every evidence
The "With/From" editor SHALL open with the current with/from in canonical prefix case and on
save SHALL replace the `with` value of every evidence individual in the row's subgraph
(canonical prefixes, no whitespace), re-attributing each evidence individual to the current
curator; an empty value SHALL clear the with/from.

#### Scenario: Changing with/from
- **WHEN** the curator saves `UniProtKB:P1`
- **THEN** each evidence individual's old `with` value is removed and `UniProtKB:P1` added
- **AND** the toast reads "With successfully updated."

#### Scenario: Clearing with/from
- **WHEN** the curator empties the field and saves
- **THEN** Minerva receives removal of each evidence individual's `with` value and no new one

#### Scenario: Disallowed namespace
- **WHEN** the curator saves `FOO:1`
- **THEN** the warning "Invalid database prefix: "FOO" is not part of allowed entities" shows and nothing is sent

### Requirement: Add an extension
The row menu's "Add Extension" SHALL open an editor with a clearable "New Extension Relation" and
a "New Extension Term", and on save Minerva SHALL receive a new individual of the extension term
and a fact from the row's GO term individual to it, carrying the row's evidence and comments.
Saving with either half missing SHALL warn "Please select both an extension relation and an
extension term."

#### Scenario: Saving an extension
- **WHEN** the curator picks a relation and a term and saves
- **THEN** Minerva receives the new term individual and the fact from the GO term individual
- **AND** the toast reads "Extension successfully added."

#### Scenario: Missing half
- **WHEN** the curator saves Add Extension with a relation but no term
- **THEN** the warning "Please select both an extension relation and an extension term." shows

### Requirement: Extension choices follow the GO term's ancestry
Add Extension SHALL look up the GO term's full ancestry and offer the extension relations, and
limit the term range, by the GO-CAM extension rules for the GO term and all its ancestors, so
that rules keyed on a subclass of its root are offered (#85). Until the ancestry is known only
the rules for the GO term's root types SHALL be offered.

#### Scenario: A subclass extension on a BP row
- **WHEN** the curator opens Add Extension on a row whose GO term is a developmental process
- **THEN** once the term's ancestry is known, "results in development of" is offered
- **AND** saving it with an anatomy term sends that fact from the GO term individual

#### Scenario: Ancestry not yet known
- **WHEN** the ancestry lookup has not answered
- **THEN** only the relations the root biological_process rules allow are offered

#### Scenario: Other editors
- **WHEN** the curator opens any editor other than Add Extension
- **THEN** no ancestry lookup is made

### Requirement: Delete an extension
Each extension in a logged-in curator's row SHALL have a delete button that asks for
confirmation, and confirming SHALL remove the extension fact and its term individual, keeping
the individual when another fact points at it or it is part of another annotation.

#### Scenario: A plain extension term
- **WHEN** the curator clicks an extension's delete button
- **THEN** a dialog asks "Confirm Delete?" / "You are about to delete an extension." with "Cancel" and "Delete"
- **AND** confirming sends removal of the fact and of the term individual, toasting "Annotation Extension successfully deleted."

#### Scenario: A shared term
- **WHEN** the extension's term individual is also another annotation's gene product
- **THEN** Minerva receives removal of the fact only

### Requirement: Toggle the NOT qualifier
The row menu SHALL offer "Add NOT Qualifier", or "Remove NOT Qualifier" when the row is NOT, and
after confirmation SHALL replace the GO term individual's class expression with its complement
(or the plain class), as a remove-type and add-type on that individual.

#### Scenario: Adding NOT
- **WHEN** the curator chooses "Add NOT Qualifier" on a row with GO term C
- **THEN** a dialog asks "Confirm Update?" / "You are about to update NOT Qualifier." with "Cancel" and "Update"
- **AND** confirming sends remove-type C and add-type NOT C on the GO term individual
- **AND** the toast reads "NOT Qualifier successfully updated."

### Requirement: Add a comment to every fact
The row menu's "Add Comment" SHALL open a "Comment" editor, and on save every fact of the row's
subgraph SHALL end up with the row's existing comments plus the new trimmed one (its own comments
removed and the full list added). A blank comment SHALL warn "Please enter a comment."

#### Scenario: An "involved in" row
- **WHEN** the curator adds the comment "checked" to an "involved in" row
- **THEN** both the `enabled_by` and the `part_of` facts carry "checked" alongside the earlier comments
- **AND** the toast reads "Comment successfully added."

### Requirement: Comments panel
The right-hand "Comments" panel SHALL list, in table order, every annotation that has comments,
each headed by its gene product, "NOT " when negated, relation and GO term, with each comment
under the evidence date (or the row's date), and SHALL close with "Close".

#### Scenario: No comments
- **WHEN** no annotation has comments
- **THEN** the panel shows "No annotation has comments yet"

#### Scenario: Picking an annotation
- **WHEN** the curator picks an annotation in the table or clicks one of its comments in the panel
- **THEN** that annotation is highlighted and scrolled into view

#### Scenario: Logged out
- **WHEN** a logged-out visitor opens the Comments panel
- **THEN** the comments are listed with no "Edit comments" buttons

### Requirement: Replace an annotation's comments
For a logged-in curator each annotation in the Comments panel SHALL have an "Edit comments"
button opening a "Comments" dialog to edit, add and remove comments, and "Save" SHALL set exactly
the edited list (blank ones dropped, duplicates collapsed) on every fact of the row's subgraph.

#### Scenario: Replacing comments
- **WHEN** the curator edits a row's comments to ["a", "b"] and clicks "Save"
- **THEN** every fact of the row has its old comments removed and "a" and "b" added
- **AND** the toast reads "Comment(s) successfully updated."

#### Scenario: Cancelling
- **WHEN** the curator clicks "Cancel" in the dialog
- **THEN** nothing is sent

### Requirement: Add More Gene(s)
The row menu's "Add More Gene(s)" SHALL open a "Gene List" dialog where the curator pastes gene
product ids and clicks "Load Genes", and "Save" SHALL create, in one batch, a copy of the
annotation for each matched gene with new individuals and the same relation, GO term with its
NOT, extensions, evidence code, references, with/from and comments.

#### Scenario: Copying onto two genes
- **WHEN** two pasted ids match gene products and the curator saves
- **THEN** Minerva receives one batch creating two new annotations, ending in a store
- **AND** the toast reads "2 Annotation(s) successfully created."

#### Scenario: Lookup results
- **WHEN** the curator loads ids (one per line, comma-separated or a JSON-style list)
- **THEN** they are shown in tabs "Matched (N)", "Unmatched (N)" and "Not Found (N)"
- **AND** "Save" is enabled only when some gene matched, and only matched genes are copied onto

#### Scenario: Too many or failed
- **WHEN** more than 150 ids are loaded, or the lookup fails
- **THEN** the warning "Too many genes to search. Please enter less than 150 genes." or the error "Gene lookup failed. Please try again." shows

#### Scenario: A relation that cannot be written
- **WHEN** the row's relation cannot be named
- **THEN** saving warns ""`<relation>`" annotations can't be copied to other genes." and sends nothing

### Requirement: Add More Reference(s)
The row menu's "Add More Reference(s)" SHALL open a "Reference List" dialog where the curator
pastes PMIDs and clicks "Load References" to look them up on PubMed, and "Save" SHALL create, in
one batch, one copy of the annotation per found PMID with that PMID alone as its evidence's
`source`, keeping the evidence code, with/from, relation, GO term with its NOT, extensions and
comments (#93).

#### Scenario: Two new papers and one already cited
- **WHEN** the annotation cites `PMID:1` and the curator loads `1, 2, PMID: 3`, both 2 and 3 on PubMed, and saves
- **THEN** "Already Cited (1)" lists `PMID:1`
- **AND** Minerva receives two new annotations, one with `source` `PMID:2` and one with `source` `PMID:3`, each with the original evidence code and with/from
- **AND** the toast reads "2 Annotation(s) successfully created."

#### Scenario: Accepted input
- **WHEN** the curator pastes `12345`, `PMID:12345` or `PMID: 12345`, one per line or separated by commas, semicolons, spaces or `|`
- **THEN** each is read as `PMID:12345`, and duplicates once

#### Scenario: Lookup results
- **WHEN** the references are loaded
- **THEN** tabs "Found (N)" (each linked to PubMed with title, authors and date), "Not Found (N)" (not on PubMed, or not a PMID) and "Already Cited (N)" show
- **AND** "Save" is enabled only when some paper was found

#### Scenario: Too many or failed
- **WHEN** more than 50 PMIDs are loaded, or the lookup fails
- **THEN** the warning "Too many references to search. Please enter at most 50 PMIDs." or the error "PubMed lookup failed. Please try again." shows

#### Scenario: A relation that cannot be written
- **WHEN** the row's relation cannot be named
- **THEN** saving warns ""`<relation>`" annotations can't be copied to other references." and sends nothing
