import { Component, inject, isDevMode, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { problemMessage } from '../../core/problem';

/** Comptes créés par l'API en local, proposés uniquement en mode développement. */
const DEMO_ACCOUNTS = [
  { label: 'Employée', email: 'alice@expenseflow.dev' },
  { label: 'Manager', email: 'manager@expenseflow.dev' },
  { label: 'Comptable', email: 'compta@expenseflow.dev' },
];
const DEMO_PASSWORD = 'password';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly hidePassword = signal(true);
  protected readonly demoAccounts = isDevMode() ? DEMO_ACCOUNTS : null;

  protected fillDemo(email: string): void {
    this.form.setValue({ email, password: DEMO_PASSWORD });
    this.error.set(null);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigate(['/reports']),
      error: (error) => {
        this.error.set(problemMessage(error));
        this.loading.set(false);
      },
    });
  }
}
