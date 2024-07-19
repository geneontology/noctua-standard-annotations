
import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { Subject } from 'rxjs';
import { Cam, NoctuaFormConfigService, Predicate } from '@geneontology/noctua-form-base';


@Component({
  selector: 'app-comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.scss']
})
export class CommentsDialogComponent implements OnInit, OnDestroy {
  private _unsubscribeAll: Subject<any>;
  commentsFormGroup: FormGroup;
  commentsFormArray: FormArray
  comments: string[] = [];

  constructor(
    private _matDialogRef: MatDialogRef<CommentsDialogComponent>,
    public noctuaFormConfigService: NoctuaFormConfigService,
    @Inject(MAT_DIALOG_DATA) private _data: any,
  ) {
    this._unsubscribeAll = new Subject();
    this.comments = _data.comments;
    this.commentsFormGroup = this.createForm();
    this.commentsFormArray = this.commentsFormGroup.get('commentsFormArray') as FormArray

  }

  ngOnInit() {
    this.comments.forEach((comment: string) => {
      this.commentsFormArray.push(new FormControl(comment));
    });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  createForm() {
    return new FormGroup({
      commentsFormArray: new FormArray([]),
    });
  }

  addComment() {
    this.commentsFormArray.push(new FormControl())
  }

  deleteComment(index) {
    this.commentsFormArray.removeAt(index)
    this.save()
  }

  save() {
    const value = this.commentsFormGroup.value['commentsFormArray'];
    this._matDialogRef.close(value);
  }

  close() {
    this._matDialogRef.close();
  }
}
