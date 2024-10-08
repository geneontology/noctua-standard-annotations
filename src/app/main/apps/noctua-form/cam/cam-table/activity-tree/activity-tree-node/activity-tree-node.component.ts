import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';

import { noctuaAnimations } from './../../../../../../../../@noctua/animations';
import { NoctuaFormDialogService } from './../../../../services/dialog.service';

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
  BbopGraphService
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
import { NoctuaConfirmDialogService } from '@noctua/components/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'noc-activity-tree-node',
  templateUrl: './activity-tree-node.component.html',
  styleUrls: ['./activity-tree-node.component.scss'],
  animations: noctuaAnimations
})
export class ActivityTreeNodeComponent implements OnInit, OnDestroy {
  EditorCategory = EditorCategory;
  ActivityType = ActivityType;
  activityTypeOptions = noctuaFormConfig.activityType.options;


  @Input('cam')
  cam: Cam;

  @Input('activity')
  activity: Activity;

  @Input('entity')
  entity: ActivityNode;

  @Input('options')
  options: any = {};

  relationWidth = '0px';

  optionsDisplay: any = {}

  editableTerms = false;
  currentMenuEvent: any = {};

  termNotEditable = true;

  private unsubscribeAll: Subject<any>;

  constructor(
    public camService: CamService,
    private bbopGraphService: BbopGraphService,
    private confirmDialogService: NoctuaConfirmDialogService,
    public noctuaUserService: NoctuaUserService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    private noctuaFormDialogService: NoctuaFormDialogService,
    public noctuaActivityEntityService: NoctuaActivityEntityService,
    public noctuaActivityFormService: NoctuaActivityFormService,
    private inlineEditorService: InlineEditorService) {
    this.unsubscribeAll = new Subject();
  }

  ngOnInit(): void {

    this.termNotEditable = (this.activity.activityType === ActivityType.bpOnly) && (this.entity.term.id === noctuaFormConfig.rootNode.mf.id)

    if (this.options?.editableTerms) {
      this.editableTerms = this.options.editableTerms
    }

    this.optionsDisplay = { ...this.options, hideHeader: true };
    this.relationWidth = 150 - (this.entity.treeLevel) * 16 + 'px';

  }

  editEntity(entity: ActivityNode) {

    const data = {
      cam: this.cam,
      activity: this.activity,
      entity: entity,
      category: EditorCategory.ALL,
      evidenceIndex: 0,
      insertEntity: true
    };

    this.camService.onCamChanged.next(this.cam);
    this.camService.activity = this.activity;
    this.noctuaActivityEntityService.initializeForm(this.activity, entity);
    this.inlineEditorService.open(this.currentMenuEvent.target, { data });
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


  addEvidence(entity: ActivityNode) {
    const self = this;

    entity.predicate.addEvidence();
    const data = {
      cam: this.cam,
      activity: this.activity,
      entity: entity,
      category: EditorCategory.EVIDENCE_ALL,
      evidenceIndex: entity.predicate.evidence.length - 1
    };

    this.camService.onCamChanged.next(this.cam);
    this.camService.activity = this.activity;
    this.noctuaActivityEntityService.initializeForm(this.activity, entity);
    this.inlineEditorService.open(this.currentMenuEvent.target, { data });

    self.noctuaActivityFormService.initializeForm();
  }

  deleteEntity(entity: ActivityNode) {
    const self = this;

    const success = () => {
      this.noctuaActivityEntityService.deleteActivityNode(self.activity, entity).then(() => {
        self.noctuaFormDialogService.openInfoToast(`${entity.term.label} successfully deleted.`, 'OK');

      });
    };

    const descendants = this.activity.descendants(entity.id).map((node: ActivityNode) => {
      return node.term.label
    }).join(", ");
    let message = `You are about to delete an ${entity.term.label}`;
    if (descendants) {
      message += ` and its descendants ${descendants}`;
    }

    this.confirmDialogService.openConfirmDialog('Confirm Delete?',
      `${message}`, success);
  }

  removeEvidence(entity: ActivityNode, index: number) {
    const self = this;

    entity.predicate.removeEvidence(index);
    self.noctuaActivityFormService.initializeForm();
  }

  toggleIsComplement() {

  }

  openSearchDatabaseDialog(entity: ActivityNode) {
    const self = this;
    const gpNode = this.noctuaActivityFormService.activity.gpNode;

    if (gpNode) {
      const data = {
        readonly: false,
        gpNode: gpNode.term,
        aspect: entity.aspect,
        entity: entity,
        params: {
          term: '',
          evidence: ''
        }
      };

      const success = function (selected) {
        if (selected.term) {
          entity.term = new Entity(selected.term.term.id, selected.term.term.label);

          if (selected.evidences && selected.evidences.length > 0) {
            entity.predicate.setEvidence(selected.evidences);
          }
          self.noctuaActivityFormService.initializeForm();
        }
      };

      self.noctuaFormDialogService.openSearchDatabaseDialog(data, success);
    } else {
      // const error = new ActivityError(ErrorLevel.error, ErrorType.general,  "Please enter a gene product", meta)
      //errors.push(error);
      // self.dialogService.openActivityErrorsDialog(ev, entity, errors)
    }
  }


  insertEntity(entity: ActivityNode, predExpr: ShapeDefinition.PredicateExpression) {
    const insertedNode = this.noctuaFormConfigService.insertActivityNodeShex(this.activity, entity, predExpr);

    //  this.noctuaActivityFormService.initializeForm();

    const data = {
      cam: this.cam,
      activity: this.activity,
      entity: insertedNode,
      category: EditorCategory.ALL,
      evidenceIndex: 0,
      insertEntity: true
    };

    this.camService.onCamChanged.next(this.cam);
    this.camService.activity = this.activity;
    this.noctuaActivityEntityService.initializeForm(this.activity, insertedNode);
    this.inlineEditorService.open(this.currentMenuEvent.target, { data });
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

  openCommentsForm(entity: ActivityNode) {
    const self = this;

    const success = (comments) => {
      if (comments) {
        this.bbopGraphService.savePredicateComments(self.cam, entity.predicate, comments);
      }
    };
    self.noctuaFormDialogService.openCommentsDialog(entity.predicate.comments, success)
  }

  updateCurrentMenuEvent(event) {
    this.currentMenuEvent = event;
  }

  ngOnDestroy(): void {
    this.unsubscribeAll.next(null);
    this.unsubscribeAll.complete();
  }

  cleanId(dirtyId: string) {
    return NoctuaUtils.cleanID(dirtyId);
  }
}

