# term-search Specification

## Purpose
How curators find the entities an annotation points to: the term search boxes (gene product, GO
term, evidence code, extension term) that query GOlr as the curator types and first offer the
terms already used in the model; the gene id lookup behind Add More Gene(s); the PubMed lookups
behind the reference picker and Add More Reference(s); and the link-outs that open an id in its
database.

## Requirements

### Requirement: Term search against GOlr
The system SHALL search GOlr's `select` endpoint (the Noctua GOlr server) over JSONP, since GOlr
does not allow cross-origin requests. Each search MUST ask for `document_category:"ontology_class"`
documents with `defType=edismax`, at most 50 rows, and these field boosts: `annotation_class^3`,
`annotation_class_label_searchable^5.5`, `description_searchable^1`, `comment_searchable^0.5`,
`synonym_searchable^1`, `alternate_id^1`, `isa_closure^1`, `isa_closure_label_searchable^1`.

#### Scenario: Searching for a term
- **WHEN** the curator types `nucleus` into the GO Term box
- **THEN** GOlr receives a JSONP `select` request with `q=nucleus*`, `fq=document_category:"ontology_class"`, the field's range filter, and `rows=50`

### Requirement: Search text
The system SHALL append `*` to the last word of the search text when the text contains only
letters, digits and spaces, does not end with a space, and is either several words or a single
word of at least 3 characters. Any other text MUST be sent as typed.

#### Scenario: Prefix search
- **WHEN** the curator types `cell cyc`
- **THEN** GOlr is asked for `cell cyc*`

#### Scenario: Id or punctuation
- **WHEN** the curator types `GO:0005634`
- **THEN** GOlr is asked for `GO:0005634` unchanged

#### Scenario: Trailing space
- **WHEN** the curator types `kinase ` (ending in a space)
- **THEN** GOlr is asked for `kinase` with no `*`

### Requirement: When a search runs
The system SHALL search only text the curator has typed, starting from 3 characters and 300 ms
after the last keystroke. A value already filled into the box (a selected term, or the current
term when a row editor opens) MUST NOT be searched.

#### Scenario: Fewer than three characters
- **WHEN** the curator has typed `nu`
- **THEN** no GOlr request is sent
- **AND** the open list (if it has nothing else to offer) says "Type at least 3 characters to search"

#### Scenario: Pre-filled value
- **WHEN** a row editor opens with the annotation's current GO term in the box
- **THEN** no GOlr request is sent until the curator types

### Requirement: Search ranges
The system SHALL restrict each search box to its range by sending GOlr one filter that matches any
of the range's classes (`isa_closure:"<id>"`) and excludes the range's excluded classes and id
spaces. The GO term and extension term boxes MUST use the range the chosen relation allows. A box
with an empty range MUST NOT search and SHALL say "No terms can be searched here yet".

#### Scenario: Gene product search
- **WHEN** the curator searches in the Gene Product box
- **THEN** GOlr's filter is `isa_closure:"CHEBI:33695" OR isa_closure:"GO:0032991" OR NOT idspace:"GO"`
- **AND** a complex found is a ComplexPortal entity, never a GO term

#### Scenario: Evidence search
- **WHEN** the curator searches in the Evidence box
- **THEN** GOlr's filter is `isa_closure:"ECO:0000352"`

#### Scenario: GO term before a gene product is chosen
- **WHEN** the GO Term box has no range yet and the curator types in it
- **THEN** no GOlr request is sent
- **AND** the list says "No terms can be searched here yet"

### Requirement: Terms already in the model offered first
The system SHALL, until a search runs, offer the terms already used in the open model that fall in
the box's range (for the evidence box, the evidence codes used in the model), each listed once.
Once a search runs the list MUST show exactly GOlr's results for the current text, never the
results of an earlier search.

#### Scenario: Focusing the GO term box
- **WHEN** the curator focuses the GO Term box without typing
- **THEN** the list shows the model's terms that fit the current range

#### Scenario: A search with no results
- **WHEN** a search returns nothing
- **THEN** the list says "No results found" and shows none of the previous options

#### Scenario: A failed search
- **WHEN** the GOlr request fails
- **THEN** the list says "The term search failed. Try again."

### Requirement: Search results display
The system SHALL list each result with its label and its id, the id linking to the term's page in a
new tab. Evidence code results MUST also show the code's abbreviation (its first database xref,
e.g. `IDA`). A loader SHALL show in the box while a search is running. Selecting a result MUST show
it in the box as `<label> (<id>)`.

#### Scenario: Picking a GO term
- **WHEN** the curator clicks the result "nucleus" with id `GO:0005634`
- **THEN** the box shows `nucleus (GO:0005634)` and the list closes

#### Scenario: Evidence results
- **WHEN** the curator searches in the Evidence box
- **THEN** each result shows the ECO label, the code's abbreviation in bold, and the ECO id

### Requirement: Obsolete and do-not-annotate terms
The system SHALL show obsolete results struck through and faded, and results in GOlr's
`gocheck_do_not_annotate` subset on a red background with the tooltip "Do not annotate"; neither
can be selected by click or keyboard. In a box whose range is a phase or stage category, do-not-
annotate terms MUST be selectable like any other term; elsewhere, phase and stage terms from the
model MUST be offered as not selectable.

#### Scenario: A do-not-annotate GO term
- **WHEN** a search returns a term in `gocheck_do_not_annotate`
- **THEN** it is shown in red with "Do not annotate" and cannot be picked

