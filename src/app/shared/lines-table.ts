import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../core/labels';
import { ReportLine } from '../core/models';

/**
 * Lignes d'une note en lecture seule, avec téléchargement des justificatifs.
 */
@Component({
  selector: 'app-lines-table',
  imports: [CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Catégorie</th>
            <th>Description</th>
            <th class="amount">HT</th>
            <th class="amount">TVA</th>
            <th class="amount">TTC</th>
            <th class="receipt"><span class="sr-only">Justificatif</span></th>
          </tr>
        </thead>
        <tbody>
          @for (line of lines(); track line.id) {
            <tr>
              <td class="date">{{ line.spentOn | date: 'dd/MM/yyyy' }}</td>
              <td>
                <span class="category">
                  <mat-icon>{{ categoryIcons[line.category] }}</mat-icon>
                  {{ categoryLabels[line.category] }}
                </span>
              </td>
              <td class="description">{{ line.description }}</td>
              <td class="amount muted">{{ line.amountHt | currency }}</td>
              <td class="amount muted">{{ line.vatAmount | currency }}</td>
              <td class="amount">{{ line.amountTtc | currency }}</td>
              <td class="receipt">
                @if (line.receiptId; as receiptId) {
                  <button
                    mat-icon-button
                    matTooltip="Télécharger le justificatif"
                    aria-label="Télécharger le justificatif"
                    (click)="download.emit(receiptId)"
                  >
                    <mat-icon>attach_file</mat-icon>
                  </button>
                } @else {
                  <span class="muted" matTooltip="Aucun justificatif">—</span>
                }
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7" class="empty">Aucune dépense.</td>
            </tr>
          }
        </tbody>
        @if (total() !== undefined) {
          <tfoot>
            <tr>
              <td colspan="5">Total TTC</td>
              <td class="amount">{{ total() | currency }}</td>
              <td></td>
            </tr>
          </tfoot>
        }
      </table>
    </div>
  `,
  styles: `
    :host { display: block; font: var(--mat-sys-body-medium); }
    .scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      padding: 10px 8px;
      text-align: left;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    th {
      font: var(--mat-sys-label-medium);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--mat-sys-on-surface-variant);
    }
    th.amount, td.amount { text-align: right; }
    .date { white-space: nowrap; font-variant-numeric: tabular-nums; }
    .description { min-width: 180px; }
    .receipt { width: 48px; text-align: center; padding: 0; }
    tbody tr:hover { background: var(--mat-sys-surface-container-low); }
    tfoot td {
      border-bottom: none;
      padding-top: 14px;
      font: var(--mat-sys-title-medium);
      font-weight: 600;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
  `,
})
export class LinesTable {
  readonly lines = input.required<ReportLine[]>();
  readonly total = input<number>();
  readonly download = output<number>();

  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly categoryIcons = CATEGORY_ICONS;
}
