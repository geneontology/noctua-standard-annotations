# annotation-table Specification

## Purpose
The Standard Annotations page shows the open model's standard annotations as a table, one row
per annotation, below the create form. Each row is read out of the model's GO-CAM facts: which
fact starts it, which relation the curator sees, its gene product, GO term, evidence, reference,
with/from, extensions, NOT qualifier, contributors, date and comments. Curators can sort the
table (the choice is remembered in the browser) and, when logged in, tick rows to act on a
selection. Logged-out visitors see the same table read-only.

## Requirements

### Requirement: Page layout for a model
The page SHALL load the model named by the `model_id` address-bar parameter and, once loaded,
show the create form above the annotations table.

#### Scenario: No model in the address bar
- **WHEN** the page is opened without `model_id`
- **THEN** it shows "No model selected. Open Standard Annotations from Noctua with a model_id."

#### Scenario: The model cannot be loaded
- **WHEN** the first read of `<id>` fails with `<message>`
- **THEN** the page shows "Could not load `<id>`: `<message>`" instead of the form and table

#### Scenario: A refresh fails after the model was shown
- **WHEN** a later read of the model fails with `<message>`
- **THEN** the last model stays on the page
- **AND** an error toast reads "Could not refresh the model: `<message>`"

### Requirement: Which facts start a row
The table SHALL show one row per `enabled_by` fact, and one row per `located_in`, `is_active_in`,
`part_of` or `contributes_to` fact whose subject is a gene product, where a gene product is a
molecular entity or a protein-containing complex that is not a GO class (for example a
ComplexPortal entity).

#### Scenario: An "enables" annotation
- **WHEN** the model holds `MF enabled_by GP`
- **THEN** the table has a row with gene product GP and GO term MF

#### Scenario: A cellular component annotation
- **WHEN** the model holds `GP located_in CC` and GP is a gene product
- **THEN** the table has a row with gene product GP and GO term CC

#### Scenario: A GO complex as subject does not start a row
- **WHEN** the model holds `X part_of Y` where X is a GO protein-containing complex class
- **THEN** that fact does not start a row

#### Scenario: Row count and empty state
- **WHEN** the model has N annotations
- **THEN** the table heading reads "Standard Annotations" followed by "( N )"
- **AND** with N = 0 the table area shows "No annotations available to display"

### Requirement: GO term of an annotation stored through a root molecular function
For an `enabled_by` fact whose subject is the root `molecular_function` (GO:0003674), the system
SHALL take the GO term from that MF's outgoing `part_of`, `occurs_in` or causally-upstream fact,
preferring a fact whose relation the table can name over one it cannot (such as `occurs_in`),
and the last such fact in model order otherwise.

#### Scenario: "involved in" annotation
- **WHEN** the model holds `GO:0003674 enabled_by GP` and `GO:0003674 part_of BP`
- **THEN** the row's GO term is BP and its relation reads "involved in"

#### Scenario: A nameable relation wins over occurs_in
- **WHEN** a root MF has both an `occurs_in CC` fact and a `causally_upstream_of BP` fact
- **THEN** the row's GO term is BP

### Requirement: Relation shown
The Relationship column SHALL show the gene-product-centric relation (the inverse of the stored
facts) that matches how the annotation is stored, and a stored shape it cannot name SHALL show
the stored fact's label.

#### Scenario: An "enables" annotation is named
- **WHEN** the model holds `MF enabled_by GP` and MF is not the root molecular_function
- **THEN** the row's relation reads "enables"

#### Scenario: Relations stored through a root molecular function
- **WHEN** a root MF `enabled_by GP` has `part_of`, `causally_upstream_of` or
  `causally_upstream_of_or_within` (or a positive or negative effect form of the causal ones) to a BP
- **THEN** the row's relation is "involved in", "acts upstream of" or "acts upstream of or within"
  (or the matching positive or negative effect form)

#### Scenario: Relations stored from the gene product
- **WHEN** the model holds `GP located_in | is_active_in | part_of | contributes_to term`
- **THEN** the row's relation is "located in", "is active in", "part of" or "contributes to"

