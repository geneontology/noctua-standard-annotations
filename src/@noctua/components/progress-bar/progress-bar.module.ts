import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';

import { NoctuaProgressBarComponent } from './progress-bar.component';

@NgModule({
    declarations: [
        NoctuaProgressBarComponent
    ],
    imports: [
        CommonModule,
        RouterModule,

        MatButtonModule,
        MatIconModule,
        MatProgressBarModule
    ],
    exports: [
        NoctuaProgressBarComponent
    ]
})
export class NoctuaProgressBarModule {
}
