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
