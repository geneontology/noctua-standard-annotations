import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

import {
    Cam,
    CamService,
    NoctuaUserService,
    NoctuaFormConfigService,
    ActivityType,
} from '@geneontology/noctua-form-base';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from 'environments/environment';
import { ArtBasket } from '@noctua.search/models/art-basket';

@Component({
    selector: 'noctua-toolbar',
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.scss']
})

export class NoctuaToolbarComponent implements OnInit, OnDestroy {
    ActivityType = ActivityType;
    artBasket: ArtBasket
    public cam: Cam;
    userStatusOptions: any[];
    showLoadingBar: boolean;
    horizontalNav: boolean;
    noNav: boolean;
    navigation: any;
    noctuaFormUrl = '';
    loginUrl = '';
    logoutUrl = '';
    noctuaUrl = '';

    isBeta = environment.isBeta
    isDev = environment.isDev

    betaText = '';


    private _unsubscribeAll: Subject<any>;

    constructor(
        private router: Router,
        private camService: CamService,
        public noctuaUserService: NoctuaUserService,
        public noctuaConfigService: NoctuaFormConfigService,
    ) {
        this._unsubscribeAll = new Subject();

        this.router.events.pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                (event) => {
                    if (event instanceof NavigationStart) {
                        this.showLoadingBar = true;
                    }
                    if (event instanceof NavigationEnd) {
                        this.showLoadingBar = false;
                    }
                });
    }

    ngOnInit(): void {
        //this.noctuaAnnouncementService.getAnnouncement();
        this.camService.onCamChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((cam) => {
                if (!cam) {
                    return;
                }

                this.cam = cam;
            });

        this.camService.onCamChanged
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((cam) => {
                if (!cam) {
                    return;
                }

                this.cam = cam;
            });

        if (this.isDev && this.isBeta) {
            this.betaText = 'beta dev test'
        } else if (this.isDev) {
            this.betaText = 'dev test only'
        } else if (this.isBeta) {
            this.betaText = 'beta'
        }
    }

    logout() {
        const self = this;

        const success = (logout) => {
            if (logout) {
                window.location.href = self.noctuaConfigService.logoutUrl;
            }
        };

        window.location.href = self.noctuaConfigService.logoutUrl;

    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

}
