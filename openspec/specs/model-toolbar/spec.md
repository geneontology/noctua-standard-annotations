# model-toolbar Specification

## Purpose
Show the open model's own properties in a bar above the annotations table — title, error count,
model comments, state, date and contributors — and give each editable property its own small
form: Edit Title, Change State and Model Comments each write only their own model annotation,
and Model Details summarizes the model and holds the acting-group choice.
Edits to a model of a group the curator does not belong to are preceded by a warning. The bar
also links the model to the other Noctua tools and exports.

## Requirements

### Requirement: Toolbar contents
When a model is loaded, the system SHALL show a toolbar with, in order: the title, the model errors chip, a "Model comments" button with a badge giving the comment count (0 included), a state chip when the model has a state, a date chip when it has a date, contributor chips, and the "VIEW" and "EXPORT AS" menus. The title SHALL read "Title:" followed by the model title, or "Untitled", with the title (or "No title") as a tooltip. Without a loaded model the toolbar SHALL show nothing.

#### Scenario: A loaded model
- **WHEN** the curator opens a model titled "enabled by ALPHA1 Hsap" in state development, dated 2024-05-02, with one model comment
- **THEN** the toolbar reads "Title:enabled by ALPHA1 Hsap", shows a "development" chip and a "2024-05-02" chip, and the comments badge reads 1

#### Scenario: Comment tooltip
- **WHEN** the curator hovers the model comments button
- **THEN** the tooltip reads "<N> model comment" or "<N> model comments", or "No model comments" when there are none

#### Scenario: No model
- **WHEN** no model is loaded
- **THEN** no title, chips or menus are shown

### Requirement: State chip
The state chip SHALL show the model's first state with underscores replaced by spaces, coloured by state. For a logged-in curator it SHALL be clickable, show a pencil, and open Change State; logged out it SHALL be plain text.

#### Scenario: Logged out
- **WHEN** no curator is logged in
- **THEN** the state is shown but is not a button and shows no pencil

### Requirement: Each control opens its own form
The system SHALL open a separate dialog per control: the title pencil ("Edit model title", logged in only) opens "Edit Title"; the state chip opens "Change State"; the model comments button opens "Model Comments"; the date chip and each contributor chip open "Model Details".

#### Scenario: Opening the forms
- **WHEN** the logged-in curator clicks the title pencil, the state chip, the comments button or the date chip
- **THEN** the dialog "Edit Title", "Change State", "Model Comments" or "Model Details" opens, respectively

#### Scenario: Logged out
- **WHEN** no curator is logged in
- **THEN** there is no title pencil and the state chip opens nothing, but the comments button still opens "Model Comments"

### Requirement: Warning before editing another group's model
Before opening Edit Title, Change State or Model Comments, and before deleting selected annotations, the system SHALL warn a logged-in curator who belongs to none of the model's groups, with the dialog "Warning: Editing another group's model" reading "You are about to edit a model associated with a different group(s) (<group names, comma-separated>). Do you want to continue or cancel?", an emphasized "Cancel" and "Continue and edit anyway". The form SHALL open only on "Continue and edit anyway".

#### Scenario: Continuing
- **WHEN** a logged-in curator outside the model's group "Other Group" clicks the title pencil
- **THEN** the warning names "(Other Group)" and Edit Title is not open
- **AND** after "Continue and edit anyway" Edit Title opens

#### Scenario: Cancelling
- **WHEN** the curator clicks "Cancel" on the warning
- **THEN** no form opens

#### Scenario: No warning needed
- **WHEN** the curator belongs to one of the model's groups, the model has no group, or no curator is logged in
- **THEN** the form opens directly

#### Scenario: Model Details needs no warning
- **WHEN** a curator outside the model's group clicks the date chip
- **THEN** Model Details opens without the warning

### Requirement: Edit Title
Edit Title SHALL show a "Title" text area holding the current title. Saving SHALL send one batch that removes every current `title` model annotation, adds the trimmed new title, and stores the model; no other model annotation is touched. "Save" SHALL be disabled when the trimmed title is blank (Minerva cannot store an untitled model) or unchanged with only one title on the model. On success the toast "Model title successfully updated." is shown and the dialog closes.

