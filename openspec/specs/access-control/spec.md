# access-control Specification

## Purpose
Who the curator is and what they may do: the Barista token the editor uses (from the address bar
or the browser's saved login), the user and groups Barista reports for it, what changes when a
token is rejected or Barista cannot be reached, the read-only view for a curator who is not logged
in, the group every edit is credited to (`provided-by`), and the start-up splash screen that loads
Barista's users and groups.

## Requirements

### Requirement: Token from the address bar
The system SHALL take the Barista token from the `barista_token` query parameter when present,
save it in the browser's local storage under `barista_token`, and remove it from the address bar
without reloading the page.

#### Scenario: Opening the editor from Noctua with a token
- **WHEN** the curator opens the editor with `?model_id=<id>&barista_token=<token>`
- **THEN** the session uses `<token>`
- **AND** `<token>` is saved in local storage as `barista_token`
- **AND** the address bar keeps `model_id=<id>` but no longer shows `barista_token`

### Requirement: Token from a previous session
The system SHALL use the token saved in local storage when the address bar has none.

#### Scenario: Reopening the editor without a token in the address
- **WHEN** the curator opens `?model_id=<id>` and local storage holds a `barista_token`
- **THEN** the session uses the stored token

#### Scenario: No token anywhere
- **WHEN** neither the address bar nor local storage has a token
- **THEN** the curator is not logged in and the model is read through the public endpoint

### Requirement: User information from Barista
The system SHALL ask Barista who the token belongs to (`/user_info_by_token/<token>`) and SHALL
treat the curator as logged in only once Barista answers with a user for that token. The user's
name, ORCID, groups and color come from that answer.

#### Scenario: A valid token
- **WHEN** Barista answers the user lookup with a user and token
- **THEN** the toolbar shows the user's name with their acting group's label beneath it
- **AND** the editing controls are available

### Requirement: Rejected token
The system SHALL log the curator out when Barista answers the user lookup without a token (the
token is no longer valid): the token MUST be dropped from the session and removed from local
storage, and the model MUST then be read through the public endpoint.

#### Scenario: Barista no longer knows the token
- **WHEN** the stored token is sent to Barista and Barista answers `{}`
- **THEN** the curator is shown as not logged in
- **AND** `barista_token` is removed from local storage

### Requirement: Barista unreachable keeps the login
The system SHALL keep the token when the user lookup fails to reach Barista, rather than logging
the curator out, and SHALL go on to read the model with that token. A curator already shown as
logged in MUST stay logged in; a curator whose user was never confirmed is shown the read-only
view until Barista answers.

#### Scenario: Network failure on the user lookup
- **WHEN** the user lookup fails (e.g. the network is down)
- **THEN** the token stays in the session and in local storage
- **AND** the model read proceeds with the token without waiting further

#### Scenario: Barista unreachable when the tab regains focus
- **WHEN** a logged-in curator returns to the tab and the re-check cannot reach Barista
- **THEN** the curator stays logged in with the same user and group

### Requirement: Login state follows other tabs
The system SHALL, whenever the browser tab regains focus, switch to a different token another
Noctua tab saved in local storage, or otherwise ask Barista again about the current token.

#### Scenario: Logging in in another tab
- **WHEN** the curator logs in from another Noctua tab, which saves a new `barista_token`, and comes back to this tab
- **THEN** this tab uses the new token and looks up its user

#### Scenario: Token revoked while away
- **WHEN** the tab regains focus and Barista now answers the current token's lookup with `{}`
- **THEN** the curator is logged out as for a rejected token

### Requirement: Login and logout
The system SHALL show a **Login** button when the curator is not logged in that goes to Barista's
`/login` with `return` set to the current page, and, when logged in, a user menu with **Logout**
that goes to Barista's `/logout` with the `barista_token` and `return` set to the current page.

#### Scenario: Logging in
- **WHEN** a logged-out curator clicks **Login**
- **THEN** the browser goes to `<barista>/login?return=<current page URL>`

#### Scenario: Logging out
- **WHEN** a logged-in curator opens the user menu and clicks **Logout**
- **THEN** the browser goes to `<barista>/logout?barista_token=<token>&return=<current page URL>`

### Requirement: Read-only view when logged out
The system SHALL let a curator who is not logged in view the model and its annotations but not
change them: it MUST show the banner "Not Logged In: You can only view existing annotations",
cover the create form with "Log in to Continue", and hide or disable every editing control.

#### Scenario: Editing controls hidden
- **WHEN** the curator is not logged in
- **THEN** row selection and bulk delete, the row editors and row menus, comment editing, the model title and state edits, and the "Not Saved" bar are not available
- **AND** model forms open read-only with **Close** in place of **Cancel** and **Save**

#### Scenario: Viewing a model without logging in
- **WHEN** a curator with no valid token opens a model
- **THEN** the annotations table is shown
- **AND** the banner "Not Logged In: You can only view existing annotations" is shown
- **AND** the create form is covered by "Log in to Continue"
- **AND** no row can be selected or edited

#### Scenario: Logging in enables editing
- **WHEN** Barista confirms the curator's token
- **THEN** the banner and the form cover disappear and the editing controls are shown

### Requirement: Acting group
The system SHALL credit every write to the curator's acting group by sending it as `provided-by`
in the batch, and SHALL omit `provided-by` when the curator has no group. The acting group SHALL
default to the first group Barista lists for the user.

#### Scenario: Group choice in Model Details
- **WHEN** a logged-in curator with at least one group opens Model Details
- **THEN** a "Your Group" section offers a "Group" select described as "The group your edits are attributed to"

#### Scenario: Group choice lasts for the session only
- **WHEN** the curator has chosen another group and reloads the page
- **THEN** the acting group is again the first group Barista lists

#### Scenario: Default group
- **WHEN** a curator whose Barista groups are A then B saves an edit
- **THEN** the batch carries `provided-by` = A's id

#### Scenario: Choosing another group
- **WHEN** the curator picks group B in Model Details and clicks **Save**
- **THEN** the toast "Edits are now attributed to <B's label>." is shown
- **AND** the Model Details dialog closes
- **AND** the toolbar shows B's label under the user's name
- **AND** later batches carry `provided-by` = B's id
- **AND** no batch is sent for the choice itself

#### Scenario: Curator without a group
- **WHEN** a curator with no Barista group saves an edit
- **THEN** the batch has no `provided-by`

### Requirement: Splash screen and Barista users and groups
The system SHALL show a splash screen with the GO logo and "Loading application data..." while it
loads Barista's `/users` and `/groups`, and SHALL show the editor 500 ms after that load
finishes. If the load fails, the splash MUST read "Error loading data: <message>" before the
editor is shown. The loaded users and groups SHALL supply the names and group labels shown for
the model's contributors and groups.

#### Scenario: Starting the editor
- **WHEN** the editor starts
- **THEN** the splash screen shows "Loading application data..."
- **AND** the page appears 500 ms after Barista's users and groups have loaded

#### Scenario: Contributor names
- **WHEN** a model lists a contributor's ORCID that Barista's `/users` knows
- **THEN** the contributor is shown by their Barista name
