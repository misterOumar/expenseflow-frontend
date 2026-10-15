import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, ElementRef, inject, input, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { fromIsoDate, startOfToday, toIsoDate } from '../../core/dates';
import { saveDownload } from '../../core/files';
import { LeaveGuarded } from '../../core/guards';
import {
  CATEGORIES,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  periodFromKey,
  periodKey,
  periodLabel,
} from '../../core/labels';
import {
  ExpenseCategory,
  LineRequest,
  ReportDetail,
  ReportLine,
  StatusHistoryEntry,
  TransitionAction,
} from '../../core/models';
import { Notifier } from '../../core/notifier';
import { ReportApi } from '../../core/report-api';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog';
import { DecimalInput } from '../../shared/decimal-input';
import { LinesTable } from '../../shared/lines-table';
import { ReceiptField } from '../../shared/receipt-field';
import { RejectDialog, RejectDialogData } from '../../shared/reject-dialog';
import { StatusBadge } from '../../shared/status-badge';
import { StatusHistory } from '../../shared/status-history';
import { StatusSteps } from '../../shared/status-steps';

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;
const RECEIPT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/** Taux de TVA français, proposés pour calculer la TVA à partir du montant HT. */
const VAT_RATES = [20, 10, 5.5, 2.1, 0];

type LineForm = FormGroup<{
  id: FormControl<number | null>;
  spentOn: FormControl<Date | null>;
  category: FormControl<ExpenseCategory>;
  description: FormControl<string>;
  amountHt: FormControl<number | null>;
  vatAmount: FormControl<number | null>;
  receiptId: FormControl<number | null>;
  receiptName: FormControl<string | null>;
}>;

/**
 * Création et modification d'une note en brouillon, consultation dans les autres statuts.
 * <p>
 * L'API expose la note et ses lignes séparément : l'enregistrement compare le formulaire à la
 * dernière version chargée et n'envoie que les lignes ajoutées, modifiées ou supprimées.
 */
