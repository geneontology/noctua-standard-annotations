import { Injectable, NgZone } from '@angular/core';

import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { AddGenesDialogComponent } from '../dialogs/add-genes/add-genes.component';


@Injectable({
    providedIn: 'root'
})
export class NoctuaAnnotationsDialogService {

    dialogRef: any;

    constructor(
        private zone: NgZone,
        private snackBar: MatSnackBar,
        private _matDialog: MatDialog) {
    }

    openInfoToast(message: string, action: string) {
        this.zone.run(() => {
            this.snackBar.open(message, action, {
                duration: 10000,
                verticalPosition: 'top'
            });
        });

    }


    openUploadGenesDialog(data, success: Function): void {
        this.dialogRef = this._matDialog.open(AddGenesDialogComponent, {
            panelClass: 'noc-add-genes-dialog',
            data,
            width: '600px',
        });
        this.dialogRef.afterClosed()
            .subscribe(response => {
                if (response) {
                    success(response);
                }
            });
    }
}
