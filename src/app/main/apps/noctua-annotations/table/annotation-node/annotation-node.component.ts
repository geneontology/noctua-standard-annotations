import { Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';


import {
  NoctuaFormConfigService,
  NoctuaActivityFormService,
  NoctuaActivityEntityService,
  CamService,
  Evidence,
  Entity,
  noctuaFormConfig,
  NoctuaUserService,
  ActivityType,
  Predicate,
  BbopGraphService,
  AnnotationActivity,
  AnnotationExtension,
  NoctuaAnnotationFormService
} from '@geneontology/noctua-form-base';

import {
  Cam,
  Activity,
  ActivityNode,
  ShapeDefinition
} from '@geneontology/noctua-form-base';

import { EditorCategory, EditorConfig, EditorType } from '@noctua.editor/models/editor-category';
import { find } from 'lodash';
import { InlineEditorService } from '@noctua.editor/inline-editor/inline-editor.service';
import { NoctuaUtils } from '@noctua/utils/noctua-utils';
import { NoctuaConfirmDialogService } from '@noctua/components/confirm-dialog/confirm-dialog.service';
import { noctuaAnimations } from '@noctua/animations';
import { NoctuaFormDialogService } from 'app/main/apps/noctua-form/services/dialog.service';
import { SettingsOptions } from '@noctua.common/models/graph-settings';
import { RightPanel } from '@noctua.common/models/menu-panels';
import { NoctuaCommonMenuService } from '@noctua.common/services/noctua-common-menu.service';

@Component({
  selector: 'noc-annotation-node',
  templateUrl: './annotation-node.component.html',
  styleUrls: ['./annotation-node.component.scss'],
  animations: noctuaAnimations
})
export class AnnotationNodeComponent implements OnInit, OnDestroy {
  EditorCategory = EditorCategory;
  EditorType = EditorType;
  ActivityType = ActivityType;
  activityTypeOptions = noctuaFormConfig.activityType.options;


  @Input('cam')
  cam: Cam;

  @Input('annotationActivity')
  annotationActivity: AnnotationActivity;

  @Input('options')
  options: any = {};

  optionsDisplay: any = {}

  currentMenuEvent: any = {};

  evidenceSettings: SettingsOptions = new SettingsOptions();

  private _unsubscribeAll: Subject<any>;

  constructor(
    private zone: NgZone,
    public camService: CamService,
    private bbopGraphService: BbopGraphService,
    public annotationFormService: NoctuaAnnotationFormService,
    private confirmDialogService: NoctuaConfirmDialogService,
    public noctuaUserService: NoctuaUserService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    private noctuaFormDialogService: NoctuaFormDialogService,
    public noctuaActivityEntityService: NoctuaActivityEntityService,
    public noctuaActivityFormService: NoctuaActivityFormService,
    public noctuaCommonMenuService: NoctuaCommonMenuService,

    private inlineEditorService: InlineEditorService) {
    this._unsubscribeAll = new Subject();
  }

  ngOnInit(): void {

    this.optionsDisplay = { ...this.options, hideHeader: true };
    this.evidenceSettings.showGroup = false;
    this.evidenceSettings.showContributor = false;

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

  removeEvidence(entity: ActivityNode, index: number) {
    const self = this;

    entity.predicate.removeEvidence(index);
    self.noctuaActivityFormService.initializeForm();
  }

  addRootTerm(entity: ActivityNode) {
    const self = this;

    const term = find(noctuaFormConfig.rootNode, (rootNode) => {
      return rootNode.aspect === entity.aspect;
    });

    if (term) {
      entity.term = new Entity(term.id, term.label);
      self.noctuaActivityFormService.initializeForm();

      const evidence = new Evidence();
      evidence.setEvidence(new Entity(
        noctuaFormConfig.evidenceAutoPopulate.nd.evidence.id,
        noctuaFormConfig.evidenceAutoPopulate.nd.evidence.label));
      evidence.reference = noctuaFormConfig.evidenceAutoPopulate.nd.reference;
      entity.predicate.setEvidence([evidence]);
      self.noctuaActivityFormService.initializeForm();
    }
  }

  addExtension() {
    const data: EditorConfig = {
      cam: this.cam,
      annotationActivity: this.annotationActivity,
      category: EditorCategory.ADD_EXTENSION,
      editorType: EditorType.STANDARD
    };

    this.inlineEditorService.open(this.currentMenuEvent.target, { data });
  }

  addComment() {
    const data: EditorConfig = {
      cam: this.cam,
      annotationActivity: this.annotationActivity,
      category: EditorCategory.ADD_COMMENT,
      editorType: EditorType.STANDARD
    };

    this.inlineEditorService.open(this.currentMenuEvent.target, { data });
  }

  updateCurrentMenuEvent(event) {
    this.currentMenuEvent = event;
  }

  deleteAnnotation() {
    const self = this;

    const success = () => {
      this.camService.deleteActivity(this.annotationActivity.activity).then(() => {
        self.noctuaFormDialogService.openInfoToast('Annotation successfully deleted.', 'OK');
        this.camService.onSelectedActivityChanged.next(null);
        this.camService.getCam(this.cam.id);

      });
    };

    if (!self.noctuaUserService.user) {
      this.confirmDialogService.openConfirmDialog('Not Logged In',
        'Please log in to continue.',
        null);
    } else {
      this.confirmDialogService.openConfirmDialog('Confirm Delete?',
        'You are about to delete an annotation.',
        success);
    }
  }

  deleteExtension(extension: AnnotationExtension) {
    const self = this;

    const success = () => {
      this.annotationFormService.deleteExtension(self.annotationActivity, extension)
        .pipe(takeUntil(self._unsubscribeAll))
        .subscribe(() => {
          self.zone.run(() => {
            self.noctuaFormDialogService.openInfoToast('Annotation Extension successfully deleted.', 'OK');
            self.camService.getCam(this.cam.id);
          });
        });
    };
    this.confirmDialogService.openConfirmDialog('Confirm Delete?',
      'You are about to delete an extension.',
      success);

  }

  copyToForm() {
    this.annotationFormService.onFormAnnotationActivityChanged.next(this.annotationActivity);
  }

  openComments(annotationActivity: AnnotationActivity) {
    this.annotationFormService.selectCommentActivityId(annotationActivity.id);
    this.noctuaCommonMenuService.selectRightPanel(RightPanel.COMMENTS);
    this.noctuaCommonMenuService.openRightDrawer();
    this.noctuaCommonMenuService.closeLeftDrawer();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  cleanId(dirtyId: string) {
    return NoctuaUtils.cleanID(dirtyId);
  }
}

