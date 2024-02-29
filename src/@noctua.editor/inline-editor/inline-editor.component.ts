import { Component, OnDestroy, OnInit, ElementRef, ViewChild, Input } from '@angular/core';

import { Subject } from 'rxjs';
import { cloneDeep } from 'lodash';

import { InlineEditorService } from './inline-editor.service';

import {
    CamService,
    NoctuaActivityEntityService,
    ActivityNode,
    Activity,
    Cam,
    Entity
} from '@geneontology/noctua-form-base';
import { EditorCategory } from './../models/editor-category';

@Component({
    selector: 'noctua-inline-editor',
    templateUrl: './inline-editor.component.html',
    styleUrls: ['./inline-editor.component.scss']
})
export class NoctuaInlineEditorComponent implements OnInit, OnDestroy {
    collapsed: boolean;
    noctuaConfig: any;

    @Input() cam: Cam;
    @Input() activity: Activity;
    @Input() entity: ActivityNode;
    @Input() category: EditorCategory;
    @Input() evidenceIndex = 0;
    @Input() relationshipChoices: Entity[] = [];

    @ViewChild('editorDropdownTrigger', { read: ElementRef })
    private editorDropdownTrigger: ElementRef;
    private _unsubscribeAll: Subject<any>;

    constructor(private inlineEditorService: InlineEditorService,
        private camService: CamService,
        private noctuaActivityEntityService: NoctuaActivityEntityService) {
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {

    }

    openEditorDropdown(event) {
        const displayEntity = cloneDeep(this.entity);
        const data = {
            cam: this.cam,
            activity: this.activity,
            entity: displayEntity,
            category: this.category,
            evidenceIndex: this.evidenceIndex,
            relationshipChoices: this.relationshipChoices
        };
        this.camService.onCamChanged.next(this.cam);
        this.camService.activity = this.activity;
        this.noctuaActivityEntityService.initializeForm(this.activity, displayEntity);
        this.inlineEditorService.open(event.target, { data });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }
}
