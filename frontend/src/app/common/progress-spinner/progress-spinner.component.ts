import { Component, ViewEncapsulation } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-progress-spinner',
  imports: [MatProgressSpinnerModule],
  template: `<mat-spinner />`,
  styles: `
    .transparent{
      mat-dialog-container .mdc-dialog__container .mat-mdc-dialog-surface,
      mat-dialog-container .mdc-dialog__container .mdc-dialog__surface {
        box-shadow: none;
        background: rgba(0, 0, 0, 0);
      }
    }
  `,
  encapsulation: ViewEncapsulation.None
})
export class ProgressSpinnerComponent {}
