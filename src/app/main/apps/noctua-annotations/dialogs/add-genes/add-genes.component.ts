



import { Component, OnInit, OnDestroy, Inject, AfterViewInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { CamService, Gene, GeneList } from '@geneontology/noctua-form-base';
import { NoctuaFormDialogService } from 'app/main/apps/noctua-form/services/dialog.service';
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
  maxGenes = 150;

  constructor(
    private _matDialogRef: MatDialogRef<AddGenesDialogComponent>,
    private noctuaFormDialogService: NoctuaFormDialogService,
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

    if (!this.geneFormGroup.value['geneIds']) return [];

    const geneText = this.geneFormGroup.value['geneIds']
      .replace(/["']/g, '')
      .replace(/[^a-zA-Z0-9:\s,]/g, '')  // Changed \n to \s to preserve all whitespace
      .replace(/,\s*/g, '\n')
      .replace(/[ \t]+/g, '');

    const lines = geneText
      .split(/\r\n|\n/)
      .map(line => line.trim())
      .filter(line => line !== '' && line.length >= 5);

    const geneIds = [...new Set(lines)] as string[];

    console.log('geneIds', geneIds);

    if (geneIds?.length > this.maxGenes) {
      this.noctuaFormDialogService.openInfoToast(`Too many genes to search. Please enter less than ${this.maxGenes} genes.`, 'OK');
      return;
    }

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
