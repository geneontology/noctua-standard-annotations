import { NgModule } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { NoctuaSharedModule } from '@noctua/shared.module';
import { NoctuaAppsComponent } from './noctua-apps.component';


@NgModule({
    declarations: [
        NoctuaAppsComponent
    ],
    imports: [
        MatDividerModule,
        MatListModule,
        MatSlideToggleModule,

        NoctuaSharedModule,
    ],
    exports: [
        NoctuaAppsComponent
    ]
})
export class NoctuaAppsModule {
}
