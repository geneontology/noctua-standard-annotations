# annotation-deletion Specification

## Purpose
Let a logged-in curator remove standard annotations from the open model, either one row at a
time from the row's action menu or several ticked rows at once from a selection bar, with one
confirmation and one Minerva batch per delete. A delete removes each annotation's starting fact
and the individuals only it uses (Minerva removes the facts' evidence with them), then stores
the model. Because Minerva cannot store a model with no individuals, a delete that would empty
the model is refused before anything is sent.

## Requirements

### Requirement: Delete one annotation from its row
The system SHALL offer a "Delete Annotation" item in each row's action menu ("Annotation actions") to a logged-in curator, and SHALL delete the annotation only after the curator confirms a dialog titled "Confirm Delete?" with the message "You are about to delete an annotation." and the buttons "Cancel" and "Delete".

#### Scenario: Deleting a row after confirming
- **WHEN** the logged-in curator opens a row's action menu, chooses "Delete Annotation" and clicks "Delete"
- **THEN** one batch is sent to Minerva that removes that annotation
- **AND** on success the toast "Annotation successfully deleted." is shown and the refreshed table no longer lists the row

#### Scenario: Cancelling the confirmation
- **WHEN** the curator chooses "Delete Annotation" and then clicks "Cancel"
- **THEN** the dialog closes and nothing is sent to Minerva

#### Scenario: Logged out
- **WHEN** no curator is logged in
- **THEN** rows show no action menu, so no annotation can be deleted

### Requirement: Selecting rows for deletion
The system SHALL show a checkbox in front of each row, labelled "Select annotation <gene product> <GO term>", and a header checkbox, only to a logged-in curator. The header checkbox SHALL be labelled "Select all annotations" and select every row when not all are selected, and SHALL be labelled "Clear selection" and clear the selection when all are selected; it SHALL show an indeterminate state when only some rows are selected. Selected rows SHALL be tinted.

#### Scenario: Ticking rows
- **WHEN** the logged-in curator ticks two rows
- **THEN** both rows are tinted and the header checkbox is indeterminate

#### Scenario: Selecting and clearing all rows from the header
- **WHEN** the curator clicks "Select all annotations"
- **THEN** every row in the table is selected
- **AND** clicking the same checkbox, now "Clear selection", clears the selection

#### Scenario: Logged out
- **WHEN** no curator is logged in
- **THEN** the table shows no checkboxes

### Requirement: Selection bar
While at least one row is selected, the system SHALL show a selection bar (a toolbar named "Selected annotations") beside the "Standard Annotations" heading with the text "<N> selected", a red "Delete" button with the tooltip "Delete selected annotations", and a "Clear" button that clears the selection. The bar SHALL disappear when nothing is selected.

#### Scenario: Two rows selected
- **WHEN** the curator has ticked two rows
- **THEN** the selection bar reads "2 selected" and offers "Delete" and "Clear"

#### Scenario: Clearing from the bar
- **WHEN** the curator clicks "Clear"
- **THEN** every row is unticked and the selection bar disappears

### Requirement: At most 13 annotations per delete
The system SHALL allow at most 13 annotations to be deleted at once. With more than 13 rows selected, the selection bar SHALL turn red, read "<N> selected — max 13", and disable its "Delete" button with the tooltip "Select 13 or fewer to delete". Any attempt to delete more than 13 by another path SHALL be refused with the warning "Select 13 or fewer annotations to delete." and nothing sent.

#### Scenario: Fourteen rows selected
- **WHEN** the curator selects 14 rows
- **THEN** the bar reads "14 selected — max 13" and its "Delete" button is disabled

#### Scenario: Back under the cap
- **WHEN** the curator then unticks one row
- **THEN** the bar reads "13 selected" and "Delete" is enabled again

### Requirement: Group warning before deleting selected rows
Before opening the delete confirmation from the selection bar, the system SHALL apply the same "editing another group's model" warning as the model toolbar's forms: when the logged-in curator belongs to none of the model's groups, the warning appears first and the confirmation opens only on "Continue and edit anyway". Deleting a single row from its action menu SHALL NOT show this warning.

#### Scenario: Deleting selected rows in another group's model
- **WHEN** the curator, who is not in the model's group, clicks the selection bar's "Delete"
- **THEN** the dialog "Warning: Editing another group's model" appears and the delete confirmation does not
- **AND** after "Continue and edit anyway" the delete confirmation opens

#### Scenario: Cancelling the warning
- **WHEN** the curator clicks "Cancel" on the warning
- **THEN** no delete confirmation opens and nothing is sent

### Requirement: Confirming a multi-row delete
The selection bar's "Delete" SHALL open a dialog titled "Confirm Delete?" that reads "You are about to delete <N> annotations." ("annotation" when N is 1), followed by a scrolling list named "Annotations to delete" with one line per selected annotation in table order: the gene product, "NOT" when the annotation is negated, the relation, the GO term label and the GO term id. The confirm button SHALL read "Delete <N>" and the other "Cancel".

#### Scenario: Confirming three selected rows
- **WHEN** the curator has selected three rows and clicks the selection bar's "Delete"
- **THEN** the dialog reads "You are about to delete 3 annotations." and lists the three annotations
- **AND** the confirm button reads "Delete 3"

#### Scenario: Deleting the selection
- **WHEN** the curator clicks "Delete 2" for two selected rows
- **THEN** one batch is sent to Minerva that removes both annotations and stores the model once
- **AND** on success the toast "Deleted 2 annotations." is shown

### Requirement: What a delete removes from Minerva
A delete SHALL send one batch that removes, in order: each deleted annotation's starting fact, then each individual of the deleted annotations that no remaining annotation uses, then stores the model. Nothing SHALL be removed twice, and evidence individuals SHALL NOT be removed explicitly: Minerva removes a fact's evidence with the fact, and fails a batch that repeats a removal before its store.

#### Scenario: Deleting an "enables" annotation stored with its own individuals
- **WHEN** the curator deletes an annotation stored as `MF enabled_by GP`
- **THEN** the batch first removes the `enabled_by` fact, then the annotation's individuals, then stores the model
- **AND** no evidence individual is named in the batch

#### Scenario: Deleting a "located in" annotation
- **WHEN** the curator deletes an annotation stored as `GP located_in CC`
- **THEN** the batch first removes the `located_in` fact, then the gene product and cellular component individuals, then stores the model

#### Scenario: An individual shared with an annotation that stays
- **WHEN** the curator deletes one of two annotations that share an individual (for example one gene product with two located-in annotations)
- **THEN** the shared individual is not removed, and the other annotation stays intact

#### Scenario: An individual shared only among the deleted annotations
- **WHEN** the curator deletes, together, every annotation that uses a shared individual
- **THEN** that individual is removed exactly once

### Requirement: A delete may not empty the model
The system SHALL refuse, with a warning and without sending anything, a delete that would leave the model with no individuals, since Minerva cannot store an empty model.

#### Scenario: Deleting the only annotation
- **WHEN** the curator confirms deleting the model's only annotation, and nothing else is in the model
- **THEN** the warning "This is the model's last annotation, and Minerva can't save an empty model. Delete the model from Noctua instead." is shown
- **AND** no batch is sent

#### Scenario: Deleting every annotation at once
- **WHEN** the curator selects every row of a model that holds nothing else and confirms the delete
- **THEN** the warning "These are all of the model's annotations, and Minerva can't save an empty model. Leave at least one, or delete the model from Noctua instead." is shown
- **AND** no batch is sent

#### Scenario: Other content keeps the model non-empty
- **WHEN** the model also holds an individual that no annotation uses, and the curator deletes every annotation
- **THEN** the delete is sent, because the model still has an individual left to store

### Requirement: Failed deletes
When Minerva or Barista reports an error for a delete, the system SHALL show the error message as an error toast and keep the last loaded model on the page.

#### Scenario: Minerva rejects the batch
- **WHEN** Minerva answers the delete batch with an error message
- **THEN** that message is shown as an error toast and the table still shows the rows

### Requirement: The selection follows the model
The selection SHALL be kept across other edits and refreshes, but each refresh of the model SHALL drop selected rows whose annotation no longer exists (deleted here or by another curator); opening a different model SHALL leave nothing selected.

#### Scenario: After a multi-row delete
- **WHEN** a delete of the selected rows succeeds and the model is refreshed
- **THEN** the deleted rows are no longer selected and the selection bar disappears

#### Scenario: Deleting one row while others are ticked
- **WHEN** the curator deletes a row from its action menu while two other rows are ticked
- **THEN** the other two rows stay selected after the refresh
