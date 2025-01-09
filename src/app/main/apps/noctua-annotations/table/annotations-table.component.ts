import { Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';

import {
  NoctuaFormConfigService,
  noctuaFormConfig,
  ActivityType,
  AnnotationActivitySortField
} from '@geneontology/noctua-form-base';

import {
  Cam,
} from '@geneontology/noctua-form-base';

import { EditorCategory } from '@noctua.editor/models/editor-category';
import { noctuaAnimations } from '@noctua/animations';
@Component({
  selector: 'noc-annotations-table',
  templateUrl: './annotations-table.component.html',
  styleUrls: ['./annotations-table.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: noctuaAnimations
})
export class AnnotationsTableComponent implements OnInit, OnDestroy {
  readonly TABLE_HEADERS = [
    { id: 'gp', sort: AnnotationActivitySortField.GP, label: 'Gene Product', className: 'gp-cell', flex: true },
    { id: 'gpToTermEdge', sort: AnnotationActivitySortField.GP_TO_TERM_EDGE, label: 'Relationship', className: 'relation-cell' },
    { id: 'goterm', sort: AnnotationActivitySortField.GOTERM, label: 'Term', className: 'term-cell', flex: true },
    { id: 'evidenceCode', sort: AnnotationActivitySortField.EVIDENCE_CODE, label: 'Evidence', className: 'evidence-code-cell', flex: true },
    { id: 'reference', sort: AnnotationActivitySortField.REFERENCE, label: 'Reference', className: 'reference-cell' },
    { id: 'with', sort: AnnotationActivitySortField.WITH, label: 'With', className: 'with-cell' },
    { id: 'extensions', label: 'Extension', className: 'extensions-cell', flex: true, sortable: false },
    { id: 'date', sort: AnnotationActivitySortField.DATE, label: 'Date Modified', className: 'date-cell' },
    { id: 'comments', label: '', className: 'comments-cell', icon: 'comment', sortable: false },
    { id: 'action', label: '', className: 'action-cell', sortable: false }
  ];;

  EditorCategory = EditorCategory;
  ActivityType = ActivityType;
  activityTypeOptions = noctuaFormConfig.activityType.options;

  @Input() cam: Cam;
  @Input() options: any = {};

  private unsubscribeAll: Subject<any>;

  constructor(public noctuaFormConfigService: NoctuaFormConfigService) {
    this.unsubscribeAll = new Subject();
  }

  ngOnInit(): void { }


  sortBy(sortCriteria: { id: AnnotationActivitySortField, label: string }) {
    if (this.cam.annotationActivitySortBy.field === sortCriteria.id) {
      if (this.cam.annotationActivitySortBy.ascending) {
        this.cam.updateAnnotationActivitySortBy(sortCriteria.id, sortCriteria.label, false);
      } else {
        this.cam.updateAnnotationActivitySortBy(null, '');
      }
    } else {
      this.cam.updateAnnotationActivitySortBy(sortCriteria.id, sortCriteria.label, true);
    }
  }

  ngOnDestroy(): void {
    this.unsubscribeAll.next(null);
    this.unsubscribeAll.complete();
  }
}
