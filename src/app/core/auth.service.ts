import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { map, Observable, tap } from 'rxjs';
import { Role, TokenResponse } from './models';

const TOKEN_KEY = 'expenseflow.token';

export interface CurrentUser {
  id: number;
  email: string;
  role: Role;
  expiresAt: number;
}

/**
 * Jeton JWT conservé dans le localStorage. L'utilisateur courant est lu dans les claims du jeton
 * (`sub`, `email`, `role`, `exp`), sans appel supplémentaire à l'API.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly user = computed(() => decode(this.token()));

  login(email: string, password: string): Observable<void> {
    return this.http.post<TokenResponse>('/api/auth/login', { email, password }).pipe(
      tap((response) => {
        localStorage.setItem(TOKEN_KEY, response.accessToken);
        this.token.set(response.accessToken);
      }),
      map(() => undefined),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
    this.router.navigate(['/login']);
  }

  accessToken(): string | null {
    return this.isAuthenticated() ? this.token() : null;
  }

  isAuthenticated(): boolean {
    const user = this.user();
    return user !== null && user.expiresAt > Date.now();
  }

  hasRole(role: Role): boolean {
    return this.user()?.role === role;
  }
}

function decode(token: string | null): CurrentUser | null {
  if (!token) {
    return null;
  }
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    return { id: Number(claims.sub), email: claims.email, role: claims.role, expiresAt: claims.exp * 1000 };
  } catch {
    return null;
  }
}
