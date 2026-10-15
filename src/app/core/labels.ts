import { ExpenseCategory, ReportStatus, Role } from './models';

export const STATUS_LABELS: Record<ReportStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumise',
  APPROVED: 'Approuvée',
  REJECTED: 'Rejetée',
  PAID: 'Payée',
};

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  MEAL: 'Repas',
  TRANSPORT: 'Transport',
  ACCOMMODATION: 'Hébergement',
  SUPPLIES: 'Fournitures',
  OTHER: 'Autre',
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExpenseCategory[];

export const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: 'Employé',
  MANAGER: 'Manager',
  ACCOUNTANT: 'Comptable',
};

export const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export function periodLabel(month: number, year: number): string {
  return `${MONTHS[month - 1]} ${year}`;
}

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  MEAL: 'restaurant',
  TRANSPORT: 'train',
  ACCOMMODATION: 'hotel',
  SUPPLIES: 'inventory_2',
  OTHER: 'more_horiz',
};

export const STATUS_ICONS: Record<ReportStatus, string> = {
  DRAFT: 'edit_note',
  SUBMITTED: 'send',
  APPROVED: 'check_circle',
  REJECTED: 'cancel',
  PAID: 'payments',
};

/** Initiales affichées dans un avatar : « Alice Martin » → « AM », « alice@… » → « A ». */
export function initials(name: string): string {
  const words = name.split('@')[0].split(/[\s._-]+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('');
}

/** Clé de tri chronologique d'une période. */
export function periodKey(month: number, year: number): number {
  return year * 12 + month;
}

export function periodFromKey(key: number): { month: number; year: number } {
  return { month: ((key - 1) % 12) + 1, year: Math.floor((key - 1) / 12) };
}
