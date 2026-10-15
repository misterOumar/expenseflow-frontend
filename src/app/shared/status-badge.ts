import { Component, computed, input } from '@angular/core';
import { STATUS_LABELS } from '../core/labels';
import { ReportStatus } from '../core/models';

@Component({
  selector: 'app-status-badge',
  template: `<span [class]="'badge ' + status().toLowerCase()">{{ label() }}</span>`,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px 3px 8px;
      border-radius: 999px;
      font: var(--mat-sys-label-medium);
      font-weight: 600;
      white-space: nowrap;
    }
    .badge::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
    .draft { background: var(--ef-draft-bg); color: var(--ef-draft); }
    .submitted { background: var(--ef-submitted-bg); color: var(--ef-submitted); }
    .approved { background: var(--ef-approved-bg); color: var(--ef-approved); }
    .rejected { background: var(--ef-rejected-bg); color: var(--ef-rejected); }
    .paid { background: var(--ef-paid-bg); color: var(--ef-paid); }
  `,
})
export class StatusBadge {
  readonly status = input.required<ReportStatus>();
  protected readonly label = computed(() => STATUS_LABELS[this.status()]);
}
