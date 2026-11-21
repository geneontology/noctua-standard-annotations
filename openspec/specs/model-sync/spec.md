# model-sync Specification

## Purpose
How the editor loads the open model from Minerva (through Barista), saves every edit back to it,
and keeps the page in step with Minerva: one stored batch per edit, a refresh after each write,
curator-facing messages for Minerva and Barista failures, the global loading overlay, the
"Not Saved" bar for a model with unstored changes, and the "Model Updated" dialog when another
window or user changes the open model.

## Requirements

### Requirement: Model chosen from the address bar
The system SHALL load the model named by the `model_id` query parameter, and SHALL show
"No model selected. Open Standard Annotations from Noctua with a model_id." when there is none.

#### Scenario: Opening the editor without a model
- **WHEN** the curator opens the editor with no `model_id` in the address
- **THEN** the page shows "No model selected. Open Standard Annotations from Noctua with a model_id."
- **AND** no request is sent to Minerva

#### Scenario: Opening the editor with a model
- **WHEN** the curator opens the editor with `?model_id=<id>`
- **THEN** a `model get` for `<id>` is sent to Minerva
- **AND** the create form and the annotations table are shown once the model arrives

### Requirement: Reading the model
The system SHALL read the model with a single `model get` request sent with `intention=query` and
no reasoner. When a Barista token is in use, the read MUST be a POST to the privileged batch
endpoint with the token in the form-encoded body (never in the URL); without a token it MUST be a
GET to the public batch endpoint. The read MUST wait until the editor knows whether a stored token
is still accepted.

#### Scenario: Logged-in read
- **WHEN** the curator has a Barista token and opens a model
- **THEN** Barista receives a POST to `m3BatchPrivileged` whose body carries `token`, `intention=query`, the acting group as `provided-by` (when the curator has one) and a `requests` list holding one `model get`
- **AND** the token does not appear in the request URL

#### Scenario: Logged-out read
- **WHEN** there is no Barista token
- **THEN** Barista receives a GET to the public `m3Batch` with `intention=query` and the `model get` in `requests`

#### Scenario: Stored token not yet confirmed
- **WHEN** the page starts with a token from local storage that Barista has not answered for yet
- **THEN** no model read is sent until Barista has answered (or failed to answer) for that token

### Requirement: Every edit is one stored batch
The system SHALL send each curator edit as one POST to the privileged batch endpoint, form-encoded
with `token`, `provided-by` (the acting group, when there is one), `intention=action` and
`requests`, and the request list MUST end with a model `store` so the edit is saved as it is made.

#### Scenario: Saving an edit
- **WHEN** the curator makes any edit (create, edit, delete, comment)
- **THEN** Minerva receives exactly one batch for it with `intention=action`
- **AND** the last request in the batch stores the model

#### Scenario: A successful edit
- **WHEN** the batch succeeds
- **THEN** the edit's success toast is shown
- **AND** the model is read again so the page shows what Minerva stored

### Requirement: Refresh after a write
The system SHALL re-read the open model after every successful write (edit, save or reset), and
SHALL replace the page's model with the result.

#### Scenario: Table reflects the stored model
- **WHEN** a write succeeds
- **THEN** a new `model get` is sent
- **AND** the annotations table is rebuilt from the model it returns

### Requirement: Minerva and Barista errors become messages
The system SHALL treat a batch response whose `message-type` (or `message_type`) is `error` as a
failure even though it arrives as HTTP 200, and SHALL show the curator a message for it: a
curator-facing wording for the known errors below, otherwise Minerva's own message. A failed
request with no message MUST read "Request failed (<status>)", or "Unknown error" when there is
nothing to report.

#### Scenario: A failed edit
- **WHEN** an edit's batch comes back with `message-type: "error"`
- **THEN** an error toast shows the message for that error
- **AND** no success toast is shown

#### Scenario: Missing permission
- **WHEN** Minerva's message contains `InsufficientPermissionsException`
- **THEN** the message reads "It seems like you do not have permission to perform that operation. Did you remember to log in?"

#### Scenario: Bad token
- **WHEN** the error message mentions a token
- **THEN** the message reads "It seems like you have a bad token. Please log in again."

#### Scenario: Empty model
- **WHEN** Minerva's message contains `Empty models should not be saved`
- **THEN** the message reads "Minerva can't save a model with no annotations left."

#### Scenario: Editing a part of the model that is gone
- **WHEN** Minerva answers an edit with `UnknownIdentifierException ... No individual found`
- **THEN** the error toast reads "Part of this annotation no longer exists in the model. Reload the page and try again."

#### Scenario: Unknown model
- **WHEN** Minerva's message contains `UnknownIdentifierException` without `No individual found`
- **THEN** the message reads "The model could not be found."

#### Scenario: Any other error
- **WHEN** Minerva's message matches none of the known errors
- **THEN** the curator sees Minerva's message as it is

### Requirement: A model that cannot be loaded
The system SHALL show "Could not load <model id>: <message>" in place of the page when the first
read of a model fails.

#### Scenario: Unknown model
- **WHEN** the curator opens `?model_id=gomodel:missing` and Minerva answers with an `UnknownIdentifierException`
- **THEN** the page shows "Could not load gomodel:missing: The model could not be found."

### Requirement: A failed refresh keeps the last model
The system SHALL keep showing the last loaded model when a later read fails, and SHALL show an
error toast "Could not refresh the model: <message>".

