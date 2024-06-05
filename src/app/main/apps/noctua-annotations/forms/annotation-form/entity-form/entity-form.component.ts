import { Component, Input, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormArray } from '@angular/forms';
import { MatMenuTrigger } from '@angular/material/menu';
import { Subject, takeUntil } from 'rxjs';
import { NoctuaAnnotationsDialogService } from './../../../services/dialog.service';
import {
  CamService,
  NoctuaFormConfigService,
  NoctuaAnnotationFormService,
  ActivityNode,
  Evidence,
  noctuaFormConfig,
  Entity,
  ShapeDefinition,
  ActivityError,
  ActivityNodeType,
  Activity,
  ErrorLevel,
  ErrorType,
  ActivityType
} from '@geneontology/noctua-form-base';
import { InlineReferenceService } from '@noctua.editor/inline-reference/inline-reference.service';
import { each, find } from 'lodash';
import { InlineWithService } from '@noctua.editor/inline-with/inline-with.service';
import { InlineDetailService } from '@noctua.editor/inline-detail/inline-detail.service';
import { NoctuaFormDialogService } from 'app/main/apps/noctua-form/services/dialog.service';

@Component({
  selector: 'noc-annotation-entity-form',
  templateUrl: './entity-form.component.html',
  styleUrls: ['./entity-form.component.scss'],
})

export class AnnotationEntityFormComponent implements OnInit, OnDestroy {
  @Input('entityFormGroup')
  public entityFormGroup: FormGroup;

  private _selectTerm: (term: any) => void = this.updateMenu; // Initialize with default function

  @Input()
  set selectTerm(fn: (term: any) => void) {
    if (fn) {
      this._selectTerm = fn;
    }
  }

  get selectTerm(): (term: any) => void {
    return this._selectTerm;
  }


  @ViewChild('evidenceDBreferenceMenuTrigger', { static: true, read: MatMenuTrigger })
  evidenceDBreferenceMenuTrigger: MatMenuTrigger;

  evidenceDBForm: FormGroup;
  evidenceFormArray: FormArray;
  entity: ActivityNode;
  activityNodeType = ActivityNodeType;
  displayAddButton = false;

  termData

  private _unsubscribeAll: Subject<any>;

  constructor(
    private noctuaAnnotationsDialogService: NoctuaAnnotationsDialogService,
    private noctuaFormDialogService: NoctuaFormDialogService,
    private camService: CamService,
    private inlineReferenceService: InlineReferenceService,
    private inlineDetailService: InlineDetailService,
    private inlineWithService: InlineWithService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    public noctuaAnnotationFormService: NoctuaAnnotationFormService) {
    this._unsubscribeAll = new Subject();
  }

  ngOnInit(): void {
    this.noctuaAnnotationFormService.onActivityChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((activity: Activity) => {

        if (!activity) {
          return;
        }
        this.entity = activity.getNode(this.entityFormGroup.value['id']);
      });

  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  addEvidence() {
    const self = this;

    self.entity.predicate.addEvidence();
    self.noctuaAnnotationFormService.initializeForm();
  }

  useTerm(node: ActivityNode, activity: Activity) {
    const self = this;

    self.entity.term = node.term;
    switch (self.entity.type) {
      case ActivityNodeType.GoBiologicalProcess:
      case ActivityNodeType.GoCellularComponent:
        self.entity.linkedNode = true;
        self.entity.uuid = node.uuid;
        self.noctuaAnnotationFormService.activity.insertSubgraph(activity, self.entity, node);
    }

    self.noctuaAnnotationFormService.initializeForm();
  }

  openSearchModels() {
    const self = this;
    const gpNode = this.noctuaAnnotationFormService.activity.gpNode;
    // const searchCriteria = new SearchCriteria();

    //searchCriteria.goterms.push(this.entity.term);

    // const url = this.noctuaFormConfigService.getUniversalWorkbenchUrl('noctua-search', searchCriteria.buildEncoded());


    // window.open(url, '_blank');

  }


  insertEntityShex(predExpr: ShapeDefinition.PredicateExpression) {
    this.noctuaFormConfigService.insertActivityNodeShex(this.noctuaAnnotationFormService.activity, this.entity, predExpr);
    this.noctuaAnnotationFormService.initializeForm();
  }

  clearValues() {
    const self = this;

    self.entity.clearValues();
    self.noctuaAnnotationFormService.initializeForm();
  }

  removeNode() {
    const self = this;

    self.noctuaAnnotationFormService.activity.removeNode(self.entity);
    self.noctuaAnnotationFormService.initializeForm();
  }

  updateMenu(entity) {
    // this.noctuaAnnotationFormService.initializeForm(entity.rootTypes);
  }

  updateTermList() {
    const self = this;
    // this.camService.updateTermList(self.noctuaAnnotationFormService.activity, this.entity);
  }

  updateEvidenceList() {
    const self = this;
    this.camService.updateEvidenceList(self.noctuaAnnotationFormService.activity, this.entity);
  }

  updateReferenceList() {
    const self = this;
    this.camService.updateReferenceList(self.noctuaAnnotationFormService.activity, this.entity);
  }

  updateWithList() {
    const self = this;
    this.camService.updateWithList(self.noctuaAnnotationFormService.activity, this.entity);
  }

  openAddReference(event, evidence: FormGroup, name: string) {
    event.stopPropagation();
    const data = {
      formControl: evidence.controls[name] as FormControl,
    };
    this.inlineReferenceService.open(event.target, { data });
  }

  openAddWith(event, evidence: FormGroup, name: string) {
    event.stopPropagation();
    const data = {
      formControl: evidence.controls[name] as FormControl,
    };
    this.inlineWithService.open(event.target, { data });
  }



  openTermDetails(event, item) {
    event.stopPropagation();

    const data = {
      termDetail: item,
      formControl: this.entityFormGroup.controls['term'] as FormControl,
    };
    this.inlineDetailService.open(event.target, { data });

    //this.termData = data

  }

  termDisplayFn(term): string | undefined {
    return term && term.id ? `${term.label} (${term.id})` : undefined;
  }

  evidenceDisplayFn(evidence): string | undefined {
    return evidence && evidence.id ? `${evidence.label} (${evidence.id})` : undefined;
  }

  referenceDisplayFn(evidence: Evidence | string): string | undefined {
    if (typeof evidence === 'string') {
      return evidence;
    }

    return evidence && evidence.reference ? evidence.reference : undefined;
  }

  withDisplayFn(evidence: Evidence | string): string | undefined {
    if (typeof evidence === 'string') {
      return evidence;
    }

    return evidence && evidence.with ? evidence.with : undefined;
  }
}