@Component({
  selector: 'app-report-edit',
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTooltipModule,
    DecimalInput,
    LinesTable,
    ReceiptField,
    StatusBadge,
    StatusHistory,
    StatusSteps,
  ],
  templateUrl: './report-edit.html',
  styleUrl: './report-edit.scss',
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class ReportEdit implements OnInit, LeaveGuarded {
  readonly id = input<string>();

  private readonly api = inject(ReportApi);
  private readonly auth = inject(AuthService);
  private readonly notifier = inject(Notifier);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly categories = CATEGORIES;
  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly categoryIcons = CATEGORY_ICONS;
  protected readonly periodLabel = periodLabel;
  protected readonly vatRates = VAT_RATES;
  protected readonly today = startOfToday();

  protected readonly report = signal<ReportDetail | null>(null);
  protected readonly history = signal<StatusHistoryEntry[]>([]);
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly uploadingLine = signal<number | null>(null);
  /** Passe à vrai après une tentative de soumission refusée, pour signaler les justificatifs manquants. */
  protected readonly submitAttempted = signal(false);
  /** Vrai quand la sortie de l'écran est voulue (suppression, redirection après création). */
  private leaving = false;

  protected readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    periodMonth: [new Date().getMonth() + 1, Validators.required],
    periodYear: [
      new Date().getFullYear(),
      [Validators.required, Validators.min(2000), Validators.max(2100)],
    ],
    lines: this.fb.array<LineForm>([]),
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly isNew = computed(() => !this.id());
  protected readonly isOwner = computed(
    () => this.isNew() || this.report()?.ownerId === this.auth.user()?.id,
  );
  protected readonly editable = computed(
    () => this.isOwner() && (this.isNew() || this.report()?.status === 'DRAFT'),
  );
  protected readonly canReopen = computed(() => this.isOwner() && this.report()?.status === 'REJECTED');
  protected readonly canDecide = computed(
    () => !this.isOwner() && this.auth.hasRole('MANAGER') && this.report()?.status === 'SUBMITTED',
  );
  protected readonly canPay = computed(
    () => this.auth.hasRole('ACCOUNTANT') && this.report()?.status === 'APPROVED',
  );
  protected readonly canExport = computed(() => {
    const status = this.report()?.status;
    return status === 'APPROVED' || status === 'PAID';
  });
  protected readonly formTotal = computed(() =>
    (this.formValue().lines ?? []).reduce(
      (sum, line) => sum + ttc(line.amountHt ?? null, line.vatAmount ?? null),
      0,
    ),
  );
  protected readonly missingReceipts = computed(
    () => (this.formValue().lines ?? []).filter((line) => !line.receiptId).length,
  );
  private readonly formEvents = toSignal(this.form.events);
  protected readonly dirty = computed(() => {
    this.formEvents();
    return this.form.dirty;
  });
  /** Champs invalides que l'utilisateur a déjà quittés, ou tous après une tentative d'envoi. */
  protected readonly invalidFields = computed(() => {
    this.formEvents();
    const controls = [
      this.form.controls.title,
      ...this.lines.controls.flatMap((line) => Object.values(line.controls)),
    ];
    return controls.filter((control) => control.invalid && control.touched).length;
  });

  protected readonly selectedPeriod = computed(() => {
    const { periodMonth, periodYear } = this.formValue();
    return periodKey(periodMonth ?? 1, periodYear ?? 2000);
  });
  /** Le mois suivant et les douze derniers mois, plus la période de la note si elle est plus ancienne. */
  protected readonly periodOptions = computed(() => {
    const current = periodKey(this.today.getMonth() + 1, this.today.getFullYear());
    const keys = new Set([this.selectedPeriod()]);
    for (let key = current + 1; key >= current - 12; key--) {
      keys.add(key);
    }
    return [...keys]
      .sort((a, b) => b - a)
      .map((key) => {
        const { month, year } = periodFromKey(key);
        return { key, label: periodLabel(month, year) };
      });
  });

  get lines(): FormArray<LineForm> {
    return this.form.controls.lines;
  }

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.load(Number(id));
    } else {
      this.addLine();
    }
  }

  async canLeave(): Promise<boolean> {
    if (this.leaving || !this.editable() || !this.form.dirty) {
      return true;
    }
    const confirmed = await firstValueFrom(
      this.dialog
        .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
          data: {
            title: 'Quitter sans enregistrer ?',
            message: 'Vos modifications sur cette note seront perdues.',
            confirmLabel: 'Quitter',
            cancelLabel: 'Rester sur la note',
            danger: true,
          },
        })
        .afterClosed(),
    );
    return confirmed === true;
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.leaving && this.editable() && this.form.dirty) {
      event.preventDefault();
    }
  }

  protected lineTtc(index: number): number {
    const line = this.lines.at(index).getRawValue();
    return ttc(line.amountHt, line.vatAmount);
  }

  protected addLine(): void {
    this.lines.push(this.lineGroup());
  }

  protected removeLine(index: number): void {
    this.lines.removeAt(index);
    this.lines.markAsDirty();
  }

  protected setPeriod(key: number): void {
    const { month, year } = periodFromKey(key);
    this.form.patchValue({ periodMonth: month, periodYear: year });
    this.form.markAsDirty();
  }

  /** Calcule la TVA à partir du montant HT et du taux choisi. */
  protected applyVatRate(index: number, rate: number): void {
    const line = this.lines.at(index);
    const amountHt = line.controls.amountHt.value ?? 0;
    line.controls.vatAmount.setValue(Math.round(amountHt * rate) / 100);
    line.controls.vatAmount.markAsDirty();
  }

  protected vatRateLabel(rate: number): string {
    return `${String(rate).replace('.', ',')} %`;
  }

  protected async uploadFile(index: number, file: File): Promise<void> {
    if (!RECEIPT_TYPES.includes(file.type)) {
      this.notifier.info('Le justificatif doit être un PDF, un JPEG ou un PNG.');
      return;
    }
    if (file.size > MAX_RECEIPT_SIZE) {
      this.notifier.info('Le fichier dépasse la taille maximale de 5 Mo.');
      return;
    }
    this.uploadingLine.set(index);
    try {
      const receipt = await firstValueFrom(this.api.uploadReceipt(file));
      this.lines.at(index).patchValue({ receiptId: receipt.id, receiptName: receipt.originalFilename });
      this.lines.markAsDirty();
    } catch (error) {
      this.notifier.error(error);
    } finally {
      this.uploadingLine.set(null);
    }
  }

  protected downloadReceipt(receiptId: number): void {
    this.api.downloadReceipt(receiptId).subscribe({
      next: (response) => saveDownload(response, `justificatif-${receiptId}`),
      error: (error) => this.notifier.error(error),
    });
  }

  protected exportPdf(): void {
    const report = this.report();
    if (!report) {
      return;
    }
    this.api.exportPdf(report.id).subscribe({
      next: (response) => saveDownload(response, `note-de-frais-${report.id}.pdf`),
      error: (error) => this.notifier.error(error),
    });
  }

  protected async save(): Promise<void> {
    await this.run(async () => {
      if (await this.persist()) {
        this.notifier.success('Note enregistrée');
      }
    });
  }

  protected async submit(): Promise<void> {
    await this.run(async () => {
      const lines = this.lines.getRawValue();
      if (lines.length === 0) {
        this.notifier.info('Ajoutez au moins une dépense avant de soumettre.');
        return;
      }
      const missingReceipt = lines.some((line) => line.receiptId === null);
      if (missingReceipt || this.form.invalid) {
        this.submitAttempted.set(true);
        this.revealErrors();
        return;
      }
      const report = await this.persist();
      if (report) {
        this.apply(await firstValueFrom(this.api.transition(report.id, 'submit')));
        this.notifier.success('Note soumise à votre manager');
      }
    });
  }

  protected async transition(action: TransitionAction, message: string): Promise<void> {
    const report = this.report();
    if (!report) {
      return;
    }
    await this.run(async () => {
      this.apply(await firstValueFrom(this.api.transition(report.id, action)));
      this.notifier.success(message);
    });
  }

  protected async pay(): Promise<void> {
    const report = this.report();
    if (!report) {
      return;
    }
    const confirmed = await firstValueFrom(
      this.dialog
        .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
          data: {
            title: 'Marquer comme payée',
            message: `Confirmer le remboursement de ${report.ownerName} pour la note « ${report.title} » ? Cette action est définitive.`,
            confirmLabel: 'Marquer comme payée',
          },
        })
        .afterClosed(),
    );
    if (confirmed) {
      await this.transition('pay', 'Note marquée comme payée');
    }
  }

  protected async reject(): Promise<void> {
    const report = this.report();
    if (!report) {
      return;
    }
    const reason = await firstValueFrom(
      this.dialog
        .open<RejectDialog, RejectDialogData, string>(RejectDialog, {
          data: { title: report.title, ownerName: report.ownerName },
          width: '520px',
        })
        .afterClosed(),
    );
    if (!reason) {
      return;
    }
    await this.run(async () => {
      this.apply(await firstValueFrom(this.api.reject(report.id, reason)));
      this.notifier.success('Note rejetée');
    });
  }

  protected async delete(): Promise<void> {
    const report = this.report();
    if (!report) {
      return;
    }
    const confirmed = await firstValueFrom(
      this.dialog
        .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
          data: {
            title: 'Supprimer le brouillon',
            message: `La note « ${report.title} » et ses lignes seront définitivement supprimées.`,
            confirmLabel: 'Supprimer',
            danger: true,
          },
        })
        .afterClosed(),
    );
    if (!confirmed) {
      return;
    }
    await this.run(async () => {
      await firstValueFrom(this.api.delete(report.id));
      this.notifier.success('Brouillon supprimé');
      this.leaving = true;
      await this.router.navigate(['/reports']);
    });
  }

  /**
   * Enregistre l'en-tête puis synchronise les lignes. En cas d'échec en cours de route,
   * la note est rechargée pour que le formulaire reflète ce qui a réellement été enregistré.
   */
  private async persist(): Promise<ReportDetail | null> {
    if (this.form.invalid) {
      this.revealErrors();
      return null;
    }
    const { title, periodMonth, periodYear } = this.form.getRawValue();
    const header = { title: title.trim(), periodMonth, periodYear };
    let report = this.report();

    try {
      if (report === null) {
        report = await firstValueFrom(this.api.create(header));
        this.report.set(report);
      } else if (
        report.title !== header.title ||
        report.periodMonth !== header.periodMonth ||
        report.periodYear !== header.periodYear
      ) {
        report = await firstValueFrom(this.api.update(report.id, header));
      }

      const remaining = new Map(report.lines.map((line) => [line.id, line]));
      for (const line of this.lines.getRawValue()) {
        const request = toLineRequest(line);
        if (line.id === null) {
          report = await firstValueFrom(this.api.addLine(report.id, request));
        } else {
          const original = remaining.get(line.id);
          remaining.delete(line.id);
          if (!original || hasChanged(original, request)) {
            report = await firstValueFrom(this.api.updateLine(report.id, line.id, request));
          }
        }
      }
      for (const lineId of remaining.keys()) {
        report = await firstValueFrom(this.api.removeLine(report.id, lineId));
      }

      this.apply(report);
      return report;
    } catch (error) {
      if (report) {
        this.apply(await firstValueFrom(this.api.get(report.id)));
      }
      throw error;
    }
  }

  /**
   * Affiche toutes les erreurs et amène l'utilisateur sur le premier champ à corriger, ou à défaut
   * sur le premier justificatif manquant.
   */
  private revealErrors(): void {
    this.form.markAllAsTouched();
    setTimeout(() => {
      const target = this.host.nativeElement.querySelector<HTMLElement>(
        'input.ng-invalid, mat-select.ng-invalid, .dropzone.missing',
      );
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.focus({ preventScroll: true });
    });
  }

  private load(id: number): void {
    this.loading.set(true);
    this.api.get(id).subscribe({
      next: (report) => {
        this.apply(report);
        this.loading.set(false);
      },
      error: (error) => {
        this.notifier.error(error);
        this.loading.set(false);
        this.router.navigate(['/reports']);
      },
    });
  }

  private apply(report: ReportDetail): void {
    this.report.set(report);
    this.form.patchValue(
      { title: report.title, periodMonth: report.periodMonth, periodYear: report.periodYear },
      { emitEvent: false },
    );
    this.lines.clear({ emitEvent: false });
    for (const line of report.lines) {
      this.lines.push(this.lineGroup(line), { emitEvent: false });
    }
    this.form.updateValueAndValidity();
    this.form.markAsPristine();
    this.api.history(report.id).subscribe((history) => this.history.set(history));
  }

  /**
   * Une nouvelle note n'obtient son URL définitive qu'une fois l'opération entièrement terminée :
   * changer de route détruit ce composant, et l'instance suivante recharge l'état depuis l'API.
   */
  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
    } catch (error) {
      this.notifier.error(error);
    } finally {
      this.busy.set(false);
      const report = this.report();
      if (this.isNew() && report) {
        this.leaving = true;
        await this.router.navigate(['/reports', report.id], { replaceUrl: true });
      }
    }
  }

  private lineGroup(line?: ReportLine): LineForm {
    return this.fb.group({
      id: this.fb.control<number | null>(line?.id ?? null),
      spentOn: this.fb.control<Date | null>(
        line ? fromIsoDate(line.spentOn) : startOfToday(),
        Validators.required,
      ),
      category: this.fb.control<ExpenseCategory>(line?.category ?? 'MEAL', Validators.required),
      description: [line?.description ?? '', [Validators.required, Validators.maxLength(500)]],
      amountHt: this.fb.control<number | null>(line?.amountHt ?? null, [Validators.required, Validators.min(0)]),
      vatAmount: this.fb.control<number | null>(line?.vatAmount ?? 0, [Validators.required, Validators.min(0)]),
      receiptId: this.fb.control<number | null>(line?.receiptId ?? null),
      receiptName: this.fb.control<string | null>(line?.receiptId ? `Justificatif n°${line.receiptId}` : null),
    });
  }
}

function ttc(amountHt: number | null, vatAmount: number | null): number {
  return Math.round(((amountHt ?? 0) + (vatAmount ?? 0)) * 100) / 100;
}

function toLineRequest(line: ReturnType<LineForm['getRawValue']>): LineRequest {
  return {
    spentOn: toIsoDate(line.spentOn ?? startOfToday()),
    category: line.category,
    description: line.description.trim(),
    amountHt: line.amountHt ?? 0,
    vatAmount: line.vatAmount ?? 0,
    receiptId: line.receiptId,
  };
}

function hasChanged(original: ReportLine, request: LineRequest): boolean {
  return (
    original.spentOn !== request.spentOn ||
    original.category !== request.category ||
    original.description !== request.description ||
    Number(original.amountHt) !== request.amountHt ||
    Number(original.vatAmount) !== request.vatAmount ||
    original.receiptId !== request.receiptId
  );
}
