import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';

import {
  NoctuaFormConfigService,
  Entity,
} from '@geneontology/noctua-form-base';

import { detailDropdownData } from './detail-dropdown.tokens';
import { DetailDropdownOverlayRef } from './detail-dropdown-ref';
import { NoctuaFormDialogService } from 'app/main/apps/noctua-form/services/dialog.service';

@Component({
  selector: 'noc-detail-dropdown',
  templateUrl: './detail-dropdown.component.html',
  styleUrls: ['./detail-dropdown.component.scss']
})

export class NoctuaDetailDropdownComponent implements OnInit, OnDestroy {
  evidenceDBForm: FormGroup;
  formControl: FormControl;
  termDetail

  private _unsubscribeAll: Subject<any>;

  constructor(public dialogRef: DetailDropdownOverlayRef,
    @Inject(detailDropdownData) public data: any,
    private noctuaFormDialogService: NoctuaFormDialogService,
    public noctuaFormConfigService: NoctuaFormConfigService,
  ) {
    this._unsubscribeAll = new Subject();
    this.formControl = data.formControl;
    this.termDetail = data.termDetail;

  }

  ngOnInit(): void {
  }

  clearValues() {

  }

  save() {
    const self = this;
    const db = this.evidenceDBForm.value.db;
    const accession = this.evidenceDBForm.value.accession;
    const errors = [];
    let canSave = true;

    if (accession.trim() === '') {
      self.noctuaFormDialogService.openActivityErrorsDialog(errors);
      canSave = false;
    }

    if (canSave) {
      this.formControl.setValue(db.name + ':' + accession.trim());
      this.close();
    }
  }

  useTerm(term: Entity) {
    this.formControl.setValue(term);
  }

  cancelEvidenceDb() {
    this.evidenceDBForm.controls['accession'].setValue('');
  }

  close() {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}
