import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

/**
 * Adaptateur de dates du datepicker : semaine commençant le lundi et saisie clavier au format
 * français (`15/10/2026`, `15.10.26`…), que `Date.parse` ne sait pas lire.
 */
@Injectable()
export class FrDateAdapter extends NativeDateAdapter {
  override getFirstDayOfWeek(): number {
    return 1;
  }

  override parse(value: unknown, parseFormat?: unknown): Date | null {
    if (typeof value !== 'string') {
      return super.parse(value, parseFormat);
    }
    if (!value.trim()) {
      return null;
    }
    const match = /^\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\s*$/.exec(value);
    if (!match) {
      return this.invalid();
    }
    const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(year < 100 ? 2000 + year : year, month - 1, day);
    return date.getMonth() === month - 1 && date.getDate() === day ? date : this.invalid();
  }
}

/** `2026-10-15` → date locale, sans décalage de fuseau horaire. */
export function fromIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Date locale → `2026-10-15`, format attendu par l'API. */
export function toIsoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