#### Scenario: A phase extension
- **WHEN** the extension relation's range is a phase or stage and a result is in `gocheck_do_not_annotate`
- **THEN** that result can be picked

### Requirement: Editing the text abandons the pick
The system SHALL clear the selected term as soon as the curator edits the box's text, leaving the
typed text to be searched.

#### Scenario: Changing a chosen term
- **WHEN** the box holds `nucleus (GO:0005634)` and the curator edits the text
- **THEN** the field no longer has a selected term
- **AND** the text the curator typed is kept

### Requirement: Keyboard use of the result list
The system SHALL let the curator move through the open list with Arrow Down / Arrow Up (wrapping
at the ends), pick the highlighted result with Enter, and close the list with Escape. The list
SHALL close 200 ms after the box loses focus.

#### Scenario: Picking with the keyboard
- **WHEN** the list is open and the curator presses Arrow Down twice and Enter
- **THEN** the second result is selected

### Requirement: A term's ancestors
The system SHALL look up a term's `isa_closure` (its ancestors and itself) from GOlr with an exact
`annotation_class:"<id>"` query when a rule needs to know whether the term belongs to a subclass
of its root category, and SHALL treat an id GOlr does not know as having no ancestors.

#### Scenario: Unknown id
- **WHEN** GOlr returns no document for the id
- **THEN** the term is treated as having an empty closure

### Requirement: Gene id lookup
The system SHALL resolve pasted gene product ids with one GOlr request
`annotation_class:"<id1>" OR annotation_class:"<id2>" ...` (rows = number of ids), keeping only
exact id matches, and sort them into **Matched** (found with a label), **Unmatched** (found
without a label) and **Not Found**. More than 150 ids MUST be refused with the warning
"Too many genes to search. Please enter less than 150 genes."; a failed lookup MUST toast
"Gene lookup failed. Please try again.".

#### Scenario: Pasted id formats
- **WHEN** the curator pastes ids one per line, comma separated, or as a JSON list
- **THEN** quotes and punctuation other than `:`, `-`, `_` and `.` are dropped
- **AND** pieces shorter than 5 characters are ignored and duplicates removed

#### Scenario: Mixed ids
- **WHEN** the curator pastes `UniProtKB:Q9P258, WB:WBGene0000009` and clicks **Load Genes**, and GOlr knows only the first, with a label
- **THEN** the **Matched (1)** tab lists `UniProtKB:Q9P258` with its label
- **AND** the **Not Found (1)** tab lists `WB:WBGene0000009`

#### Scenario: Too many ids
- **WHEN** the curator loads 151 distinct ids
- **THEN** no request is sent and the warning "Too many genes to search. Please enter less than 150 genes." is shown

### Requirement: PubMed preview in the reference picker
The system SHALL, when the reference database is `PMID` and the accession has at least 4
characters, look the paper up on NCBI's PubMed esummary service 500 ms after the last keystroke and
show its title (linking to the paper on PubMed), authors and publication date under the
accession. A PMID PubMed does not know, or a failed lookup, MUST show no preview.

#### Scenario: Typing a PMID
- **WHEN** the curator picks `PMID:` and types `12345678`
- **THEN** after 500 ms the picker shows the paper's title, authors and date

#### Scenario: Short accession
- **WHEN** the accession has fewer than 4 characters
- **THEN** PubMed is not asked

### Requirement: PubMed batch lookup
The system SHALL look up pasted PMIDs in one PubMed esummary request (bare numbers, comma
separated) and sort them into **Found** (on PubMed and not yet the annotation's reference),
**Not Found** (not on PubMed, or not a PMID at all) and **Already Cited**. More than 50 PMIDs
MUST be refused with the warning "Too many references to search. Please enter at most 50 PMIDs.";
a failed lookup MUST toast "PubMed lookup failed. Please try again.".

#### Scenario: Pasted PMID formats
- **WHEN** the curator pastes `12345`, `PMID:12345` and `PMID: 12345`, separated by lines, commas, semicolons, spaces or `|`
- **THEN** each becomes `PMID:12345` and duplicates are removed

#### Scenario: Mixed PMIDs
- **WHEN** the annotation cites `PMID:111` and the curator pastes `PMID:111, 222, abc` and clicks **Load References**, and PubMed knows 222
- **THEN** **Found (1)** lists `PMID:222` with its title, authors and date
- **AND** **Not Found (1)** lists `abc`
- **AND** **Already Cited (1)** lists `PMID:111`

### Requirement: Link-outs for ids
The system SHALL link ids to an external page: ECO ids to the Evidence Ontology term page, PMIDs to
PubMed, GO_REF ids to the geneontology.org GO_REF page, and other ids through the GO database
cross-reference template for their prefix. In the annotations table ids MUST link to the issuing
database's own page; in search results, gene product and complex ids MUST link to the AmiGO gene
product page. An id with an unknown prefix or no `:` MUST be shown as plain text.

#### Scenario: Prefix without its own template in the table
- **WHEN** a row shows a `ComplexPortal:` or `Xenbase:` id
- **THEN** it links to the AmiGO gene product page for that id

#### Scenario: Gene product in the table
- **WHEN** a row's gene product is `UniProtKB:P12345`
- **THEN** its id links to `http://www.uniprot.org/uniprot/P12345`

#### Scenario: Gene product in search results
- **WHEN** a gene product search returns `UniProtKB:P12345`
- **THEN** its id links to `https://amigo.geneontology.org/amigo/gene_product/UniProtKB:P12345`

#### Scenario: Unknown prefix
- **WHEN** an id's prefix has no link template
- **THEN** the id is shown without a link
