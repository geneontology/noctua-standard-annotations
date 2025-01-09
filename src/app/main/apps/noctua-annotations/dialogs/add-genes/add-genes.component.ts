



import { Component, OnInit, OnDestroy, Inject, AfterViewInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { CamService, Gene, GeneList } from '@geneontology/noctua-form-base';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-add-genes',
  templateUrl: './add-genes.component.html',
  styleUrls: ['./add-genes.component.scss']
})
export class AddGenesDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  private _unsubscribeAll: Subject<any>;
  geneFormGroup: FormGroup;


  genes: Gene[] = [];
  nonMatchingGenes: Gene[] = [];
  identifiersNotMatched: string[] = [];
  totalCount: number = 0;
  activeTab: string = 'matched';

  constructor(
    private _matDialogRef: MatDialogRef<AddGenesDialogComponent>,
    private _camService: CamService,
    @Inject(MAT_DIALOG_DATA) private _data: any,
  ) {
    this._unsubscribeAll = new Subject();
  }

  ngOnInit() {
    this.geneFormGroup = this.createGeneForm();
  }

  ngAfterViewInit() {
    // this.dataSource.paginator = this.paginator;
  }

  setActiveTab(tabName: string) {
    this.activeTab = tabName;
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  createGeneForm() {
    return new FormGroup({
      geneIds: new FormControl(),
    })
  }

  loadGenes() {
    const geneIds = this.geneFormGroup.value['geneIds']?.split('\n').map((gene: string) => {
      return gene.trim();
    });

    this._camService.getGenesDetails(geneIds)
      .subscribe((result: GeneList) => {
        this.genes = result.genes;
        this.nonMatchingGenes = result.nonMatchingGenes;
        this.identifiersNotMatched = result.identifiersNotMatched;
        this.totalCount = result.count || 0;
      });
  }

  save() {
    this._matDialogRef.close(this.genes);
  }

  close() {
    this._matDialogRef.close();
  }
}
