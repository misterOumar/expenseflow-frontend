import { Component, computed, input } from '@angular/core';
import { STATUS_LABELS } from '../core/labels';
import { ReportStatus } from '../core/models';

@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [class]="'badge ' + status().toLowerCase()">{{ label() }}</span>`,
  styles: `
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font: var(--mat-sys-label-medium);
      white-space: nowrap;
    }
    .draft { background: #eceff1; color: #455a64; }
    .submitted { background: #e3f2fd; color: #1565c0; }
    .approved { background: #e8f5e9; color: #2e7d32; }
    .rejected { background: #ffebee; color: #c62828; }
    .paid { background: #ede7f6; color: #5e35b1; }
  `,
})
export class StatusBadge {
  readonly status = input.required<ReportStatus>();
  protected readonly label = computed(() => STATUS_LABELS[this.status()]);
}
