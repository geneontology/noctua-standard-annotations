import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, finalize, forkJoin, from, Observable, of, throwError } from 'rxjs';
import { FormGroup, FormBuilder } from '@angular/forms';
import { NoctuaFormConfigService } from './config/noctua-form-config.service';
import { Activity, ActivityType } from './../models/activity/activity';
import { BbopGraphService } from './bbop-graph.service';
import { CamService } from './cam.service';
import { Entity } from '../models/activity/entity';
import { Cam } from '../models/activity/cam';
import { AnnotationActivity, AnnotationExtension } from '../models/standard-annotation/annotation-activity';
import * as EntityDefinition from './../data/config/entity-definition';
import { noctuaFormConfig } from './../noctua-form-config';
import { AnnotationExtensionForm, StandardAnnotationForm } from './../models/standard-annotation/form';
import { ActivityError, ErrorLevel, ErrorType } from './../models/activity/parser/activity-error';
import { EditorCategory } from '@noctua.editor/models/editor-category';
import { Evidence } from 'public-api';


@Injectable({
  providedIn: 'root'
})
export class NoctuaAnnotationFormService {

  public errors = [];
  public activity: Activity;
  public onAnnotationActivityChanged: AnnotationActivity;
  public onActivityChanged: BehaviorSubject<Activity>
  public onCommentIdChanged: BehaviorSubject<string>
  public onFormAnnotationActivityChanged: BehaviorSubject<AnnotationActivity>
  public onFormErrorsChanged: BehaviorSubject<ActivityError[]>
  public cam: Cam;
  public selectedCommentActivityId: string;

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