#### Scenario: Saving a new title
- **WHEN** the curator replaces the title and clicks "Save"
- **THEN** Minerva receives remove-annotation for each old title, add-annotation for the new title, and store
- **AND** the toast "Model title successfully updated." is shown and the dialog closes

#### Scenario: Blank or unchanged title
- **WHEN** the title is blank, or equals the model's only title
- **THEN** "Save" is disabled

#### Scenario: Logged out
- **WHEN** no curator is logged in and Edit Title is open
- **THEN** the title is read-only and the footer offers only "Close"

### Requirement: Change State
Change State SHALL offer a required "State" select of Development, Production, Review, Closed, Delete and Internal Test, plus the current state if it is not listed. Saving SHALL send one batch that removes every current `state` model annotation, adds the chosen state and stores the model, then show "Model state successfully updated." and close. "Save" SHALL be disabled until a state is chosen, and when the choice is the model's only state.

#### Scenario: Changing the state
- **WHEN** the curator changes development to Production and clicks "Save"
- **THEN** Minerva receives remove-annotation `state` development, add-annotation `state` production, and store

#### Scenario: A model carrying two states
- **WHEN** the model carries states review and development and the curator saves review
- **THEN** both states are removed and review is added once, then the model is stored

#### Scenario: A model without a state
- **WHEN** the model has no state and Change State is open
- **THEN** no state is preselected and "Save" is disabled

### Requirement: Model Comments
Model Comments SHALL list the model's own comments in an editable list. Saving SHALL send one batch that removes every current model `comment` annotation, adds each remaining comment once (trimmed, blanks dropped), and stores the model. On success the toast "Model comments successfully updated." is shown and the dialog closes. Logged out, the comments SHALL be shown read-only with only a "Close" button.

#### Scenario: Adding a comment
- **WHEN** the curator adds a comment and clicks "Save"
- **THEN** Minerva receives the removal of the old model comments, the addition of every comment, and store

#### Scenario: Logged out
- **WHEN** no curator is logged in and opens Model Comments
- **THEN** the comments are read-only and there is no "Save"

### Requirement: Saving a model form
While a model form is saving, its button SHALL read "Saving..." and be disabled. If Minerva or Barista reports an error, the system SHALL show the message as an error toast and keep the form open. A logged-in curator's footer SHALL offer "Cancel" and "Save"; a logged-out viewer's only "Close".

#### Scenario: A failed save
- **WHEN** Minerva rejects a Model Comments save
- **THEN** the error message is shown as a toast and the form stays open with the curator's edits

### Requirement: Model Details
Model Details SHALL show a "Model Summary" listing "Contributors:" and "Groups:" (joined by "; ", or "—" when empty) and "Open In:" links to the Pathway Editor, Form Editor and Graph Editor. For a logged-in curator in at least one group it SHALL also hold the acting-group choice; what that choice does is specified under access-control ("Acting group").

#### Scenario: Logged out
- **WHEN** no curator is logged in and opens Model Details
- **THEN** only the "Model Summary" is shown, with a "Close" button

### Requirement: Contributor chips
The toolbar SHALL show the model's first two contributors as chips (name, or IRI when the name is unknown); each opens Model Details. When there are more, a "+<N> more" button SHALL open a menu listing the remaining contributors.

#### Scenario: Four contributors
- **WHEN** the model has four contributors
- **THEN** two contributor chips and a "+2 more" button are shown, and the button lists the other two

### Requirement: Links to other Noctua tools and exports
The "VIEW" menu SHALL offer "Annotation Preview" and "Graph Editor"; the "EXPORT AS" menu SHALL offer "GPAD" and "OWL". Each item SHALL open in a new tab. Links to other editors SHALL carry the model id and, when the curator is logged in, the Barista token; the exports SHALL be Noctua's `download/<model id>/gpad` and `download/<model id>/owl`.

#### Scenario: Viewing in the Graph Editor
- **WHEN** the logged-in curator chooses VIEW → "Graph Editor"
- **THEN** Noctua's graph editor opens in a new tab at `editor/graph/<model id>` with `barista_token=<token>`

#### Scenario: Exporting
- **WHEN** the curator chooses EXPORT AS → "GPAD"
- **THEN** a new tab opens Noctua's `download/<model id>/gpad`
