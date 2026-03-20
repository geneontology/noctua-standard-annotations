import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TreeModule } from '@ali-hm/angular-tree-component';
import { NoctuaSharedModule } from './../../../../@noctua/shared.module';
import { NoctuaFormDialogService } from './services/dialog.service';
import { CamFormComponent } from './cam/cam-form/cam-form.component';
import { AddEvidenceDialogComponent } from './dialogs/add-evidence/add-evidence.component';
import { ActivityErrorsDialogComponent } from './dialogs/activity-errors/activity-errors.component';
import { BeforeSaveDialogComponent } from './dialogs/before-save/before-save.component';
import { CreateFromExistingDialogComponent } from './dialogs/create-from-existing/create-from-existing.component';
import { SelectEvidenceDialogComponent } from './dialogs/select-evidence/select-evidence.component';
import { SearchDatabaseDialogComponent } from './dialogs/search-database/search-database.component';
import { NoctuaConfirmDialogModule } from '@noctua/components';
import { NoctuaEditorModule } from '@noctua.editor/noctua-editor.module';
import { PreviewActivityDialogComponent } from './dialogs/preview-activity/preview-activity.component';
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
import { SearchEvidenceDialogComponent } from './dialogs/search-evidence/search-evidence.component';
import { SelectEvidenceComponent } from './components/select-evidence/select-evidence.component';
import { MatTreeModule } from '@angular/material/tree';
import { CamErrorsDialogComponent } from './dialogs/cam-errors/cam-errors.component';
import { NoctuaSearchBaseModule } from '@noctua.search';
import { CopyModelComponent } from './cam/copy-model/copy-model.component';
import { ResizableModule } from 'angular-resizable-element';
import { NoctuaTermDetailComponent } from './components/term-detail/term-detail.component';
import { ConfirmCopyModelDialogComponent } from './dialogs/confirm-copy-model/confirm-copy-model.component';
import { CamToolbarComponent } from './cam/cam-toolbar/cam-toolbar.component';
import { CommentsDialogComponent } from './dialogs/comments/comments.component';

const routes = [];

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
    MatTreeModule,
    ResizableModule,
  ],
  exports: [
    AddEvidenceDialogComponent,
    ActivityErrorsDialogComponent,
    CamErrorsDialogComponent,
    BeforeSaveDialogComponent,
    CreateFromExistingDialogComponent,
    SelectEvidenceDialogComponent,
    SearchDatabaseDialogComponent,
    SearchEvidenceDialogComponent,
    PreviewActivityDialogComponent,
    CamFormComponent,
    CopyModelComponent,
    ConfirmCopyModelDialogComponent,
    CommentsDialogComponent,
    CamToolbarComponent,
  ],
  providers: [
    NoctuaFormDialogService,
  ],
  declarations: [
    AddEvidenceDialogComponent,
    ActivityErrorsDialogComponent,
    CamErrorsDialogComponent,
    BeforeSaveDialogComponent,
    PreviewActivityDialogComponent,
    CreateFromExistingDialogComponent,
    SelectEvidenceDialogComponent,
    SearchDatabaseDialogComponent,
    SearchEvidenceDialogComponent,
    CamFormComponent,
    CopyModelComponent,
    SelectEvidenceComponent,
    NoctuaTermDetailComponent,
    ConfirmCopyModelDialogComponent,
    CommentsDialogComponent,
    CamToolbarComponent
  ],
})

export class NoctuaFormModule {
}
