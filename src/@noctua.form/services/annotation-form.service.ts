import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin } from 'rxjs';
import { FormGroup, FormBuilder } from '@angular/forms';
import { NoctuaFormConfigService } from './config/noctua-form-config.service';
import { Activity, ActivityType } from './../models/activity/activity';
import { BbopGraphService } from './bbop-graph.service';
import { CamService } from './cam.service';
import { Entity } from '../models/activity/entity';
import { Cam } from '../models/activity/cam';
import { AnnotationActivity } from '../models/standard-annotation/annotation-activity';
import * as EntityDefinition from './../data/config/entity-definition';
import { noctuaFormConfig } from './../noctua-form-config';
import { StandardAnnotationForm } from './../models/standard-annotation/form';
import { ActivityError, ErrorLevel, ErrorType } from './../models/activity/parser/activity-error';

@Injectable({
  providedIn: 'root'
})
export class NoctuaAnnotationFormService {
  public errors = [];
  public currentActivity: Activity;
  public activity: Activity;
  public annotationActivity: AnnotationActivity;
  public onActivityCreated: BehaviorSubject<Activity>
  public onActivityChanged: BehaviorSubject<Activity>
  public onFormErrorsChanged: BehaviorSubject<ActivityError[]>
  public cam: Cam;


  // for setting edge when goterm is changed
  private previousGotermRelation: string = null

  constructor(private _fb: FormBuilder, public noctuaFormConfigService: NoctuaFormConfigService,
    private camService: CamService,
    private bbopGraphService: BbopGraphService) {

    this.camService.onCamChanged.subscribe((cam) => {
      if (!cam) {
        return;
      }

      this.cam = cam;
    });

    this.onActivityCreated = new BehaviorSubject(null);
    this.onActivityChanged = new BehaviorSubject(null);
    this.onFormErrorsChanged = new BehaviorSubject([]);

  }

  initializeForm() {

    this.activity = this.noctuaFormConfigService.createActivityModel(ActivityType.simpleAnnoton);

    this.errors = [];

    this.currentActivity = null;

    //this.annotationFormGroup.next(this._fb.group(this.annotationForm));
    this.activity.enableSubmit();
    this.annotationActivity = new AnnotationActivity(this.activity);
    //this._onActivityFormChanges();
    this.onActivityChanged.next(this.activity);
  }

  processAnnotationFormGroup(dynamicForm: FormGroup, annotationData: StandardAnnotationForm): void {
    console.log('Annotation form group processed:', annotationData);
    let edges

    const gpRootTypes = annotationData.gp?.rootTypes ?? [];
    const gotermRootTypes = annotationData.goterm?.rootTypes ?? [];

    edges = this.noctuaFormConfigService.getTermRelations(
      gpRootTypes,
      gotermRootTypes,
      true
    );

    this.annotationActivity.gpToTermEdges = edges;

    const extensionObjects = this.noctuaFormConfigService.getObjectsRelations(
      gotermRootTypes,
    );

    if (this.annotationActivity.extensions.length === annotationData.annotationExtensions.length) {

      annotationData.annotationExtensions.forEach((ext, index) => {

        const extRootTypes = ext.extensionTerm?.rootTypes ?? [];

        const extensionEdges = this.noctuaFormConfigService.getTermRelations(
          gotermRootTypes,
          extRootTypes
        );

        this.annotationActivity.extensions[index].extensionEdges = extensionEdges;

        if (extensionObjects.length > 0) {
          this.annotationActivity.extensions[index].extensionTerm.category = extensionObjects;

          // this.annotationActivity.extensions[index].extensionTerm.category = extensionObjects;
          //this.noctuaFormConfigService.setTermLookup(ext.extension, extensionObjects);
        }
      });
    }

    if (edges?.length > 0 && annotationData.gp?.id && annotationData.goterm?.id) {

      const exists = edges.some(e => e.id === annotationData.gpToTermEdge?.id);
      if (!exists) {
        dynamicForm.get('gpToTermEdge').patchValue(edges[0]);
        const isProteinComplex = annotationData.goterm.rootTypes.find((rootType: Entity) => {
          return rootType.id === EntityDefinition.GoProteinContainingComplex.category;
        });

        if (isProteinComplex) {
          const partOfEdge = edges.find(e => e.id === noctuaFormConfig.edge.partOf.id);
          dynamicForm.get('gpToTermEdge').patchValue(partOfEdge);
        }
        this.previousGotermRelation = this.annotationActivity.gpToTermEdge?.id;
      }

    }

    this.errors = this.getActivityFormErrors(annotationData);
    this.onFormErrorsChanged.next(this.errors);

    this.onActivityChanged.next(this.activity);
  }

  getActivityFormErrors(annotationData: StandardAnnotationForm) {

    const errors = [];

    if (!annotationData.gp?.id) {
      const error = new ActivityError(ErrorLevel.error, ErrorType.general, `GP is required`);
      errors.push(error);
    }

    if (!annotationData.goterm?.id) {
      const error = new ActivityError(ErrorLevel.error, ErrorType.general, `GO Term is required`);
      errors.push(error);
    }

    if (!annotationData.evidenceCode?.id) {

      const error = new ActivityError(ErrorLevel.error, ErrorType.general, `Evidence is required`);
      errors.push(error);
    }

    if (!annotationData.reference) {
      const error = new ActivityError(ErrorLevel.error, ErrorType.general,
        'Reference is required');
      errors.push(error);
    }

    if (annotationData.reference) {

      if (!annotationData.reference.includes(':')) {
        const error = new ActivityError(ErrorLevel.error, ErrorType.general,
          `Use DB:accession format for reference`);
        errors.push(error);
      }
    }

    return errors
  }


  cloneForm(srcActivity, filterNodes) {
    this.activity = this.noctuaFormConfigService.createActivityModel(
      srcActivity.activityType
    );

    if (filterNodes) {
      filterNodes.forEach((srcNode) => {

        let destNode = this.activity.getNode(srcNode.id);
        if (destNode) {
          destNode.copyValues(srcNode);
        }
      });
    } else {
      // this.activity.copyValues(srcActivity);
    }

    this.initializeForm();
  }

  saveAnnotation(annotationForm: FormGroup) {
    const self = this;
    //self.activityFormToActivity();

    //self.annotationActivity.activityToAnnotation(self.activity);
    const saveData = self.annotationActivity.createSave(annotationForm.value as StandardAnnotationForm);
    return forkJoin(self.bbopGraphService.addActivity(self.cam, saveData.nodes, saveData.triples, saveData.title));
  }

  clearForm() {
    this.initializeForm();
  }


}
