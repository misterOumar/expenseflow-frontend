import { HttpErrorResponse } from '@angular/common/http';

/**
 * Message lisible tiré d'une erreur HTTP : le champ `detail` du ProblemDetail renvoyé par l'API,
 * complété du détail des champs invalides le cas échéant.
 */
export function problemMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Une erreur inattendue est survenue.';
  }
  if (error.status === 0) {
    return 'Le serveur est injoignable. Vérifiez votre connexion.';
  }
  const body = error.error as { detail?: string; errors?: Record<string, string> } | null;
  const fields = body?.errors ? Object.entries(body.errors).map(([field, message]) => `${field} : ${message}`) : [];
  return [body?.detail ?? `Erreur ${error.status}`, ...fields].join(' — ');
}
