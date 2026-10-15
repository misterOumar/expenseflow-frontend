import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { problemMessage } from './problem';

@Injectable({ providedIn: 'root' })
export class Notifier {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, undefined, { duration: 3000 });
  }

  info(message: string): void {
    this.snackBar.open(message, 'Fermer', { duration: 6000 });
  }

  error(error: unknown): void {
    this.snackBar.open(problemMessage(error), 'Fermer', { duration: 8000 });
  }
}
