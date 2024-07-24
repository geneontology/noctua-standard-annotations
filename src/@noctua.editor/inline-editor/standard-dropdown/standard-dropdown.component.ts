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
  AutocompleteType,
  NoctuaAnnotationFormService,
} from '@geneontology/noctua-form-base';

import { Cam } from '@geneontology/noctua-form-base';
import { Activity } from '@geneontology/noctua-form-base';
import { ActivityNode } from '@geneontology/noctua-form-base';
import { Evidence } from '@geneontology/noctua-form-base';

import { EditorCategory } from './../../models/editor-category';
import { concatMap, finalize, take, takeUntil } from 'rxjs/operators';
import { find } from 'lodash';
import { InlineReferenceService } from './../../inline-reference/inline-reference.service';
import { NoctuaFormDialogService } from 'app/main/apps/noctua-form/services/dialog.service';
import { EditorDropdownOverlayRef } from '../editor-dropdown/editor-dropdown-ref';
import { editorDropdownData } from '../editor-dropdown/editor-dropdown.tokens';

@Component({
  selector: 'noc-standard-dropdown',
  templateUrl: './standard-dropdown.component.html',
  styleUrls: ['./standard-dropdown.component.scss']
})

export class NoctuaEditorStandardDropdownComponent implements OnInit, OnDestroy {
  EditorCategory = EditorCategory;
  annotationActivity: AnnotationActivity;
  //activity: Activity;
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
  autocompleteCategory;

  private _unsubscribeAll: Subject<any>;

  dynamicForm: FormGroup;


  displaySection = {
    relationship: false,
    term: false,
    evidence: false,
    reference: false,
    with: false,
  };
  label: string;
  autocompleteType: AutocompleteType;
  formControlName: string

  constructor(
    private zone: NgZone,
    private fb: FormBuilder,
    public dialogRef: EditorDropdownOverlayRef,
    @Inject(editorDropdownData) public data: any,
    private noctuaFormDialogService: NoctuaFormDialogService,
    private camService: CamService,
    private annotationFormService: NoctuaAnnotationFormService,
    private inlineReferenceService: InlineReferenceService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    public noctuaActivityFormService: NoctuaActivityFormService,
  ) {
    this._unsubscribeAll = new Subject();

    this.cam = data.cam;
    this.annotationActivity = data.annotationActivity;
    this.entity = data.entity;
    this.category = data.category;
    this.insertEntity = data.insertEntity;
    this.relationshipChoices = data.relationshipChoices;
  }

  ngOnInit(): void {
    this.dynamicForm = this.fb.group(this.getInitialFormStructure());
    this._displaySection(this.category);
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
    switch (this.category) {
      case EditorCategory.TERM:
      case EditorCategory.EVIDENCE_CODE:
      case EditorCategory.WITH:
      case EditorCategory.REFERENCE:
        let value = this.dynamicForm.value[this.category]?.id ?? this.dynamicForm.value[this.category];
        this.annotationFormService.editAnnotation(this.category, this.cam, this.annotationActivity, value)
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe(() => {
            this.zone.run(() => {
              this.noctuaFormDialogService.openInfoToast(`${this.label} successfully updated.`, 'OK');
              this.camService.getCam(this.cam.id);
            });
            this.close();
          });

        break

      case EditorCategory.RELATIONSHIP:
        this.close();
        /*   this.noctuaActivityEntityService.saveActivityReplace(this.cam).pipe(
            take(1),
            concatMap((result) => {
              return EMPTY;
              //return this.camService.getStoredModel(this.cam)
            }),
            finalize(() => {
              this.zone.run(() => {
                this.cam.loading.status = false;
                this.cam.reviewCamChanges()
                //this.camService.reviewChangesCams();
              })
            }))
            .subscribe(() => {
              this.zone.run(() => {
  
              })
              // this.noctuaFormDialogService.openInfoToast('Activity successfully updated.', 'OK');
  
            }); */
        break;
    }
  }

  private _displaySection(category: EditorCategory) {
    switch (category) {
      case EditorCategory.RELATIONSHIP:
        this.displaySection.relationship = true;
        break;
      case EditorCategory.TERM:
        this.displaySection.term = true;
        break;
      case EditorCategory.EVIDENCE_CODE:
        this.displaySection.term = true;
        this.label = 'Evidence';
        this.formControlName = this.category;
        this.autocompleteType = AutocompleteType.EVIDENCE_CODE
        this.dynamicForm.get(this.formControlName).setValue(this.annotationActivity.evidenceCode.term.label);
        this.autocompleteCategory = this.annotationActivity?.evidenceCode.category;
        break;
      case EditorCategory.REFERENCE:
        this.displaySection.term = true;
        this.label = 'Reference';
        this.formControlName = this.category;
        this.autocompleteType = AutocompleteType.REFERENCE
        this.dynamicForm.get(this.formControlName).setValue(this.annotationActivity.reference.term.id);
        this.autocompleteCategory = null;
        break;
      case EditorCategory.WITH:
        this.displaySection.term = true;
        this.label = 'With';
        this.formControlName = this.category;
        this.autocompleteType = AutocompleteType.WITH
        this.dynamicForm.get(this.formControlName).setValue(this.annotationActivity.with.term.id);
        this.autocompleteCategory = null;
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

