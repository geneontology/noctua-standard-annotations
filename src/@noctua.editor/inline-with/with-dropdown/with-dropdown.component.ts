import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators, FormBuilder, FormArray } from '@angular/forms';
import { Subject } from 'rxjs';

import {
  NoctuaFormConfigService,
  NoctuaActivityFormService,
  ActivityError,
  ErrorLevel,
  ErrorType,
  withFromAllowedDBs
} from '@geneontology/noctua-form-base';

import { withDropdownData } from './with-dropdown.tokens';
import { WithDropdownOverlayRef } from './with-dropdown-ref';
import { NoctuaFormDialogService } from 'app/main/apps/noctua-form/services/dialog.service';

@Component({
  selector: 'noc-with-dropdown',
  templateUrl: './with-dropdown.component.html',
  styleUrls: ['./with-dropdown.component.scss']
})

export class NoctuaWithDropdownComponent implements OnInit, OnDestroy {
  evidenceDBForm: FormGroup;
  formControl: FormControl;

  myForm: FormGroup;
  allowedDBs: string[] = withFromAllowedDBs;
  dbOptions: string[] = ['None', ...withFromAllowedDBs.slice().sort()];

  private _unsubscribeAll: Subject<any>;

  constructor(private fb: FormBuilder, public dialogRef: WithDropdownOverlayRef,
    @Inject(withDropdownData) public data: any,
    private noctuaFormDialogService: NoctuaFormDialogService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    public noctuaActivityFormService: NoctuaActivityFormService,
  ) {
    this._unsubscribeAll = new Subject();
    this.formControl = data.formControl;

    this.myForm = this.fb.group({
      databaseGroups: this.fb.array([])
    });

    const withfroms = this.formControl.value;
    if (withfroms && withfroms.trim()) {
      // Parse existing value: groups separated by ',', entities within group by '|'
      const groups = withfroms.split(',');
      groups.forEach(group => {
        const trimmedGroup = group.trim();
        if (trimmedGroup) {
          const entities = trimmedGroup.split('|');
          const groupControl = this.addNewGroup(false);
          entities.forEach(entity => {
            const trimmedEntity = entity.trim();
            if (trimmedEntity) {
              const colonIndex = trimmedEntity.indexOf(':');
              const rawDb = colonIndex >= 0 ? trimmedEntity.slice(0, colonIndex).trim() : 'None';
              const accession = colonIndex >= 0 ? trimmedEntity.slice(colonIndex + 1).trim() : trimmedEntity;
              const db = this.allowedDBs.find(allowed => allowed.toLowerCase() === rawDb.toLowerCase()) || rawDb;
              this.addNewEntity(groupControl.get('entities') as FormArray, db, accession);
            }
          });
        }
      });
    } else {
      // Default: one group with one empty entity
      this.addNewGroup(true);
    }
  }

  ngOnInit(): void {
    this.evidenceDBForm = this._createEvidenceDBForm();
  }

  addNewGroup(addEntity: boolean = true) {
    const control = this.myForm.get('databaseGroups') as FormArray;
    const group = this.fb.group({
      entities: this.fb.array([])
    });
    control.push(group);

    if (addEntity) {
      this.addNewEntity(group.get('entities') as FormArray, 'None', '');
    }

    return group;
  }

  deleteGroup(index: number) {
    const control = this.myForm.get('databaseGroups') as FormArray;
    control.removeAt(index);
  }

  addNewEntity(control: FormArray, db?: string, accession?: string) {
    control.push(this.fb.group({
      db: [db || 'None'],
      accession: [accession || '']
    }));
  }

  deleteEntity(control: FormArray, index: number) {
    control.removeAt(index);
  }

  save() {
    const errors = [];
    let canSave = true;

    const withs = this.myForm.value.databaseGroups
      .map((group) => {
        return group.entities
          .map((entity) => {
            if (entity.db === 'None' && (!entity.accession || !entity.accession.trim())) {
              return null;
            }

            if (entity.accession && entity.accession.trim() && entity.db === 'None') {
              const error = new ActivityError(ErrorLevel.error, ErrorType.general,
                `Please select a database for the accession value "${entity.accession.trim()}"`);
              errors.push(error);
              canSave = false;
              return null;
            }

            if (entity.db !== 'None' && (!entity.accession || !entity.accession.trim())) {
              const error = new ActivityError(ErrorLevel.error, ErrorType.general,
                `Accession value is required for database "${entity.db}"`);
              errors.push(error);
              canSave = false;
              return null;
            }

            if (entity.db !== 'None' && entity.accession && entity.accession.trim()) {
              return `${entity.db}:${entity.accession.trim()}`;
            }

            return null;
          })
          .filter(item => item !== null)
          .join('|');
      })
      .filter(group => group.length > 0)
      .join(',');

    if (canSave) {
      this.formControl.setValue(withs);
      this.close();
    } else {
      this.noctuaFormDialogService.openActivityErrorsDialog(errors);
    }
  }

  cancelEvidenceDb() {
    this.evidenceDBForm.controls['accession'].setValue('');
  }

  private _createEvidenceDBForm() {
    return new FormGroup({
      db: new FormControl(this.noctuaFormConfigService.evidenceDBs.selected),
      accession: new FormControl('',
        [
          Validators.required,
        ])
    });
  }

  close() {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}
