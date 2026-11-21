## ADDED Requirements

### Requirement: Models made in SAE are tagged
When the curator creates the first annotation in a model that has no individuals and is not tagged, the create batch SHALL also add, before its store, the model annotation `http://geneontology.org/lego/annotation-editor-sae` with value `true` and value type `xsd:boolean`. The system SHALL treat a model as tagged when it carries `annotation-editor-sae` or the full key with value `true` or `1`.

#### Scenario: First annotation in an empty model
- **WHEN** the curator creates the first annotation in an empty, untagged model
- **THEN** the batch adds `annotation-editor-sae = true` (`xsd:boolean`) once, then stores the model

#### Scenario: A model the landing page already tagged
- **WHEN** the model is empty but already carries the tag
- **THEN** the create batch adds no second tag

#### Scenario: A model with content
- **WHEN** the curator adds an annotation to a model that already has individuals and no tag
- **THEN** the batch does not add the tag
