import { Injectable } from '@angular/core';

import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';

import { NoctuaConfirmDialogComponent } from './../../components/confirm-dialog/confirm-dialog.component';


@Injectable({
    providedIn: 'root'
})
export class NoctuaConfirmDialogService {

    dialogRef: any;

    constructor(
        private snackBar: MatSnackBar,
        private _matDialog: MatDialog) {
    }

    openInfoToast(message: string, action: string) {
        this.snackBar.open(message, action, {
            duration: 5000,
            verticalPosition: 'top'
        });
    }

    openConfirmDialog(title: string, message: string, success, options?): void {
        let confirmDialogRef: MatDialogRef<NoctuaConfirmDialogComponent> = this._matDialog.open(NoctuaConfirmDialogComponent, {
            panelClass: 'noc-confirm-dialog',
            disableClose: false,
            width: '600px',
            data: options
        });

        confirmDialogRef.componentInstance.title = title;
        confirmDialogRef.componentInstance.message = message;
        if (!success) {
            confirmDialogRef.componentInstance.readonlyDialog = true;
        }

        confirmDialogRef.afterClosed().subscribe(response => {
            if (response) {
                success(response);
            }
            confirmDialogRef = null;
        });
    }
}
