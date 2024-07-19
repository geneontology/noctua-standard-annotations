import { Component, Inject, OnInit, OnDestroy, NgZone } from '@angular/core';
import { FormControl, FormGroup, FormArray, FormBuilder } from '@angular/forms';
import { Subscription, Subject, EMPTY } from 'rxjs';
import {
  NoctuaFormConfigService,
  NoctuaActivityFormService,
  NoctuaActivityEntityService,
  CamService,
  Entity,
  noctuaFormConfig,
  ActivityError,
  ErrorType,
  ErrorLevel,
  AnnotationActivity,
} from '@geneontology/noctua-form-base';

import { Cam } from '@geneontology/noctua-form-base';
import { Activity } from '@geneontology/noctua-form-base';
import { ActivityNode } from '@geneontology/noctua-form-base';
import { Evidence } from '@geneontology/noctua-form-base';

import { standardDropdownData } from './standard-dropdown.tokens';
import { EditorDropdownOverlayRef } from './standard-dropdown-ref';
import { EditorCategory } from './../../models/editor-category';
import { concatMap, finalize, take, takeUntil } from 'rxjs/operators';
import { find } from 'lodash';
import { InlineReferenceService } from './../../inline-reference/inline-reference.service';
import { NoctuaFormDialogService } from 'app/main/apps/noctua-form/services/dialog.service';

@Component({
  selector: 'noc-standard-dropdown',
  templateUrl: './standard-dropdown.component.html',
  styleUrls: ['./standard-dropdown.component.scss']
})

export class NoctuaEditorStandardDropdownComponent implements OnInit, OnDestroy {
  EditorCategory = EditorCategory;
  activity: Activity;
  cam: Cam;
  insertEntity = false;
  entity: ActivityNode;
  category: EditorCategory;
  relationshipChoices: Entity[] = [];
  extensionFormArray: FormArray;
  commentFormArray: FormArray;
  errors: ActivityError[] = [];

  descriptionSectionTitle = 'Function Description';
  annotatedSectionTitle = 'Gene Product';

  private _unsubscribeAll: Subject<any>;
  annotationActivity: AnnotationActivity;

  dynamicForm: FormGroup;


  displaySection = {
    relationship: false,
    term: false,
    evidence: false,
    reference: false,
    with: false,
  };

  constructor(
    private zone: NgZone,
    private fb: FormBuilder,
    public dialogRef: EditorDropdownOverlayRef,
    @Inject(standardDropdownData) public data: any,
    private noctuaFormDialogService: NoctuaFormDialogService,
    private camService: CamService,
    private noctuaActivityEntityService: NoctuaActivityEntityService,
    private inlineReferenceService: InlineReferenceService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    public noctuaActivityFormService: NoctuaActivityFormService,
  ) {
    this._unsubscribeAll = new Subject();

    this.cam = data.cam;
    this.activity = data.activity;
    this.entity = data.entity;
    this.category = data.category;
    this.insertEntity = data.insertEntity;
    this.relationshipChoices = data.relationshipChoices;
  }

  ngOnInit(): void {
    this._displaySection(this.category);
    this.dynamicForm = this.fb.group(this.getInitialFormStructure());
  }


  private getInitialFormStructure() {
    return {
      gp: '',
      isComplement: false,
      gpToTermEdge: '',
      goterm: '',
      annotationExtensions: this.fb.array([]),
      annotationComments: this.fb.array([]),
      evidenceCode: '',
      reference: '',
      withFrom: '',
    };
  }

  openAddReference(event, name: string) {

    const data = {
      //formControl: this.evidenceFormGroup.controls[name] as FormControl,
    };
    this.inlineReferenceService.open(event.target, { data });

  }

  save() {
    const self = this;
    switch (self.category) {
      case EditorCategory.term:
      case EditorCategory.evidence:
      case EditorCategory.reference:
      case EditorCategory.with:
      case EditorCategory.relationship:
        this.close();
        self.noctuaActivityEntityService.saveActivityReplace(self.cam).pipe(
          take(1),
          concatMap((result) => {
            return EMPTY;
            //return self.camService.getStoredModel(self.cam)
          }),
          finalize(() => {
            self.zone.run(() => {
              self.cam.loading.status = false;
              self.cam.reviewCamChanges()
              //self.camService.reviewChangesCams();
            })
          }))
          .subscribe(() => {
            self.zone.run(() => {

            })
            // self.noctuaFormDialogService.openInfoToast('Activity successfully updated.', 'OK');

          });
        break;
    }
  }

  addRootTerm() {
    const self = this;

    const term = find(noctuaFormConfig.rootNode, (rootNode) => {
      return rootNode.aspect === self.entity.aspect;
    });

    if (term) {

      const evidence = new Evidence();
      evidence.setEvidence(new Entity(
        noctuaFormConfig.evidenceAutoPopulate.nd.evidence.id,
        noctuaFormConfig.evidenceAutoPopulate.nd.evidence.label));
      evidence.reference = noctuaFormConfig.evidenceAutoPopulate.nd.reference;
      self.noctuaActivityEntityService.reinitializeForm(new Entity(term.id, term.label), [evidence]);
    }
  }

  clearValues() {
    const self = this;

    self.entity.clearValues();
    self.noctuaActivityFormService.initializeForm();
  }

  updateTermList() {
    const self = this;
    this.camService.updateTermList(self.noctuaActivityFormService.activity);
  }

  updateEvidenceList() {
    const self = this;
    this.camService.updateEvidenceList(self.noctuaActivityFormService.activity, this.entity);
  }

  updateReferenceList() {
    const self = this;
    this.camService.updateReferenceList(self.noctuaActivityFormService.activity, this.entity);
  }

  updateWithList() {
    const self = this;
    this.camService.updateWithList(self.noctuaActivityFormService.activity, this.entity);
  }


  termDisplayFn(term): string | undefined {
    return term && term.id ? `${term.label} (${term.id})` : undefined;
  }

  evidenceDisplayFn(evidence): string | undefined {
    return evidence && evidence.id ? `${evidence.label} (${evidence.id})` : undefined;
  }

  compareEntity(a: any, b: any) {
    return (a.id === b.id);
  }

  private _displaySection(category: EditorCategory) {
    switch (category) {
      case EditorCategory.relationship:
        this.displaySection.relationship = true;
        break;
      case EditorCategory.term:
        this.displaySection.term = true;
        break;
      case EditorCategory.evidence:
        this.displaySection.evidence = true;
        break;
      case EditorCategory.reference:
        this.displaySection.reference = true;
        break;
      case EditorCategory.with:
        this.displaySection.with = true;
        break;
      case EditorCategory.evidenceAll:
        this.displaySection.evidence = true;
        this.displaySection.reference = true;
        this.displaySection.with = true;
        break;
      case EditorCategory.all:
        this.displaySection.term = true;
        this.displaySection.evidence = true;
        this.displaySection.reference = true;
        this.displaySection.with = true;
        break;
    }
  }

  close() {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}

