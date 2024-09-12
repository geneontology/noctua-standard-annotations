import { NgModule } from '@angular/core';
import { MaterialModule } from './material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { FlexLayoutModule } from '@angular/flex-layout';

import { NoctuaPipesModule } from './pipes/pipes.module';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgxGraphModule } from '@swimlane/ngx-graph';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgScrollbarModule } from 'ngx-scrollbar';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule,
        ReactiveFormsModule,
        FlexLayoutModule,
        NoctuaPipesModule,
        DragDropModule,
        NgScrollbarModule,
        NgxGraphModule,
        FontAwesomeModule
    ],
    exports: [
        CommonModule,
        MaterialModule,
        FormsModule,
        ReactiveFormsModule,
        FlexLayoutModule,
        NoctuaPipesModule,
        DragDropModule,
        NgScrollbarModule,
        NgxGraphModule,
        FontAwesomeModule
    ]
})

export class NoctuaSharedModule { }
