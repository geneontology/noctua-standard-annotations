
import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { takeUntil } from 'rxjs/operators';

import { SelectionModel } from '@angular/cdk/collections';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { Subject } from 'rxjs';

import {
  ActivityNode,
  Evidence,
  NoctuaFormConfigService,
  NoctuaLookupService
} from '@geneontology/noctua-form-base';

import { noctuaAnimations } from './../../../../../../@noctua/animations';

@Component({
  selector: 'app-search-database',
  templateUrl: './search-database.component.html',
  styleUrls: ['./search-database.component.scss'],
  animations: noctuaAnimations
})
export class SearchDatabaseDialogComponent implements OnInit, OnDestroy {
  private _unsubscribeAll: Subject<any>;
  evidence: Evidence[] = [];
  activityNodes: ActivityNode[] = [];
  selectedActivityNode: ActivityNode;
  searchCriteria: any;
  displayedColumns: string[] = ['select', 'evidence', 'reference', 'with', 'assignedBy'];
  dataSource;
  selection = new SelectionModel<Evidence>(true, []);

  constructor(
    private _matDialogRef: MatDialogRef<SearchDatabaseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private _data: any,
    public noctuaFormConfigService: NoctuaFormConfigService,
    private noctuaLookupService: NoctuaLookupService,
  ) {
    this._unsubscribeAll = new Subject();

    this.evidence = this._data.evidence;
    this.searchCriteria = this._data.searchCriteria;
    this.initialize();

  }
  ngOnInit() { }

  initialize() {
    const self = this;

    self.noctuaLookupService.companionLookup(
      this.searchCriteria.gpNode.id,
      this.searchCriteria.aspect,
      this.searchCriteria.params)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((response) => {
        this.activityNodes = response;
      });
  }

  selectActivityNode(activityNode: ActivityNode) {
    this.selectedActivityNode = activityNode;
    this.dataSource = new MatTableDataSource<Evidence>(activityNode.predicate.evidence);
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
      this.selection.clear() :
      this.dataSource.data.forEach(row => this.selection.select(row));
  }

  save() {
    this._matDialogRef.close({
      term: this.selectedActivityNode,
      evidences: <Evidence[]>this.selection.selected
    });
  }

  close() {
    this._matDialogRef.close();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}
