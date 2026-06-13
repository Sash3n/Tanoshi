import { Injectable, signal } from '@angular/core';

export type ToastLevel = 'success' | 'error' | 'info';

export interface IToast {
  readonly id: string;
  readonly message: string;
  readonly level: ToastLevel;
}

const TOAST_DURATION_MS = 3000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<IToast[]>([]);

  show(message: string, level: ToastLevel = 'info'): void {
    const id = crypto.randomUUID();
    this.toasts.update((current) => [...current, { id, message, level }]);
    setTimeout(() => this.dismiss(id), TOAST_DURATION_MS);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  dismiss(id: string): void {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }
}
