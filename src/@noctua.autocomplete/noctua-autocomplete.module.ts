import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TermAutocompleteComponent } from './term-autocomplete/term-autocomplete.component';
import { MatButtonModule } from '@angular/material/button';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatIconModule } from '@angular/material/icon';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';




@NgModule({
  declarations: [
    TermAutocompleteComponent
  ],
  imports: [
    CommonModule,
    FlexLayoutModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatIconModule,
    FontAwesomeModule
  ],
  exports: [
    TermAutocompleteComponent
  ]

})
export class NoctuaAutocompleteModule { }
