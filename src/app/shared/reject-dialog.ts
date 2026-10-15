import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface RejectDialogData {
  title: string;
  ownerName: string;
}

/**
 * Saisie du motif de rejet. Retourne le motif, ou `undefined` si la boîte est fermée.
 */
@Component({
  selector: 'app-reject-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Rejeter la note</h2>
    <mat-dialog-content>
      <p>« {{ data.title }} » de {{ data.ownerName }}</p>
      <div class="field">
        <label for="reject-reason">Motif du rejet</label>
        <mat-form-field subscriptSizing="fixed">
          <textarea
            matInput
            id="reject-reason"
            [formControl]="reason"
            rows="4"
            maxlength="1000"
            placeholder="Ex. Le justificatif de la ligne 2 est illisible."
            cdkFocusInitial
          ></textarea>
          <mat-hint align="end">{{ reason.value.length }} / 1000</mat-hint>
          @if (reason.hasError('minlength') || reason.hasError('required')) {
            <mat-error>Le motif doit faire au moins 10 caractères</mat-error>
          }
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button class="danger" (click)="confirm()">Rejeter</button>
    </mat-dialog-actions>
  `,
  styles: `
    p { margin-top: 0; }
    .danger {
      --mat-button-filled-container-color: var(--mat-sys-error);
      --mat-button-filled-label-text-color: var(--mat-sys-on-error);
    }
  `,
})
export class RejectDialog {
  protected readonly data = inject<RejectDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<RejectDialog, string>);

  protected readonly reason = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(10), Validators.maxLength(1000)],
  });

  protected confirm(): void {
    const reason = this.reason.value.trim();
    this.reason.setValue(reason);
    if (this.reason.invalid) {
      this.reason.markAsTouched();
      return;
    }
    this.dialogRef.close(reason);
  }
}
