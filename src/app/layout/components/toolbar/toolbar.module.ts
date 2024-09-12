import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NoctuaSharedModule } from '@noctua/shared.module';
import { NoctuaToolbarComponent } from './toolbar.component';

@NgModule({
    declarations: [
        NoctuaToolbarComponent
    ],
    imports: [
        RouterModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatProgressBarModule,
        MatToolbarModule,
        NoctuaSharedModule,
    ],
    providers: [
    ],
    exports: [
        NoctuaToolbarComponent
    ]
})

export class NoctuaToolbarModule {
}
