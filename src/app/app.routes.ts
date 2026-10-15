import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard, unsavedChangesGuard } from './core/guards';
import { Shell } from './layout/shell';
import { Approvals } from './pages/approvals/approvals';
import { Login } from './pages/login/login';
import { ReportEdit } from './pages/report-edit/report-edit';
import { ReportList } from './pages/report-list/report-list';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [guestGuard], title: 'Connexion · ExpenseFlow' },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'reports' },
      { path: 'reports', component: ReportList, title: 'Notes de frais · ExpenseFlow' },
      {
        path: 'reports/new',
        component: ReportEdit,
        canDeactivate: [unsavedChangesGuard],
        title: 'Nouvelle note · ExpenseFlow',
      },
      {
        path: 'reports/:id',
        component: ReportEdit,
        canDeactivate: [unsavedChangesGuard],
        title: 'Note de frais · ExpenseFlow',
      },
      {
        path: 'approvals',
        component: Approvals,
        canActivate: [roleGuard('MANAGER')],
        title: 'Validation · ExpenseFlow',
      },
    ],
  },
  { path: '**', redirectTo: 'reports' },
];
