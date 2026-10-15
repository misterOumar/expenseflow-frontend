import { Component, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Justificatif d'une ligne : zone de dépôt (clic ou glisser-déposer) tant qu'aucun fichier n'est
 * joint, puis nom du fichier téléchargeable et bouton de remplacement.
 */
@Component({
  selector: 'app-receipt-field',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  host: {
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'dragover.set(false)',
    '(drop)': 'onDrop($event)',
  },
  template: `
    <input
      #fileInput
      type="file"
      hidden
      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
      (change)="onPick(fileInput)"
    />
    @if (receiptId(); as id) {
      <div class="box file" [class.dragover]="dragover()">
        <mat-icon class="ok">task</mat-icon>
        <button
          type="button"
          class="name"
          [matTooltip]="'Télécharger ' + fileName()"
          (click)="download.emit(id)"
        >
          {{ fileName() }}
        </button>
        <button
          mat-icon-button
          type="button"
          matTooltip="Remplacer le justificatif"
          aria-label="Remplacer le justificatif"
          [disabled]="uploading()"
          (click)="fileInput.click()"
        >
          <mat-icon>sync</mat-icon>
        </button>
      </div>
    } @else {
      <button
        type="button"
        class="box dropzone"
        [class.missing]="missing()"
        [class.dragover]="dragover()"
        [disabled]="uploading()"
        (click)="fileInput.click()"
      >
        <mat-icon>{{ uploading() ? 'hourglass_top' : 'upload_file' }}</mat-icon>
        @if (uploading()) {
          Envoi en cours…
        } @else {
          <span><strong>Choisir un fichier</strong> ou le déposer ici</span>
        }
      </button>
      @if (missing()) {
        <span class="error">Justificatif obligatoire pour soumettre</span>
      }
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 4px; }
    .box {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 44px;
      box-sizing: border-box;
      border-radius: 10px;
      font: var(--mat-sys-body-medium);
    }
    .dropzone {
      justify-content: center;
      padding: 0 12px;
      border: 1.5px dashed var(--mat-sys-outline);
      background: none;
      color: var(--mat-sys-primary);
      cursor: pointer;
    }
    .dropzone:hover, .dropzone:focus-visible, .dropzone.dragover {
      background: var(--mat-sys-primary-container);
      border-color: var(--mat-sys-primary);
      outline: none;
    }
    .dropzone.missing { border-color: var(--mat-sys-error); color: var(--mat-sys-error); }
    .file {
      padding: 0 2px 0 12px;
      border: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface);
    }
    .file.dragover { border-color: var(--mat-sys-primary); }
    .ok { color: var(--ef-approved); }
    .name {
      flex: 1;
      min-width: 0;
      padding: 0;
      border: 0;
      background: none;
      font: inherit;
      color: inherit;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
    }
    .name:hover { text-decoration: underline; }
    .error { padding: 0 2px; font: var(--mat-sys-body-small); color: var(--mat-sys-error); }
  `,
})
export class ReceiptField {
  readonly receiptId = input<number | null>(null);
  readonly fileName = input<string | null>(null);
  readonly uploading = input(false);
  /** Signale l'absence de justificatif, après une tentative de soumission. */
  readonly missing = input(false);

  readonly fileSelected = output<File>();
  readonly download = output<number>();

  protected readonly dragover = signal(false);

  protected onPick(fileInput: HTMLInputElement): void {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (file) {
      this.fileSelected.emit(file);
    }
  }

  protected onDragOver(event: DragEvent): void {
    if (!this.uploading()) {
      event.preventDefault();
      this.dragover.set(true);
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragover.set(false);
    const file = event.dataTransfer?.files[0];
    if (file && !this.uploading()) {
      this.fileSelected.emit(file);
    }
  }
}
