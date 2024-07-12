import { FormControl, FormBuilder, FormGroup, FormArray } from '@angular/forms';

import { ActivityFormMetadata } from './../forms/activity-form-metadata';
import { each } from 'lodash';
import { ActivityNode, ActivityNodeType } from '../activity/activity-node';
import { EntityForm } from './entity-form';
import { AnnotationActivity } from '../standard-annotation/annotation-activity';

export class AnnotationForm {
  gp: FormGroup;
  isComplement = new FormControl();
  goterm: FormGroup;
  //extension: FormGroup;
  gpToTermEdge = new FormControl();
  //extensionEdge = new FormControl();

  extensionFormArray = new FormArray([]);

  entityForms: EntityForm[] = [];

  private _metadata: ActivityFormMetadata;
  private _fb = new FormBuilder();

  constructor(metadata) {
    this._metadata = metadata;
  }

  createEntityForms(entities: ActivityNode[]) {
    const self = this;

    entities.forEach((entity: ActivityNode) => {
      const entityForm = new EntityForm(self._metadata, entity);
      if (!entity.skipEvidenceCheck) {
        entityForm.createEvidenceForms(entity);
      }
      this.entityForms.push(entityForm);

      const entityTypeToPropertyMap = {
        gp: 'gp',
        goterm: 'goterm',
        extension: 'extension'
      };

      const propertyName = entityTypeToPropertyMap[entity.id];
      if (propertyName) {
        self[propertyName] = this._fb.group(entityForm);
      }

    });
  }

  createMolecularEntityForm(gpData) {
    each(gpData, (nodeGroup, nodeKey) => {
      this.createEntityForms(nodeGroup.nodes);
    });
  }


  populateActivity(annotationActivity: AnnotationActivity) {

    if (this.gpToTermEdge.value) {
      annotationActivity.gpToTermEdge = this.gpToTermEdge.value;
    }

    // if (this.extensionEdge.value) {
    // annotationActivity.extensionEdge = this.extensionEdge.value;
    //}

    this.entityForms.forEach((entityForm: EntityForm) => {
      entityForm.populateTerm();
    });

  }

  getErrors(error) {
    this.entityForms.forEach((entityForm: EntityForm) => {
      entityForm.getErrors(error);
    });

  }
}
