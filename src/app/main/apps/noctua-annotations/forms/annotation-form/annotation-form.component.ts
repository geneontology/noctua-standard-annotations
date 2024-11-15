import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormArray, FormBuilder } from '@angular/forms';
import { Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import {
  Cam,
  Activity,
  NoctuaAnnotationFormService,
  NoctuaFormConfigService,
  ActivityState,
  ActivityType,
  NoctuaUserService,
  AnnotationActivity,
  noctuaFormConfig,
  AnnotationExtension,
  AutocompleteType,
  ActivityError,
} from '@geneontology/noctua-form-base';
import { NoctuaAnnotationsDialogService } from '../../services/dialog.service';
import { NoctuaFormDialogService } from 'app/main/apps/noctua-form/services/dialog.service';

@Component({
  selector: 'noc-annotation-form',
  templateUrl: './annotation-form.component.html',
  styleUrls: ['./annotation-form.component.scss'],
})

export class AnnotationFormComponent implements OnInit, OnDestroy {
  ActivityState = ActivityState;
  ActivityType = ActivityType;
  AutocompleteType = AutocompleteType;

  @Input() public closeDialog: () => void;

  cam: Cam;
  annotationFormGroup: FormGroup;
  searchCriteria: any = {};
  extensionFormArray: FormArray;
  commentFormArray: FormArray;
  activity: Activity;
  errors: ActivityError[] = [];
  descriptionSectionTitle = 'Function Description';
  annotatedSectionTitle = 'Gene Product';

  private _unsubscribeAll: Subject<any>;
  annotationActivity: AnnotationActivity;

  dynamicForm: FormGroup;
  comments: string[] = [];

  constructor(
    private noctuaAnnotationsDialogService: NoctuaAnnotationsDialogService,
    private noctuaFormDialogService: NoctuaFormDialogService,
    public noctuaUserService: NoctuaUserService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    private annotationFormService: NoctuaAnnotationFormService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder
  ) {
    this._unsubscribeAll = new Subject();
  }

  ngOnInit(): void {
    this.annotationFormService.initializeForm();
    this.dynamicForm = this.fb.group(this.getInitialFormStructure());
    this.addEvidence();

    this.dynamicForm.valueChanges
      .pipe(takeUntil(this._unsubscribeAll),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)))
      .subscribe({
        next: (value) => {
          this.annotationFormService.processAnnotationFormGroup(this.dynamicForm, value);
        },
        error: (err) => {
          console.error('Error observing dynamicForm changes:', err);
        }
      });

    this.annotationFormService.onFormErrorsChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((error: ActivityError[]) => {
        this.errors = error;
      });

    this.annotationFormService.onActivityChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((activity: Activity) => {

        if (!activity) {
          return;
        }
        this.activity = activity;
        this.annotationActivity = { ...this.annotationFormService.annotationActivity } as AnnotationActivity;

        this.cdr.markForCheck()
      });

    this.annotationFormService.onFormAnnotationActivityChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((annotationActivity: AnnotationActivity) => {
        if (!annotationActivity) {
          return;
        }

        this.dynamicForm.patchValue({
          gp: annotationActivity.gp.term,
          isComplement: false,
          gpToTermEdge: annotationActivity.gpToTermEdge,
          goterm: annotationActivity.goterm.term,
          evidenceCode: annotationActivity.evidenceCode.term,
          reference: annotationActivity.reference.term.id,
          withFrom: annotationActivity.with.term.id,
        });

        // Clear existing arrays
        this.dynamicForm.setControl('annotationExtensions', this.fb.array([]));
        this.dynamicForm.setControl('annotationComments', this.fb.array([]));

        // Add extensions
        annotationActivity.extensions.forEach(extension => {
          const extensionFormGroup = this.fb.group({
            extensionEdge: extension.extensionEdge?.inverseEntity,
            extensionTerm: extension.extensionTerm?.term
          });
          (this.dynamicForm.get('annotationExtensions') as FormArray).push(extensionFormGroup);
        });

        // Add comments
        annotationActivity.comments.forEach(comment => {
          const commentFormGroup = this.fb.group({
            comment: comment
          });
          (this.dynamicForm.get('annotationComments') as FormArray).push(commentFormGroup);
        });

        this.dynamicForm.updateValueAndValidity();
      });

    //this.dynamicForm.markAsDirty();
    // this.dynamicForm.markAsTouched();
    // this.dynamicForm.updateValueAndValidity();
  }

  private getInitialFormStructure() {
    return {
      gp: '',
      isComplement: false,
      gpToTermEdge: '',
      goterm: '',
      annotationExtensions: this.fb.array([]),
      annotationComments: this.fb.array([]),
      evidences: this.fb.array([])
    };

  }

  addMFRootTerm() {
    this._addRootTerm(noctuaFormConfig.rootNode.mf);
  }

  addBPRootTerm() {
    this._addRootTerm(noctuaFormConfig.rootNode.bp);
  }

  addCCRootTerm() {
    this._addRootTerm(noctuaFormConfig.rootNode.cc);
  }

  private _addRootTerm(rootTerm) {
    const goterm = this.dynamicForm.get('goterm')
    const evidenceCode = this.dynamicForm.get('evidenceCode')
    const reference = this.dynamicForm.get('reference')

    const term = {
      "id": rootTerm.id,
      "label": rootTerm.label,
      "rootTypes": [
        {
          "id": rootTerm.id,
        }
      ],
    }

    goterm.patchValue(term);

    evidenceCode.patchValue({
      id: noctuaFormConfig.evidenceAutoPopulate.nd.evidence.id,
      label: noctuaFormConfig.evidenceAutoPopulate.nd.evidence.label
    });

    reference.patchValue(noctuaFormConfig.evidenceAutoPopulate.nd.reference);
  }

  openCommentsForm() {
    const self = this;

    const success = (comments) => {
      if (comments) {
        this.comments = comments;
      }
    };
    self.noctuaFormDialogService.openCommentsDialog(this.comments, success)
  }


  checkErrors() {
    this.noctuaFormDialogService.openActivityErrorsDialog(this.errors);
  }

  hasErrors() {
    const hasError = this.errors.length > 0;
    return hasError
  }

  save() {
    const self = this;

    self.annotationFormService.saveAnnotation(this.dynamicForm.value)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        self.noctuaAnnotationsDialogService.openInfoToast('Annotation successfully created.', 'OK');
        self.clearForm();
        if (this.closeDialog) {
          this.closeDialog();
        }
      });
  }


  clearForm(): void {
    this.dynamicForm.reset(this.getInitialFormStructure());
    this.annotationActivity.extensions = [];
    this.annotationExtensions.clear();
    this.annotationComments.clear();
    this.annotationFormService.clearForm();

    this.cdr.markForCheck();
  }

  compareFn(o1: any, o2: any): boolean {
    return o1 && o2 ? o1.id === o2.id : o1 === o2;
  }

  get evidences() {
    return this.dynamicForm.get('evidences') as FormArray;
  }

  get annotationExtensions() {
    return this.dynamicForm.get('annotationExtensions') as FormArray;
  }

  get annotationComments() {
    return this.dynamicForm.get('annotationComments') as FormArray;
  }

  addEvidence() {
    this.evidences.push(this.fb.group({
      evidenceCode: '',
      reference: '',
      withFrom: '',
    }));

    this.dynamicForm.updateValueAndValidity();
  }

  deleteEvidence(index: number): void {
    if (this.evidences.length > 1) {
      this.evidences.removeAt(index);
      this.dynamicForm.updateValueAndValidity();
    }
  }

  addExtension() {
    const annotationExtension = new AnnotationExtension();
    this.annotationActivity.extensions.push(annotationExtension);
    this.annotationExtensions.push(this.fb.group({
      extensionEdge: '',
      extensionTerm: ''
    }));

    this.dynamicForm.updateValueAndValidity();
  }

  deleteExtension(index: number): void {
    this.annotationExtensions.removeAt(index);
    this.annotationActivity.extensions.splice(index, 1);
    this.dynamicForm.updateValueAndValidity();
  }

  addComment() {
    this.annotationComments.push(this.fb.group({
      comment: ''
    }));
    this.dynamicForm.updateValueAndValidity();
  }

  deleteComment(index: number): void {
    this.annotationComments.removeAt(index);
    this.dynamicForm.updateValueAndValidity();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}
