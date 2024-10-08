
import { Component, OnDestroy, OnInit, Inject, NgZone, AfterViewInit } from '@angular/core';
import { Subject } from 'rxjs';

import {
  Cam,
  NoctuaUserService,
  NoctuaFormConfigService,

  CamService
} from '@geneontology/noctua-form-base';

import { takeUntil } from 'rxjs/operators';
import { NoctuaSearchService } from '../../../services/noctua-search.service';
import { noctuaAnimations } from '@noctua/animations';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { NoctuaReviewSearchService } from '../../../services/noctua-review-search.service';
import { NoctuaSearchDialogService } from '../../../services/dialog.service';
import { NoctuaSearchMenuService } from '../../../services/search-menu.service';
import { NoctuaConfirmDialogService } from '@noctua/components/confirm-dialog/confirm-dialog.service';
import { LeftPanel, MiddlePanel } from '../../../models/menu-panels';
import { ReviewMode } from '../../../models/review-mode';

@Component({
  selector: 'noc-cams-unsaved-dialog',
  templateUrl: './cams-unsaved.component.html',
  styleUrls: ['./cams-unsaved.component.scss'],
  animations: noctuaAnimations,
})
export class CamsUnsavedDialogComponent implements OnInit, OnDestroy, AfterViewInit {
  cams: Cam[] = []
  summary;

  private _unsubscribeAll: Subject<any>;

  constructor
    (
      private _matDialogRef: MatDialogRef<CamsUnsavedDialogComponent>,

      private zone: NgZone,
      public camService: CamService,
      public noctuaConfigService: NoctuaFormConfigService,
      private confirmDialogService: NoctuaConfirmDialogService,
      public noctuaSearchDialogService: NoctuaSearchDialogService,
      public noctuaUserService: NoctuaUserService,
      public noctuaSearchMenuService: NoctuaSearchMenuService,
      public noctuaSearchService: NoctuaSearchService,
      public noctuaFormConfigService: NoctuaFormConfigService,
      private noctuaReviewSearchService: NoctuaReviewSearchService,) {
    this._unsubscribeAll = new Subject();

  }

  ngOnInit(): void {

    this.camService.onCamsChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(cams => {
        if (!cams) {
          return;
        }
        this.cams = cams;
      });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.camService.onCamsCheckoutChanged
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(summary => {
          if (!summary) {
            return;
          }

          this.summary = summary;
        });
    }, 1);
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  reviewChanges() {
    const self = this;

    self.camService.reviewChangesCams();
    self.noctuaSearchMenuService.selectLeftPanel(LeftPanel.artBasket);
    self.noctuaSearchMenuService.selectMiddlePanel(MiddlePanel.camsReview);
    self.noctuaSearchMenuService.reviewMode = ReviewMode.on;
    self.noctuaSearchMenuService.isReviewMode = true;
    this.close();
  }

  logout() {
    this.noctuaReviewSearchService.clear();
    this.camService.clearCams();
    this.noctuaReviewSearchService.clearBasket();

    this._matDialogRef.close(true);
  }

  close() {
    this._matDialogRef.close();
  }
}