#### Scenario: An acts-upstream annotation
- **WHEN** the model holds `GO:0003674 enabled_by GP` and `GO:0003674 causally_upstream_of_or_within BP`
- **THEN** the row's relation is the "acts upstream of or within" relation

#### Scenario: A root MF occurs_in from another editor
- **WHEN** a root MF's only term fact is `occurs_in CC`
- **THEN** the relation cell shows that fact's label
- **AND** the relation cell offers no edit button

### Requirement: An annotation's subgraph
Each row SHALL own the facts reachable from its start over GO-CAM shape predicates, without
following activity-to-activity causal facts (except a root MF's acts-upstream fact to a BP),
without taking another annotation's start fact, and stopping at an individual another
annotation is rooted at. A cellular-component-style row SHALL own only its own start fact from
the gene product.

#### Scenario: Two annotations on one gene product individual
- **WHEN** one gene product individual is the subject of both `located_in CC1` and `is_active_in CC2`
- **THEN** the table shows two rows, each with only its own fact

#### Scenario: A causal fact between activities
- **WHEN** an MF row's term has `causally_upstream_of` another annotation's MF
- **THEN** neither row absorbs the other's facts

### Requirement: Gene product and GO term cells
The Gene Product and Term cells SHALL show the term's label above its identifier, the identifier
linked to its source database, and the NOT qualifier SHALL show as a bold "NOT" before the
relation when the GO term individual is a complement class expression.

#### Scenario: A NOT annotation
- **WHEN** the row's GO term individual is stored as the complement of GO:0005634
- **THEN** the Relationship cell reads "NOT" in bold followed by the relation label
- **AND** the Term cell shows GO:0005634's label and linked identifier

### Requirement: Evidence, reference and with/from cells
The Evidence, Reference and With cells SHALL show the first evidence of the row's start fact:
the evidence code's label above its linked ECO identifier; each reference as its own link, a
`|`-joined reference split into separate links, listed in descending order; and the with/from
string as stored, wrapping after `:`, `|` and `,` rather than inside an accession.

#### Scenario: Several references on one evidence
- **WHEN** the start fact's evidence has sources `PMID:1` and `PMID:2`
- **THEN** the Reference cell shows two links, `PMID:2` above `PMID:1`

#### Scenario: A pipe-joined reference
- **WHEN** an evidence source is stored as `PMID:1| PMID:2`
- **THEN** each part is shown as its own link

#### Scenario: No evidence
- **WHEN** the start fact has no evidence
- **THEN** the Evidence, Reference and With cells are empty

### Requirement: Extensions cell
The Extension cell SHALL list the GO term's outgoing facts that the GO-CAM shapes allow as
extensions, each as the relation label in italics above the target term's label and its linked
identifier. A fact SHALL count as an extension when the shapes allow its relation between the
two terms' root types, or allow it for any subclass of the GO term's root type, or when it is a
causal relation the shapes allow between the two terms and its target is not another
annotation's root.

#### Scenario: A subclass rule (#85)
- **WHEN** a BP row's GO term has `results in development of` an anatomy term, a rule the shapes
  key on a subclass of biological_process
- **THEN** the Extension cell shows "results in development of" with the anatomy term

#### Scenario: A causal extension
- **WHEN** a BP row's GO term has `regulates` another BP that is not an annotation's root
- **THEN** the Extension cell shows the regulates extension

#### Scenario: A fact that is not an extension
- **WHEN** the GO term has an outgoing fact whose relation the shapes do not allow as an extension
- **THEN** it is not listed in the Extension cell

### Requirement: Contributor and date cells
The Contributor cell SHALL show each contributor of the row's individuals, facts and evidence
once per ORCID, as a chip linking to the ORCID with the contributor's name, or the bare ORCID id
when no name is known. The Date Modified cell SHALL show the latest date among the row's
individuals and evidence, formatted like "Mar 5, 2024".

#### Scenario: A contributor without a name
- **WHEN** a fact's contributor is `https://orcid.org/0000-0002-1234-5678` and Barista has no name for it
- **THEN** the chip reads `0000-0002-1234-5678` and links to the ORCID

#### Scenario: Latest date
- **WHEN** the row's individuals and evidence carry dates 2023-01-02 and 2024-03-05
- **THEN** the Date Modified cell reads "Mar 5, 2024"

### Requirement: Comments cell
The comments cell SHALL show, for a row with comments, a comment icon with the number of
distinct comments across the row's facts; hovering SHALL show the comments joined with " | ", and
clicking SHALL open the Comments panel with that annotation highlighted. A row without comments
SHALL show nothing in that cell.

#### Scenario: Opening the comments of a row
- **WHEN** the curator clicks the comment icon of a row with two comments
- **THEN** the right-hand Comments panel opens
- **AND** that annotation is highlighted and scrolled into view
- **AND** the row's comments cell is highlighted

### Requirement: Sorting
The Gene Product, Relationship, Term, Evidence, Reference, With, Contributor and Date Modified
headers SHALL sort the table when clicked: first ascending, then descending, then back to the
default order (gene product label ascending). Ties SHALL fall back to the annotation's fact id so
the order is stable. The Extension and comments columns SHALL NOT be sortable.

#### Scenario: Cycling a column
- **WHEN** the curator clicks the Term header three times
- **THEN** the table is sorted by GO term label ascending, then descending, then by gene product
  label ascending

#### Scenario: Default order
- **WHEN** no sort has been chosen
- **THEN** rows are ordered by gene product label ascending

### Requirement: Remembered sort order
The chosen sort SHALL be stored in the browser's local storage under the key
`annotationActivitySortBy` and restored when the page is opened again; a missing, unreadable or
unknown stored value SHALL fall back to the default order, and blocked storage SHALL still apply
the chosen order for the session.

#### Scenario: Reopening the page
- **WHEN** the curator sorted by Date Modified descending and reopens the page
- **THEN** the table is sorted by Date Modified descending

#### Scenario: An unknown stored column
- **WHEN** the stored value names a column the table does not have
- **THEN** the table is ordered by gene product label ascending

### Requirement: Read-only table when logged out
When no curator is logged in, the table SHALL show every column's content but SHALL offer no row
checkboxes, no select-all checkbox, no cell edit buttons, no row action menu and no extension
delete buttons.

#### Scenario: Logged-out visitor
- **WHEN** a logged-out visitor opens a model with annotations
- **THEN** the rows show their data
- **AND** no "Annotation actions" button and no "Edit GO term" button exist

#### Scenario: Logged-in curator
- **WHEN** a logged-in curator hovers a cell of a row
- **THEN** that cell's edit button shows
- **AND** each row has an "Annotation actions" menu button

### Requirement: Row selection
For a logged-in curator the table SHALL show a checkbox on every row and a select-all header
checkbox, highlight ticked rows, and while any row is ticked show a selection bar reading
"`<N>` selected" with a "Clear" button. Ticked rows no longer in the model after a refresh SHALL
drop out of the selection. The selection bar's "Delete" action belongs to the
`annotation-deletion` capability.

#### Scenario: Checkbox labels
- **WHEN** a logged-in curator views a row for gene product G and GO term T
- **THEN** its checkbox is labelled "Select annotation G T"
- **AND** the header checkbox is labelled "Select all annotations", or "Clear selection" once every row is ticked

#### Scenario: Ticking rows
- **WHEN** the curator ticks two of five rows
- **THEN** both rows are highlighted
- **AND** the selection bar reads "2 selected"
- **AND** the header checkbox is indeterminate

#### Scenario: Select all and clear
- **WHEN** the curator clicks the header checkbox
- **THEN** every row is ticked and the header checkbox is labelled "Clear selection"
- **AND** clicking it again unticks every row

#### Scenario: A ticked row disappears
- **WHEN** a ticked row's start fact is no longer in the model after a refresh
- **THEN** it is no longer counted in the selection bar
