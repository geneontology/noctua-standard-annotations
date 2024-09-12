import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoctuaPathwayComponent } from './noctua-pathway.component';
import { RouterModule } from '@angular/router';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatRippleModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { NoctuaSharedModule } from '@noctua/shared.module';


const routes = [
  {
    path: 'p',
    component: NoctuaPathwayComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    NoctuaSharedModule,
    RouterModule.forChild(routes),

    //Material
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatRippleModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ],
  declarations: [NoctuaPathwayComponent],
})
export class NoctuaPathwayModule { }



