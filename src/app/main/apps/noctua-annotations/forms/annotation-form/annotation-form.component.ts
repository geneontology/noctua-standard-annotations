import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormArray } from '@angular/forms';
import { MatDrawer } from '@angular/material/sidenav';
import { Subscription, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
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
  Evidence,
  Entity,
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

  @Input('panelDrawer')
  panelDrawer: MatDrawer;

  @Input() public closeDialog: () => void;

  resizeStyle = {};

  cam: Cam;
  annotationFormGroup: FormGroup;
  //molecularEntity: FormGroup;
  searchCriteria: any = {};
  annotationFormPresentation: any;
  evidenceFormArray: FormArray;
  annotationFormData: any = [];
  activity: Activity;
  // currentActivity: Activity;
  // state: ActivityState;

  descriptionSectionTitle = 'Function Description';
  annotatedSectionTitle = 'Gene Product';

  private _unsubscribeAll: Subject<any>;
  annotationActivity: AnnotationActivity;

  constructor(
    private noctuaAnnotationsDialogService: NoctuaAnnotationsDialogService,
    private noctuaFormDialogService: NoctuaFormDialogService,
    public noctuaUserService: NoctuaUserService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    public noctuaAnnotationFormService: NoctuaAnnotationFormService
  ) {
    this._unsubscribeAll = new Subject();
  }

  ngOnInit(): void {
    this.noctuaAnnotationFormService.annotationFormGroup$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(annotationFormGroup => {
        if (!annotationFormGroup) {
          return;
        }

        this.annotationFormGroup = annotationFormGroup;
      });

    this.noctuaAnnotationFormService.onActivityChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((activity: Activity) => {

        if (!activity) {
          return;
        }
        this.activity = activity;
        this.annotationActivity = this.noctuaAnnotationFormService.annotationActivity;
      });
  }


  addMFRootTerm() {
    this._addRootTerm(noctuaFormConfig.rootNode.mf);

    console.log(this.annotationFormGroup)
  }


  private _addRootTerm(rootTerm) {
    const self = this;

    if (rootTerm) {
      this.noctuaAnnotationFormService.annotationActivity.goterm.term = new Entity(rootTerm.id, rootTerm.label);
      const goterm = this.annotationFormGroup.get('goterm')
      goterm.patchValue(this.noctuaAnnotationFormService.annotationActivity.goterm);
      //self.noctuaAnnotationFormService.initializeForm();

      const evidence = new Evidence();
      evidence.setEvidence(new Entity(
        noctuaFormConfig.evidenceAutoPopulate.nd.evidence.id,
        noctuaFormConfig.evidenceAutoPopulate.nd.evidence.label));
      evidence.reference = noctuaFormConfig.evidenceAutoPopulate.nd.reference;
      //self.annotationActivity.gpToTermEdge.setEvidence([evidence]);
      self.noctuaAnnotationFormService.initializeForm();
    }
  }


  checkErrors() {
    const errors = [...this.noctuaAnnotationFormService.activity.submitErrors, ...this.noctuaAnnotationFormService.annotationActivity.submitErrors]
    this.noctuaFormDialogService.openActivityErrorsDialog(errors);
  }

  hasErrors() {
    const hasError = this.noctuaAnnotationFormService.activity.submitErrors.length > 0 ||
      this.noctuaAnnotationFormService.annotationActivity.submitErrors.length > 0;

    return hasError

  }

  save() {
    const self = this;

    self.noctuaAnnotationFormService.saveAnnotation().subscribe(() => {
      self.noctuaAnnotationsDialogService.openInfoToast('Annotation successfully created.', 'OK');
      self.noctuaAnnotationFormService.clearForm();
      if (this.closeDialog) {
        this.closeDialog();
      }
    });
  }

  updateMenu(entity) {

    // this.noctuaAnnotationFormService.initializeForm(entity.rootTypes);
  }


  clear() {
    this.noctuaAnnotationFormService.clearForm();
  }

  createExample() {
    const self = this;

    self.noctuaAnnotationFormService.initializeFormData();
  }

  termDisplayFn(term): string | undefined {
    return term ? term.label : undefined;
  }

  compareFn(o1: any, o2: any): boolean {
    return o1 && o2 ? o1.id === o2.id : o1 === o2;
  }

  close() {

    if (this.panelDrawer) {
      this.panelDrawer.close();
    }
    if (this.closeDialog) {
      this.closeDialog();
    }

  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}
