import { Component, Inject, OnInit, OnDestroy, NgZone } from '@angular/core';
import { FormGroup, FormArray, FormBuilder } from '@angular/forms';
import { Subject } from 'rxjs';
import {
  NoctuaFormConfigService,
  NoctuaActivityFormService,
  CamService,
  Entity,
  ActivityError,
  AnnotationActivity,
  AutocompleteType,
  NoctuaAnnotationFormService,
  noctuaFormConfig,
} from '@geneontology/noctua-form-base';

import { Cam } from '@geneontology/noctua-form-base';
import { ActivityNode } from '@geneontology/noctua-form-base';
import { EditorCategory } from './../../models/editor-category';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { InlineReferenceService } from './../../inline-reference/inline-reference.service';
import { NoctuaFormDialogService } from 'app/main/apps/noctua-form/services/dialog.service';
import { EditorDropdownOverlayRef } from '../editor-dropdown/editor-dropdown-ref';
import { editorDropdownData } from '../editor-dropdown/editor-dropdown.tokens';

enum FormStructureKeys {
  IS_COMPLEMENT = 'isComplement',
  RELATION = 'relation',
  TERM = 'term'
}

const RELATION_NOT_EDITABLE = [
  noctuaFormConfig.edge.isActiveIn.id,
  noctuaFormConfig.edge.locatedIn.id,
]

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
  relationLabel: string;

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
      [FormStructureKeys.IS_COMPLEMENT]: false,
      [FormStructureKeys.RELATION]: '',
      [FormStructureKeys.TERM]: '',
    };
  }

  openAddReference(event, name: string) {

    const data = {
      //formControl: this.evidenceFormGroup.controls[name] as FormControl,
    };
    this.inlineReferenceService.open(event.target, { data });

  }

  // Will refactor later

  save() {
    let termId: string = this.dynamicForm.value[FormStructureKeys.TERM]?.id;
    let relationId: string = this.dynamicForm.value[FormStructureKeys.RELATION]?.id;
    let termString = this.dynamicForm.value[FormStructureKeys.TERM];

    const handleResponse = () => {
      this.zone.run(() => {
        this.noctuaFormDialogService.openInfoToast(`${this.label} successfully updated.`, 'OK');
        this.camService.getCam(this.cam.id);
      });
      this.close();
    };

    switch (this.category) {
      case EditorCategory.TERM:
      case EditorCategory.EVIDENCE_CODE:
        if (termId) {
          this.annotationFormService.editAnnotation(this.category, this.cam, this.annotationActivity, termId)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(handleResponse);
        } else {
          this.noctuaFormDialogService.openInfoToast(`Please select term from autocomplete.`, 'OK');
        }
        break;
      case EditorCategory.WITH:
      case EditorCategory.REFERENCE:
        this.annotationFormService.editAnnotation(this.category, this.cam, this.annotationActivity, termString)
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe(handleResponse);
        break;

      case EditorCategory.GP_TO_TERM_EDGE:

        if (RELATION_NOT_EDITABLE.includes(relationId)) {
          const relationLabel = this.noctuaFormConfigService.findEdge(relationId)?.label;
          this.noctuaFormDialogService.openInfoToast(`Editing "${relationLabel}" is not currently supported. Please delete the annotation and add the new relation instead.`, 'OK');

          this.close();
        } else if (relationId !== this.annotationActivity.gpToTermEdge.inverseEntity.id) {
          this.annotationFormService.editRelation(this.category, this.cam, this.annotationActivity, relationId)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(handleResponse);
        } else {
          this.close();
        }
        break;

      case EditorCategory.ADD_EXTENSION:
        const extensionValue = { relationId, termId };
        this.annotationFormService.addExtension(this.category, this.cam, this.annotationActivity, extensionValue)
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe(handleResponse);
        break;

      case EditorCategory.ADD_COMMENT:
        this.annotationFormService.updateComment(this.cam, this.annotationActivity, termString)
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe(handleResponse);
        break;
    }
  }

  private _displaySection(category: EditorCategory) {
    switch (category) {
      case EditorCategory.GP_TO_TERM_EDGE:
        this.displaySection.relationship = true;
        this.relationLabel = 'GP To Term Relation';
        this.dynamicForm.get(FormStructureKeys.RELATION).setValue(this.annotationActivity.gpToTermEdge.inverseEntity);
        this.relationshipChoices = this.annotationActivity.gpToTermEdges;
        break;
      case EditorCategory.TERM:
        this.displaySection.term = true;
        break;
      case EditorCategory.EVIDENCE_CODE:
        this.displaySection.term = true;
        this.label = 'Evidence';
        this.autocompleteType = AutocompleteType.EVIDENCE_CODE
        this.dynamicForm.get(FormStructureKeys.TERM).setValue(this.annotationActivity.evidenceCode.term.label);
        this.autocompleteCategory = this.annotationActivity?.evidenceCode.category;
        break;
      case EditorCategory.REFERENCE:
        this.displaySection.term = true;
        this.label = 'Reference';
        this.autocompleteType = AutocompleteType.REFERENCE
        this.dynamicForm.get(FormStructureKeys.TERM).setValue(this.annotationActivity.reference.term.id);
        this.autocompleteCategory = null;
        break;
      case EditorCategory.WITH:
        this.displaySection.term = true;
        this.label = 'With';
        this.autocompleteType = AutocompleteType.WITH
        this.dynamicForm.get(FormStructureKeys.TERM).setValue(this.annotationActivity.with.term.id);
        this.autocompleteCategory = null;
        break;

      case EditorCategory.ADD_COMMENT:
        this.displaySection.term = true;
        this.label = 'Comment';
        this.autocompleteType = AutocompleteType.COMMENT
        this.autocompleteCategory = null;
        break;
      case EditorCategory.ADD_EXTENSION:
        const { edges, range } = this.annotationFormService.getEdgesRange(this.annotationActivity.goterm.rootTypes,
        );
        this.displaySection.relationship = true;
        this.displaySection.term = true;
        this.relationLabel = 'New Extension Relation';
        this.label = 'New Extension Term';
        this.autocompleteType = AutocompleteType.TERM
        this.relationshipChoices = edges;
        this.autocompleteCategory = range;

        this._registerExtensionFormChange()
        break;

    }
  }

  private _registerExtensionFormChange() {
    this.dynamicForm.valueChanges
      .pipe(takeUntil(this._unsubscribeAll),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)))
      .subscribe({
        next: (value) => {
          console.log('Annotation form group processed:', value);
          const objectRootTypes = value.term?.rootTypes ?? [];

          const { edges, range } = this.annotationFormService.getEdgesRange(this.annotationActivity.goterm.rootTypes,
            objectRootTypes, value.relation?.id);
          this.relationshipChoices = edges;
          this.autocompleteCategory = range;
        },
        error: (err) => {
          console.error('Error observing dynamicForm changes:', err);
        }
      });
  }

  compareFn(o1: any, o2: any): boolean {
    return o1 && o2 ? o1.id === o2.id : o1 === o2;
  }

  close() {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}

