import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ReportStatus } from '../core/models';

interface Step {
  label: string;
  icon: string;
  state: 'done' | 'current' | 'todo' | 'error';
}

const FLOW: ReportStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID'];

/**
 * Frise du circuit d'une note : brouillon, soumission, décision du manager, paiement.
 * Une note rejetée apparaît en erreur sur l'étape de décision.
 */
@Component({
  selector: 'app-status-steps',
  imports: [MatIconModule],
  template: `
    <ol class="steps" aria-label="Avancement de la note">
      @for (step of steps(); track step.label) {
        <li [class]="step.state" [attr.aria-current]="step.state === 'current' ? 'step' : null">
          <span class="dot">
            <mat-icon>{{ step.state === 'done' ? 'check' : step.icon }}</mat-icon>
          </span>
          <span class="label">{{ step.label }}</span>
        </li>
      }
    </ol>
  `,
  styles: `
    .steps {
      display: flex;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    li {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      position: relative;
      font: var(--mat-sys-label-medium);
      color: var(--mat-sys-on-surface-variant);
      text-align: center;
    }
    li + li::before {
      content: '';
      position: absolute;
      top: 15px;
      right: 50%;
      width: 100%;
      height: 2px;
      background: var(--mat-sys-outline-variant);
      z-index: 0;
    }
    li.done::before, li.current::before, li.error::before {
      background: var(--mat-sys-primary);
    }
    .dot {
      position: relative;
      z-index: 1;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--mat-sys-surface);
      border: 2px solid var(--mat-sys-outline-variant);
    }
    mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .done .dot {
      background: var(--mat-sys-primary);
      border-color: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
    }
    .current {
      color: var(--mat-sys-primary);
      font-weight: 600;
    }
    .current .dot {
      border-color: var(--mat-sys-primary);
      background: var(--mat-sys-primary-container);
    }
    .error {
      color: var(--ef-rejected);
      font-weight: 600;
    }
    .error .dot {
      border-color: var(--ef-rejected);
      background: var(--ef-rejected-bg);
    }
  `,
})
export class StatusSteps {
  readonly status = input.required<ReportStatus>();

  protected readonly steps = computed<Step[]>(() => {
    const status = this.status();
    const reached = status === 'REJECTED' ? 2 : FLOW.indexOf(status);
    const state = (index: number): Step['state'] => {
      if (status === 'REJECTED' && index === 2) {
        return 'error';
      }
      if (index < reached || status === 'PAID') {
        return 'done';
      }
      return index === reached ? 'current' : 'todo';
    };
    return [
      { label: 'Brouillon', icon: 'edit_note', state: state(0) },
      { label: 'Soumise', icon: 'send', state: state(1) },
      {
        label: status === 'REJECTED' ? 'Rejetée' : 'Approuvée',
        icon: status === 'REJECTED' ? 'close' : 'check_circle',
        state: state(2),
      },
      { label: 'Payée', icon: 'payments', state: state(3) },
    ];
  });
}
