import { Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';


import {
  NoctuaFormConfigService,
  NoctuaActivityFormService,
  NoctuaActivityEntityService,
  CamService,
  Evidence,
  Entity,
  noctuaFormConfig,
  NoctuaUserService,
  ActivityType
} from '@geneontology/noctua-form-base';

import {
  Cam,
  Activity,
  ActivityNode,
  ShapeDefinition
} from '@geneontology/noctua-form-base';

import { EditorCategory } from '@noctua.editor/models/editor-category';
import { find } from 'lodash';
import { InlineEditorService } from '@noctua.editor/inline-editor/inline-editor.service';
import { NoctuaUtils } from '@noctua/utils/noctua-utils';
import { noctuaAnimations } from '@noctua/animations';
import { NoctuaFormDialogService } from '../../noctua-form/services/dialog.service';
import { NoctuaConfirmDialogService } from '@noctua/components/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'noc-annotation-table',
  templateUrl: './annotation-table.component.html',
  styleUrls: ['./annotation-table.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: noctuaAnimations
})
export class AnnotationTableComponent implements OnInit, OnDestroy {
  EditorCategory = EditorCategory;
  ActivityType = ActivityType;
  activityTypeOptions = noctuaFormConfig.activityType.options;

  @Input('cam')
  cam: Cam

  @Input('options')
  options: any = {};

  optionsDisplay: any = {}

  gpNode: ActivityNode;
  nodes: ActivityNode[] = [];
  editableTerms = false;
  currentMenuEvent: any = {};

  private unsubscribeAll: Subject<any>;

  constructor(
    public camService: CamService,
    public noctuaUserService: NoctuaUserService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    private confirmDialogService: NoctuaConfirmDialogService,
    private noctuaFormDialogService: NoctuaFormDialogService,
    public noctuaActivityEntityService: NoctuaActivityEntityService,
    public noctuaActivityFormService: NoctuaActivityFormService,
    private inlineEditorService: InlineEditorService) {

    this.unsubscribeAll = new Subject();
  }

  ngOnInit(): void {
    const self = this;

    if (this.options?.editableTerms) {
      this.editableTerms = this.options.editableTerms
    }

    this.optionsDisplay = { ...this.options, hideHeader: true };
    // this.nodes = this.activity.nodes

    //console.log('this.nodes', this.nodes)

    console.log('this.cam', this.cam)
  }


  toggleExpand(activity: Activity) {
    activity.expanded = !activity.expanded;
  }

  displayCamErrors() {
    const errors = this.cam.getViolationDisplayErrors();
    this.noctuaFormDialogService.openCamErrorsDialog(errors);
  }

  displayActivityErrors(activity: Activity) {
    const errors = activity.getViolationDisplayErrors();
    this.noctuaFormDialogService.openCamErrorsDialog(errors);
  }



  clearValues(entity: ActivityNode) {
    const self = this;

    entity.clearValues();
    self.noctuaActivityFormService.initializeForm();
  }

  openSelectEvidenceDialog(entity: ActivityNode) {
    const self = this;
    const evidences: Evidence[] = this.camService.getUniqueEvidence(self.noctuaActivityFormService.activity);
    const success = (selected) => {
      if (selected.evidences && selected.evidences.length > 0) {
        entity.predicate.setEvidence(selected.evidences);
        self.noctuaActivityFormService.initializeForm();
      }
    };

    self.noctuaFormDialogService.openSelectEvidenceDialog(evidences, success);
  }

  updateCurrentMenuEvent(event) {
    this.currentMenuEvent = event;
  }


  sortBy(sortCriteria: { id, label }) {
    this.cam.updateSortBy(sortCriteria.id, sortCriteria.label);
  }

  toggleSortDirection() {
    this.cam.sortBy.ascending = !this.cam.sortBy.ascending
  }

  deleteActivity(activity: Activity) {
    const self = this;

    const success = () => {
      this.camService.deleteActivity(activity).then(() => {
        self.noctuaFormDialogService.openInfoToast('Activity successfully deleted.', 'OK');
      });
    };

    if (!self.noctuaUserService.user) {
      this.confirmDialogService.openConfirmDialog('Not Logged In',
        'Please log in to continue.',
        null);
    } else {
      this.confirmDialogService.openConfirmDialog('Confirm Delete?',
        'You are about to delete an activity.',
        success);
    }
  }

  reload(cam: Cam) {
    this.camService.reload(cam);
  }

  search() {
    //let searchCriteria = this.searchForm.value;
    // this.noctuaSearchService.search(searchCriteria);
  }


  ngOnDestroy(): void {
    this.unsubscribeAll.next(null);
    this.unsubscribeAll.complete();
  }

  cleanId(dirtyId: string) {
    return NoctuaUtils.cleanID(dirtyId);
  }
}


