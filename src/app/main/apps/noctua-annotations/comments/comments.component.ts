
import { Component, OnInit, OnDestroy, Inject, Input, NgZone } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Activity, AnnotationActivity, Cam, CamService, NoctuaAnnotationFormService, NoctuaFormConfigService, NoctuaUserService, Predicate } from '@geneontology/noctua-form-base';
import { MatDrawer } from '@angular/material/sidenav';
import { EditorCategory, EditorType } from '@noctua.editor/models/editor-category';
import { NoctuaFormDialogService } from '../../noctua-form/services/dialog.service';


@Component({
  selector: 'noc-sidenav-comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.scss']
})
export class CommentsSidenavComponent implements OnInit, OnDestroy {
  private _unsubscribeAll: Subject<any>;

  EditorCategory = EditorCategory;
  EditorType = EditorType;

  @Input('cam') cam: Cam
  @Input('panelDrawer') panelDrawer: MatDrawer;

  selectedActivityId: string;
  constructor(
    private zone: NgZone,
    private camService: CamService,
    private noctuaFormDialogService: NoctuaFormDialogService,
    public noctuaUserService: NoctuaUserService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    private annotationFormService: NoctuaAnnotationFormService,
  ) {
    this._unsubscribeAll = new Subject();
  }

  ngOnInit() {
    this.annotationFormService.onCommentIdChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((id: string) => {

        if (!id) {
          return;
        }

        this.selectedActivityId = id;

      });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  openCommentsDialog(annotationActivity: AnnotationActivity) {
    const self = this;

    const success = (comments) => {
      if (comments) {
        this.annotationFormService.replaceComments(this.cam, annotationActivity, comments)
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe((data: any) => {
            this.zone.run(() => {
              this.noctuaFormDialogService.openInfoToast(`Comment(s) successfully updated.`, 'OK');
              this.camService.getCam(this.cam.id);
            });
          });
      }
    };
    self.noctuaFormDialogService.openCommentsDialog(annotationActivity.comments, success)
  }

  close() {
    this.panelDrawer.close();
  }
}