#### Scenario: Minerva fails after an edit
- **WHEN** the model is on the page and a refresh comes back with the error "Minerva is down"
- **THEN** the table still shows the last loaded annotations
- **AND** an error toast reads "Could not refresh the model: Minerva is down"
- **AND** the "Could not load" page is not shown

### Requirement: Toasts
The system SHALL show success, warning and error messages as toasts at the top center of the page
that close by themselves after 3 seconds unless a different duration is requested.

#### Scenario: Toast after an edit
- **WHEN** an edit succeeds
- **THEN** a green toast with the edit's message appears at the top center and closes after 3 seconds

### Requirement: Loading overlay
The system SHALL cover the page with a loading overlay while the first read of a model and every
write are in flight, with the message "Loading Model Activities..." for the first read,
"Deleting..." for a write batch that removes a fact or individual, "Saving..." for any other
write, and "Resetting Model..." for a reset. Refreshing a model that is already loaded MUST NOT
show the overlay. The overlay SHALL stay up for 300 ms after its request finishes.

#### Scenario: First load
- **WHEN** a model is read for the first time
- **THEN** the overlay shows "Loading Model Activities..."

#### Scenario: Refresh after an edit
- **WHEN** the model is re-read after a successful edit
- **THEN** the page stays visible and no overlay is shown for the read

#### Scenario: Deleting an annotation
- **WHEN** the curator deletes an annotation
- **THEN** the overlay shows "Deleting..." until the batch finishes

### Requirement: Not Saved bar
The system SHALL show a "Not Saved" bar with **Reset** and **Save** buttons above the model toolbar
when the curator is logged in, Minerva reports the model as modified but not stored
(`modified-p`), and the model has at least one annotation.

#### Scenario: A model with unstored changes
- **WHEN** a logged-in curator opens a model Minerva reports as modified
- **THEN** the bar shows "Not Saved" with **Reset** and **Save**

#### Scenario: Nothing unsaved or logged out
- **WHEN** the model is not modified, has no annotations, or the curator is not logged in
- **THEN** the "Not Saved" bar is not shown

### Requirement: Discarding unsaved changes
The system SHALL ask before a reset, with the title "Discard Unsaved Changes", the message
`All your changes will be discarded for model. Model Name:"<title>"` and the buttons **OK** and
**Cancel**. **OK** MUST send a model `reset` as an `intention=query` batch, toast "Unsaved changes
discarded." and read the model again.

#### Scenario: Resetting the model
- **WHEN** the curator clicks **Reset**, then **OK**
- **THEN** Minerva receives a `reset` for the model with `intention=query`
- **AND** the toast "Unsaved changes discarded." is shown and the model is read again

#### Scenario: Cancelling the reset
- **WHEN** the curator clicks **Reset**, then **Cancel**
- **THEN** nothing is sent to Minerva

### Requirement: Saving unsaved changes
The system SHALL ask before a save, with the title "Save Changes?", the message
`All your changes will be saved for model. Model Name:"<title>"` and the buttons **Submit** and
**Go Back**. **Submit** MUST send a batch holding only a model `store`, with `intention=query`, and
toast "Model successfully saved.".

#### Scenario: Storing the model
- **WHEN** the curator clicks **Save**, then **Submit**
- **THEN** Minerva receives a batch with a single model `store` and `intention=query`
- **AND** the toast "Model successfully saved." is shown

### Requirement: Model Updated dialog for outside changes
The system SHALL listen to Barista's socket for `relay` messages of class `merge` or `rebuild`
about the open model, and when another window or user changes it SHALL show a "Model Updated"
dialog reading "This model has been modified in another window or by another user. Refresh to get
the latest version." with a **Refresh** button. The dialog MUST appear only once per outside
change until the curator refreshes.

#### Scenario: Another user edits the open model
- **WHEN** Barista relays a `rebuild` for the open model that this editor did not send
- **THEN** the "Model Updated" dialog is shown
- **AND** clicking **Refresh** sends a new `model get` and closes the dialog

#### Scenario: Closing the dialog
- **WHEN** the curator closes the dialog with its close button
- **THEN** the model is read again, as for **Refresh**
- **AND** clicking outside the dialog or pressing Escape does not close it

#### Scenario: Other relay classes
- **WHEN** Barista relays a message of a class other than `merge` or `rebuild`
- **THEN** no dialog is shown

#### Scenario: Several outside changes before a refresh
- **WHEN** several relays for the open model arrive before the curator refreshes
- **THEN** the dialog is shown once
- **AND** after the refresh the next outside change shows it again

#### Scenario: A change to another model
- **WHEN** Barista relays a change for a different model
- **THEN** no dialog is shown

### Requirement: The editor's own writes are not reported
The system SHALL recognise the relays of its own writes by the `packet-id` of each write's
response, and MUST NOT show the "Model Updated" dialog for them. A relay that arrives before its
write's response SHALL wait 500 ms for the response before counting as an outside change. A relay
without a packet id, or with packet id `unknown`, MUST count as an outside change. Store-only saves
and resets are sent as queries, which Barista does not relay.

#### Scenario: Relay after the response
- **WHEN** the curator saves an edit and Barista's relay carries the same packet id as the response
- **THEN** no "Model Updated" dialog is shown

#### Scenario: Relay before the response
- **WHEN** the relay of the curator's own edit arrives before the edit's response, and the response arrives within 500 ms
- **THEN** no "Model Updated" dialog is shown

#### Scenario: Unclaimed packet
- **WHEN** a relay's packet id is not claimed by a response within 500 ms
- **THEN** the "Model Updated" dialog is shown
