import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { STATUS_LABELS } from '../core/labels';
import { StatusHistoryEntry } from '../core/models';

/** Changements de statut d'une note, présentés en frise chronologique. */
@Component({
  selector: 'app-status-history',
  imports: [DatePipe],
  template: `
    <ol>
      @for (entry of entries(); track $index) {
        <li [class]="entry.toStatus.toLowerCase()">
          <span class="dot"></span>
          <div>
            <div>
              <strong>{{ statusLabels[entry.toStatus] }}</strong>
              <span class="muted"> par {{ entry.actorName }}</span>
            </div>
            <div class="muted when">{{ entry.at | date: "dd/MM/yyyy 'à' HH:mm" }}</div>
            @if (entry.comment) {
              <q>{{ entry.comment }}</q>
            }
          </div>
        </li>
      }
    </ol>
  `,
  styles: `
    ol { list-style: none; margin: 0; padding: 0; }
    li { position: relative; display: flex; gap: 12px; padding-bottom: 16px; }
    li:not(:last-child)::before {
      content: '';
      position: absolute;
      left: 5px;
      top: 16px;
      bottom: 0;
      width: 2px;
      background: var(--mat-sys-outline-variant);
    }
    .dot { flex: none; width: 12px; height: 12px; margin-top: 4px; border-radius: 50%; }
    .draft .dot { background: var(--ef-draft); }
    .submitted .dot { background: var(--ef-submitted); }
    .approved .dot { background: var(--ef-approved); }
    .rejected .dot { background: var(--ef-rejected); }
    .paid .dot { background: var(--ef-paid); }
    .when { font: var(--mat-sys-body-small); }
    q { display: block; margin-top: 6px; font-style: italic; }
  `,
})
export class StatusHistory {
  readonly entries = input.required<StatusHistoryEntry[]>();
  protected readonly statusLabels = STATUS_LABELS;
}