    this.onActivityChanged = new BehaviorSubject(null);
    this.onFormAnnotationActivityChanged = new BehaviorSubject(null);
    this.onFormErrorsChanged = new BehaviorSubject([]);
    this.onAnnotationActivityChanged = new AnnotationActivity(null);
    this.onCommentIdChanged = new BehaviorSubject(null);

  }

  initializeForm() {
    this.activity = this.noctuaFormConfigService.createActivityModel(ActivityType.simpleAnnoton);
    this.errors = [];
    this.activity.enableSubmit();
    this.onAnnotationActivityChanged = new AnnotationActivity(this.activity);
    this.onActivityChanged.next(this.activity);
  }

  initializeFormFromActivity(annotationActivity: AnnotationActivity) {
    this.activity = annotationActivity.activity;
    this.onAnnotationActivityChanged = annotationActivity;
    this.onFormAnnotationActivityChanged.next(annotationActivity);
  }

  processAnnotationFormGroup(dynamicForm: FormGroup, annotationData: StandardAnnotationForm): void {

    const gpRootTypes = annotationData.gp?.rootTypes ?? [];
    const goTermRootTypes = annotationData.goterm?.rootTypes ?? [];

    this.onAnnotationActivityChanged.gpToTermEdges = this.noctuaFormConfigService.getTermRelations(gpRootTypes, goTermRootTypes, true);
    this.onAnnotationActivityChanged.goterm.category = this.noctuaFormConfigService.getObjectRange(gpRootTypes, annotationData.gpToTermEdge?.id, true);

    //this._setExtensionObjects(goTermRootTypes);
    this._updateExtensions(annotationData.annotationExtensions, goTermRootTypes);
    this._checkAndSetGpToTermEdge(dynamicForm, gpRootTypes, goTermRootTypes, annotationData);

    this._updateFormState(annotationData);
  }

  getEdgesRange(subjectRootTypes: Entity[], extRootTypes: Entity[] = [], predicateId: string = null) {
    const edges = this.noctuaFormConfigService.getTermRelations(subjectRootTypes, extRootTypes);
    const range = this.noctuaFormConfigService.getObjectRange(subjectRootTypes, predicateId);

    return { edges, range };

  }
  selectCommentActivityId(annotationActivityId: string) {
    this.selectedCommentActivityId = annotationActivityId;
    this.onCommentIdChanged.next(annotationActivityId);
  }

  private _updateExtensions(annotationExtensions: AnnotationExtensionForm[], gotermRootTypes: Entity[]): void {
    if (this.onAnnotationActivityChanged.extensions.length === annotationExtensions.length) {
      annotationExtensions.forEach((ext, index) => {
        const extRootTypes = ext.extensionTerm?.rootTypes ?? [];
        const extensionEdges = this.noctuaFormConfigService.getTermRelations(gotermRootTypes, extRootTypes);
        const extensionObjects = this.noctuaFormConfigService.getObjectRange(gotermRootTypes, ext.extensionEdge?.id);

        this.onAnnotationActivityChanged.extensions[index].extensionEdges = extensionEdges;
        this.onAnnotationActivityChanged.extensions[index].extensionTerm.category = extensionObjects;

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
    const saveData = this.onAnnotationActivityChanged.createSave(annotationFormValue as StandardAnnotationForm);
    return forkJoin(this.bbopGraphService.addActivity(this.cam, saveData.nodes, saveData.triples, saveData.title));
  }



  editAnnotation(
    editorCategory: EditorCategory,
    cam: Cam,
    annotationActivity: AnnotationActivity,
    newAnnotation: string
  ): Observable<any> {
    const evidence = annotationActivity.getEvidenceNodes();
    const oldAnnotations = this.getOldAnnotations(editorCategory, evidence);

    return this.performEditAction(editorCategory, cam, oldAnnotations, newAnnotation).pipe(
      finalize(() => {
        this.cam.loading.status = false;
      }),
      catchError((error) => {
        console.error('Error editing annotation:', error);
        return of(null);
      })
    )
  }

  editRelation(
    editorCategory: EditorCategory,
    cam: Cam,
    annotationActivity: AnnotationActivity,
    newAnnotation: string
  ): Observable<any> {

    const { a: oldTriple, b: newTriple } = annotationActivity.getTriplePair(annotationActivity.gpToTermEdge.id, annotationActivity.goterm, newAnnotation);

    if (!oldTriple || !newTriple) {
      return throwError(() => new Error('Invalid editor category'));
    }

    return from(this.bbopGraphService.editConnection(cam, [oldTriple], [newTriple])).pipe(
      finalize(() => {
        this.cam.loading.status = false;
        this.cam.reviewCamChanges();
      }),
      catchError((error) => {
        console.error('Error editing annotation:', error);
        return of(null);
      })
    )
  }

  addExtension(
    editorCategory: EditorCategory,
    cam: Cam,
    annotationActivity: AnnotationActivity,
    newAnnotation: { relationId: string, termId: string }
  ): Observable<any> {

    const triple = annotationActivity.genExtensionTriple(newAnnotation.relationId, newAnnotation.termId);

    return from(this.bbopGraphService.addExtension(cam, triple)).pipe(
      finalize(() => {
        this.cam.loading.status = false;
      }),
      catchError((error) => {
        console.error('Error editing annotation:', error);
        return of(null);
      })
    )
  }

  updateComment(
    cam: Cam,
    annotationActivity: AnnotationActivity,
    newAnnotation: string
  ): Observable<any> {
    const predicates = annotationActivity.getPredicates();

    const newAnnotations = Array.from(new Set([...annotationActivity.comments, newAnnotation]));

    return from(this.bbopGraphService.updateAnnotationComments(cam, predicates, newAnnotations)).pipe(
      finalize(() => {
        this.cam.loading.status = false;
      }),
      catchError((error) => {
        console.error('Error editing annotation:', error);
        return of(null);
      })
    )
  }

  replaceComments(
    cam: Cam,
    annotationActivity: AnnotationActivity,
    newAnnotations: string[]
  ): Observable<any> {
    const predicates = annotationActivity.getPredicates();

    const uniqAnnotations = Array.from(new Set(newAnnotations));

    return from(this.bbopGraphService.updateAnnotationComments(cam, predicates, uniqAnnotations)).pipe(
      finalize(() => {
        this.cam.loading.status = false;
      }),
      catchError((error) => {
        console.error('Error editing annotation:', error);
        return of(null);
      })
    )
  }

  deleteExtension(annotationActivity: AnnotationActivity, extension: AnnotationExtension): Observable<any> {
    const cam = this.cam;
    const triple = annotationActivity.getExtensionTriple(extension.extensionEdge.id, extension.extensionTerm);
    const uuids = [extension.extensionTerm.uuid];
    if (!triple) {
      return throwError(() => new Error('Invalid extension'));
    }

    return from(this.bbopGraphService.deleteAnnotation(cam, uuids, [triple])).pipe(
      finalize(() => {
        this.cam.loading.status = false;
      }),
      catchError((error) => {
        console.error('Error deleting extension:', error);
        return of(null);
      })
    )
  }

  clearForm() {
    this.initializeForm();
  }

  private getOldAnnotations(editorCategory: EditorCategory, evidence: Evidence[]): Entity[] {
    return evidence.map((ev) => {
      const id = (() => {
        switch (editorCategory) {
          case EditorCategory.EVIDENCE_CODE: return ev.evidence.id;
          case EditorCategory.WITH: return ev.with;
          case EditorCategory.REFERENCE: return ev.reference;
          default: return null;
        }
      })();

      return { id, uuid: ev.uuid } as Entity;
    });
  }

  private performEditAction(
    editorCategory: EditorCategory,
    cam: Cam,
    oldAnnotations: Entity[],
    newAnnotation: string
  ): Observable<any> {
    let actionPromise: Promise<any>;

    switch (editorCategory) {
      case EditorCategory.EVIDENCE_CODE:
        actionPromise = this.bbopGraphService.editEvidenceCode(cam, oldAnnotations, newAnnotation);
        break;
      case EditorCategory.WITH:
        actionPromise = this.bbopGraphService.editWith(cam, oldAnnotations, newAnnotation);
        break;
      case EditorCategory.REFERENCE:
        actionPromise = this.bbopGraphService.editReference(cam, oldAnnotations, newAnnotation);
        break;
      default:
        return throwError(() => new Error('Invalid editor category')); // Emit an error for invalid editorCategory
    }

    return from(actionPromise);
  }
}
