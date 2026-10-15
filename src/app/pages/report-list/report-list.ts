import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { periodKey, periodLabel, STATUS_ICONS } from '../../core/labels';
import { ReportStatus, ReportSummary } from '../../core/models';
import { Notifier } from '../../core/notifier';
import { ReportApi } from '../../core/report-api';
import { StatusBadge } from '../../shared/status-badge';

interface StatusTile {
  status: ReportStatus;
  label: string;
  icon: string;
  count: number;
  total: number;
}

const TILE_LABELS: Record<ReportStatus, string> = {
  DRAFT: 'Brouillons',
  SUBMITTED: 'En attente',
  REJECTED: 'Rejetées',
  APPROVED: 'À rembourser',
  PAID: 'Remboursées',
};

/**
 * Employé et manager : leurs propres notes (la liste d'un manager inclut aussi son équipe, traitée
 * dans l'écran de validation). Comptable : les notes approuvées et payées de tous les employés.
 */
@Component({
  selector: 'app-report-list',
  imports: [
    CurrencyPipe,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    StatusBadge,
  ],
  templateUrl: './report-list.html',
  styleUrl: './report-list.scss',
})
export class ReportList implements OnInit {
  private readonly api = inject(ReportApi);
  private readonly notifier = inject(Notifier);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly statusFilter = signal<ReportStatus | null>(null);
  protected readonly search = signal('');
  private readonly reports = signal<ReportSummary[]>([]);

  protected readonly isAccountant = computed(() => this.auth.user()?.role === 'ACCOUNTANT');

  /** Notes visibles par l'utilisateur, de la plus récente à la plus ancienne. */
  private readonly visible = computed(() => {
    const user = this.auth.user();
    const reports = this.isAccountant()
      ? this.reports()
      : this.reports().filter((report) => report.ownerId === user?.id);
    return [...reports].sort(
      (a, b) =>
        periodKey(b.periodMonth, b.periodYear) - periodKey(a.periodMonth, a.periodYear) ||
        b.id - a.id,
    );
  });

  protected readonly tiles = computed<StatusTile[]>(() => {
    const statuses: ReportStatus[] = this.isAccountant()
      ? ['APPROVED', 'PAID']
      : ['DRAFT', 'SUBMITTED', 'REJECTED', 'APPROVED', 'PAID'];
    return statuses
      .map((status) => {
        const reports = this.visible().filter((report) => report.status === status);
        return {
          status,
          label: TILE_LABELS[status],
          icon: STATUS_ICONS[status],
          count: reports.length,
          total: reports.reduce((sum, report) => sum + Number(report.totalAmount), 0),
        };
      })
      // Les notes rejetées sont l'exception : la tuile n'apparaît que s'il y en a.
      .filter((tile) => tile.status !== 'REJECTED' || tile.count > 0 || this.statusFilter() === 'REJECTED');
  });

  protected readonly rows = computed(() => {
    const status = this.statusFilter();
    const term = normalize(this.search());
    return this.visible().filter(
      (report) =>
        (!status || report.status === status) &&
        (!term || normalize(`${report.title} ${report.ownerName}`).includes(term)),
    );
  });

  protected readonly filtered = computed(() => this.statusFilter() !== null || this.search() !== '');

  protected readonly columns = computed(() =>
    this.isAccountant()
      ? ['period', 'owner', 'title', 'status', 'total', 'open']
      : ['period', 'title', 'status', 'total', 'open'],
  );
  protected readonly periodLabel = periodLabel;

  ngOnInit(): void {
    this.api.list().subscribe({
      next: (reports) => {
        this.reports.set(reports);
        this.loading.set(false);
      },
      error: (error) => {
        this.notifier.error(error);
        this.loading.set(false);
      },
    });
  }

  protected toggleStatus(status: ReportStatus): void {
    this.statusFilter.update((current) => (current === status ? null : status));
  }

  protected clearFilters(): void {
    this.statusFilter.set(null);
    this.search.set('');
  }

  protected open(report: ReportSummary): void {
    this.router.navigate(['/reports', report.id]);
  }
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
