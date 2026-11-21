# Tasks

Each task: decide intended or bug. Intended → tick it. Bug → tick it and start a change with `/opsx:propose` that names the owning spec.

## 1. Model toolbar (`model-toolbar`)

- [ ] 1.1 A model with no state can never get one: the state chip only appears when a state exists, so Change State is unreachable for a stateless model
- [ ] 1.2 Opening Model Comments only to read them shows the "editing another group's model" warning to a curator outside the model's group
- [ ] 1.3 Model Comments "Save" is never disabled; an unchanged save still sends a batch
- [ ] 1.4 Contributors under "+N more" only close the menu; the first two chips open Model Details

## 2. Annotations (`annotation-creation`, `annotation-editing`, `annotation-deletion`)

- [ ] 2.1 The other-group warning covers the toolbar forms and bulk delete only; inline cell edits, row menu actions, single delete and Comments-panel edits write without it
- [ ] 2.2 The first annotation titles the model "enabled by <GP>" whatever its relation (e.g. a first "located in" annotation)
- [ ] 2.3 The inline relation editor offers relations stored the other way, then refuses them with "This relation can't be changed in place…"
- [ ] 2.4 With/From saves an unchanged value as a batch; the other editors close without writing
- [ ] 2.5 "Please enter less than 150 genes." but exactly 150 genes are accepted
- [ ] 2.6 Label casing differs: "GP to Term Relation" (create form) vs "GP To Term Relation" (inline editor)
- [ ] 2.7 Every comment in the Comments panel shows the same date (the annotation's first evidence date, or the row date)
- [ ] 2.8 The create form makes one annotation per evidence row but has no way to add a second row

## 3. Loading, login and search (`model-sync`, `access-control`, `term-search`)

- [ ] 3.1 The loading overlay says "Deleting..." for any batch with a remove, including relation edits and extension deletes
- [ ] 3.2 When Barista can't be reached on a cold start the token is kept, but the page shows the logged-out read-only view and "Not Logged In"
- [ ] 3.3 When `/users` or `/groups` fails, "Error loading data: …" shows for about half a second, then the editor opens with group and contributor names unresolved
- [ ] 3.4 Removing `barista_token` from the address bar decodes the whole URL, which can alter other percent-encoded parameters
- [ ] 3.5 A model read that succeeds with no `data` leaves a blank page with no message
- [ ] 3.6 Shortening a PMID below 4 characters in the reference picker likely leaves the previous paper's preview on screen
- [ ] 3.7 Gene product ids link to the source database in the table but to AmiGO in search results
