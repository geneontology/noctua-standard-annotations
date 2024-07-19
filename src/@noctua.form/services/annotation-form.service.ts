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
import { AnnotationExtensionForm, StandardAnnotationForm } from './../models/standard-annotation/form';
import { ActivityError, ErrorLevel, ErrorType } from './../models/activity/parser/activity-error';

@Injectable({
  providedIn: 'root'
})
export class NoctuaAnnotationFormService {
  public errors = [];
  public activity: Activity;
  public annotationActivity: AnnotationActivity;
  public onActivityCreated: BehaviorSubject<Activity>
  public onActivityChanged: BehaviorSubject<Activity>
  public onFormErrorsChanged: BehaviorSubject<ActivityError[]>
  public cam: Cam;

  // for setting edge when goterm is changed
  // private previousGotermRelation: string = null

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
    this.activity.enableSubmit();
    this.annotationActivity = new AnnotationActivity(this.activity);
    this.onActivityChanged.next(this.activity);
  }

  processAnnotationFormGroup(dynamicForm: FormGroup, annotationData: StandardAnnotationForm): void {
    console.log('Annotation form group processed:', annotationData);

    const gpRootTypes = annotationData.gp?.rootTypes ?? [];
    const goTermRootTypes = annotationData.goterm?.rootTypes ?? [];


    this.annotationActivity.gpToTermEdges = this.noctuaFormConfigService.getTermRelations(gpRootTypes, goTermRootTypes, true);
    this.annotationActivity.goterm.category = this.noctuaFormConfigService.getObjectRange(gpRootTypes, annotationData.gpToTermEdge?.id, true);

    //this._setExtensionObjects(goTermRootTypes);
    this._updateExtensions(annotationData.annotationExtensions, goTermRootTypes);
    this._checkAndSetGpToTermEdge(dynamicForm, gpRootTypes, goTermRootTypes, annotationData);

    this._updateFormState(annotationData);
  }

  private _setExtensionObjects(gotermRootTypes: Entity[]): void {
    const extensionObjects = this.noctuaFormConfigService.getObjectRange(gotermRootTypes);
    if (extensionObjects.length > 0) {
      this.annotationActivity.extensions.forEach(extension => {
        extension.extensionTerm.category = extensionObjects;
      });
    }
  }

  private _updateExtensions(annotationExtensions: AnnotationExtensionForm[], gotermRootTypes: Entity[]): void {
    if (this.annotationActivity.extensions.length === annotationExtensions.length) {
      annotationExtensions.forEach((ext, index) => {
        const extRootTypes = ext.extensionTerm?.rootTypes ?? [];
        const extensionEdges = this.noctuaFormConfigService.getTermRelations(gotermRootTypes, extRootTypes);
        const extensionObjects = this.noctuaFormConfigService.getObjectRange(gotermRootTypes, ext.extensionEdge?.id);

        this.annotationActivity.extensions[index].extensionEdges = extensionEdges;
        this.annotationActivity.extensions[index].extensionTerm.category = extensionObjects;

        console.log('Extension updated:', extRootTypes, extensionEdges, extensionObjects);
      });
    } else {
      console.error('Annotation extensions length mismatch, unlikely');
    }
  }

  private _checkAndSetGpToTermEdge(dynamicForm: FormGroup, gpRootTypes: Entity[], gotermRootTypes: Entity[], annotationData: StandardAnnotationForm): void {
    const gpToTermRelations = this.noctuaFormConfigService.getTermRelations(gpRootTypes, gotermRootTypes, true);

    if (gpToTermRelations?.length > 0 && annotationData.gp?.id && annotationData.goterm?.id) {
      const exists = gpToTermRelations.some(e => e.id === annotationData.gpToTermEdge?.id);

      if (!exists) {
        const formControl = dynamicForm.get('gpToTermEdge');
        formControl.patchValue(gpToTermRelations[0]);

        const isProteinComplex = gotermRootTypes.some(rootType =>
          rootType.id === EntityDefinition.GoProteinContainingComplex.category
        );

        if (isProteinComplex) {
          const partOfEdge = gpToTermRelations.find(e => e.id === noctuaFormConfig.edge.partOf.id);
          formControl.patchValue(partOfEdge);
        }
      }
    }
  }

  private _updateFormState(annotationData: StandardAnnotationForm): void {
    this.errors = this.getActivityFormErrors(annotationData);
    this.onFormErrorsChanged.next(this.errors);
    this.camService.updateTermList(this.activity);
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

    annotationData.annotationExtensions.forEach((extension, index) => {
      if ((extension.extensionEdge?.id && !extension.extensionTerm?.id) || (!extension.extensionEdge?.id && extension.extensionTerm?.id)) {
        const error = new ActivityError(ErrorLevel.error, ErrorType.general, `Both Extension relation and Extension Term must be filled (${index + 1})`);
        errors.push(error);
      }
    });

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

  saveAnnotation(annotationFormValue: StandardAnnotationForm) {
    console.log('saveAnnotation:', annotationFormValue);
    //self.activityFormToActivity();

    //self.annotationActivity.activityToAnnotation(self.activity);
    const saveData = this.annotationActivity.createSave(annotationFormValue as StandardAnnotationForm);
    return forkJoin(this.bbopGraphService.addActivity(this.cam, saveData.nodes, saveData.triples, saveData.title));
  }

  clearForm() {
    this.initializeForm();
  }
}
