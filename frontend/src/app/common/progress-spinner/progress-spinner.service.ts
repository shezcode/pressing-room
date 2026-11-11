import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ProgressSpinnerComponent } from './progress-spinner.component';

@Injectable({
  providedIn: 'root'
})
export class ProgressSpinnerService {
  private dialog: MatDialog = inject(MatDialog);
  private instances: {
    [key: string]: MatDialogRef<ProgressSpinnerComponent>;
  } = {};

  /**
   * Open a progress spinner dialog
   *
   * @returns dialog identifier, to use with `close(dialogRefId)`
   */
  public show(): string {
    const dialogRef = this.dialog.open(ProgressSpinnerComponent, {
      panelClass: 'transparent',
      disableClose: true
    });

    this.instances[dialogRef.id] = dialogRef;

    return dialogRef.id;
  }

  /**
   * Close given progress spinner dialog
   *
   * @param dialogRefId dialog identifier, obtained when calling `show()`
   */
  public hide(dialogRefId: string) {
    const ref = this.instances[dialogRefId];
    if (ref) {
      ref.close();
      delete this.instances[dialogRefId];
    }
  }
}
