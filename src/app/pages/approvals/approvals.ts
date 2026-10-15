import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { saveDownload } from '../../core/files';
import { CATEGORY_LABELS, periodLabel } from '../../core/labels';
import { ReportDetail, ReportSummary } from '../../core/models';
import { Notifier } from '../../core/notifier';
import { ReportApi } from '../../core/report-api';
import { RejectDialog, RejectDialogData } from '../../shared/reject-dialog';

/**
 * Notes de l'équipe en attente de validation. Le détail d'une note est chargé à l'ouverture
 * de son panneau.
 */
@Component({
  selector: 'app-approvals',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatExpansionModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './approvals.html',
  styleUrl: './approvals.scss',
})
export class Approvals implements OnInit {
  private readonly api = inject(ReportApi);
  private readonly auth = inject(AuthService);
  private readonly notifier = inject(Notifier);
  private readonly dialog = inject(MatDialog);

  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly periodLabel = periodLabel;

  protected readonly loading = signal(true);
  protected readonly busyId = signal<number | null>(null);
  private readonly pending = signal<ReportSummary[]>([]);
  private readonly details = signal<Record<number, ReportDetail>>({});

  protected readonly reports = computed(() =>
    this.pending().filter((report) => report.ownerId !== this.auth.user()?.id),
  );
  protected readonly pendingTotal = computed(() =>
    this.reports().reduce((sum, report) => sum + Number(report.totalAmount), 0),
  );

  ngOnInit(): void {
    this.api.list('SUBMITTED').subscribe({
      next: (reports) => {
        this.pending.set(reports);
        this.loading.set(false);
      },
      error: (error) => {
        this.notifier.error(error);
        this.loading.set(false);
      },
    });
  }

  protected detail(id: number): ReportDetail | undefined {
    return this.details()[id];
  }

  protected loadDetail(id: number): void {
    if (this.details()[id]) {
      return;
    }
    this.api.get(id).subscribe({
      next: (detail) => this.details.update((details) => ({ ...details, [id]: detail })),
      error: (error) => this.notifier.error(error),
    });
  }

  protected downloadReceipt(receiptId: number): void {
    this.api.downloadReceipt(receiptId).subscribe({
      next: (response) => saveDownload(response, `justificatif-${receiptId}`),
      error: (error) => this.notifier.error(error),
    });
  }

  protected async approve(report: ReportSummary): Promise<void> {
    await this.decide(report, () => this.api.transition(report.id, 'approve'), 'Note approuvée');
  }

  protected async reject(report: ReportSummary): Promise<void> {
    const reason = await firstValueFrom(
      this.dialog
        .open<RejectDialog, RejectDialogData, string>(RejectDialog, {
          data: { title: report.title, ownerName: report.ownerName },
          width: '520px',
        })
        .afterClosed(),
    );
    if (reason) {
      await this.decide(report, () => this.api.reject(report.id, reason), 'Note rejetée');
    }
  }

  private async decide(
    report: ReportSummary,
    call: () => ReturnType<ReportApi['reject']>,
    message: string,
  ): Promise<void> {
    this.busyId.set(report.id);
    try {
      await firstValueFrom(call());
      this.pending.update((reports) => reports.filter((candidate) => candidate.id !== report.id));
      this.notifier.success(`${message} : ${report.title} (${report.ownerName})`);
    } catch (error) {
      this.notifier.error(error);
    } finally {
      this.busyId.set(null);
    }
  }
}
