import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDrawer } from '@angular/material/sidenav';
import { ActivatedRoute } from '@angular/router';
import {
  ActivityType,
  BbopGraphService,
  Cam,
  CamService,
  Contributor,
  LeftPanel,
  MiddlePanel,
  NoctuaFormConfigService,
  NoctuaUserService,
  RightPanel
} from '@geneontology/noctua-form-base'
import { CamToolbarOptions } from '@noctua.common/models/cam-toolbar-options';
import { NoctuaCommonMenuService } from '@noctua.common/services/noctua-common-menu.service';
import { environment } from 'environments/environment';
import { Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-noctua-pathway',
  templateUrl: './noctua-pathway.component.html',
  styleUrls: ['./noctua-pathway.component.scss']
})
export class NoctuaPathwayComponent implements OnInit, OnDestroy {
  cam: Cam;
  modelId: string;
  apiUrl: string;

  ActivityType = ActivityType;
  LeftPanel = LeftPanel;
  MiddlePanel = MiddlePanel;
  RightPanel = RightPanel;


  @ViewChild('leftDrawer', { static: true })
  leftDrawer: MatDrawer;

  @ViewChild('rightDrawer', { static: true })
  rightDrawer: MatDrawer;

  camToolbarOptions: CamToolbarOptions = {
    showCreateButton: false
  }
  private _unsubscribeAll: Subject<any>;
  constructor(
    private route: ActivatedRoute,
    private camService: CamService,
    private _bbopGraphService: BbopGraphService,
    public noctuaUserService: NoctuaUserService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    public noctuaCommonMenuService: NoctuaCommonMenuService) {

    this._unsubscribeAll = new Subject();

    this.route
      .queryParams
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(params => {
        this.modelId = params['model_id'] || null;
        const baristaToken = params['barista_token'] || null;
        this.apiUrl = `${environment.searchApi}/stored?id=${this.modelId}`;
        this.noctuaUserService.getUser(baristaToken);
      });

    this.noctuaUserService.onUserChanged.pipe(
      distinctUntilChanged(this.noctuaUserService.distinctUser),
      takeUntil(this._unsubscribeAll))
      .subscribe((user: Contributor) => {

        if (user === undefined) return;

        this.noctuaFormConfigService.setupUrls();
        this.noctuaFormConfigService.setUniversalUrls();
        this.loadCam(this.modelId);
      });
  }

  ngOnInit(): void {
    this.noctuaCommonMenuService.setLeftDrawer(this.leftDrawer);
    this.noctuaCommonMenuService.setRightDrawer(this.rightDrawer);
    this._bbopGraphService.onCamGraphChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((cam: Cam) => {
        if (!cam || cam.id !== this.cam.id) {
          return;
        }
        this.cam = cam;
      });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  loadCam(modelId) {
    this.cam = this.camService.getCam(modelId);
  }

}
