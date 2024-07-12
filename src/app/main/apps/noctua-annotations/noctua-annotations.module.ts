import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TreeModule } from '@ali-hm/angular-tree-component';
import { NoctuaSharedModule } from './../../../../@noctua/shared.module';
import { NoctuaAnnotationsDialogService } from './services/dialog.service';
import { NoctuaConfirmDialogModule } from '@noctua/components';
import { NoctuaEditorModule } from '@noctua.editor/noctua-editor.module';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatRippleModule } from '@angular/material/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatIconModule } from '@angular/material/icon';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { NoctuaAnnotationsComponent } from './noctua-annotations.component';
import { NoctuaSearchBaseModule } from '@noctua.search';
import { NoctuaFormModule } from '../noctua-form/noctua-form.module';
import { AnnotationFormComponent } from './forms/annotation-form/annotation-form.component';
import { AnnotationsTableComponent } from './table/annotations-table.component';
import { AnnotationNodeComponent } from './table/annotation-node/annotation-node.component';
import { TermAutocompleteComponent } from './forms/term-autocomplete/term-autocomplete.component';

const routes = [
  {
    path: '',
    component: NoctuaAnnotationsComponent
  }
];

@NgModule({
  imports: [
    NoctuaSharedModule,
    TreeModule,
    CommonModule,
    // NoctuaModule.forRoot(noctuaConfig),
    RouterModule.forChild(routes),
    NoctuaConfirmDialogModule,
    NoctuaEditorModule,
    NoctuaSearchBaseModule,
    NgxChartsModule,

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
    NoctuaFormModule,
  ],
  exports: [
    NoctuaAnnotationsComponent
  ],
  providers: [
    NoctuaAnnotationsDialogService,
  ],
  declarations: [
    NoctuaAnnotationsComponent,
    AnnotationFormComponent,
    AnnotationsTableComponent,
    AnnotationNodeComponent,
    TermAutocompleteComponent
  ],
})

export class NoctuaAnnotationsModule {
}
