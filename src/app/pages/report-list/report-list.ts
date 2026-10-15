import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { periodLabel } from '../../core/labels';
import { ReportSummary } from '../../core/models';
import { Notifier } from '../../core/notifier';
import { ReportApi } from '../../core/report-api';
import { StatusBadge } from '../../shared/status-badge';

/**
 * Employé et manager : leurs propres notes (la liste d'un manager inclut aussi son équipe, traitée
 * dans l'écran de validation). Comptable : les notes approuvées et payées de tous les employés.
 */
@Component({
  selector: 'app-report-list',
  imports: [CurrencyPipe, RouterLink, MatTableModule, MatButtonModule, MatIconModule, MatProgressBarModule, StatusBadge],
  templateUrl: './report-list.html',
  styleUrl: './report-list.scss',
})
export class ReportList implements OnInit {
  private readonly api = inject(ReportApi);
  private readonly notifier = inject(Notifier);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  private readonly reports = signal<ReportSummary[]>([]);

  protected readonly isAccountant = computed(() => this.auth.user()?.role === 'ACCOUNTANT');
  protected readonly rows = computed(() => {
    const user = this.auth.user();
    return this.isAccountant() ? this.reports() : this.reports().filter((report) => report.ownerId === user?.id);
  });
  protected readonly columns = computed(() =>
    this.isAccountant()
      ? ['period', 'owner', 'title', 'status', 'total']
      : ['period', 'title', 'status', 'total'],
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

  protected open(report: ReportSummary): void {
    this.router.navigate(['/reports', report.id]);
  }
}
