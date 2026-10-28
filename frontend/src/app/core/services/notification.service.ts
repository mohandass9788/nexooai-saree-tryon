import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  durationMs: number;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

interface ActiveDialog extends ConfirmDialogOptions {
  id: string;
  resolve: (value: boolean) => void;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  readonly toasts = signal<ToastItem[]>([]);
  readonly activeDialog = signal<ActiveDialog | null>(null);

  /**
   * Displays an accessible, non-blocking toast message.
   */
  showToast(message: string, type: ToastType = 'info', durationMs = 4500): string {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = { id, message, type, durationMs };

    this.toasts.update((current) => [...current, newToast]);

    if (durationMs > 0) {
      setTimeout(() => {
        this.dismissToast(id);
      }, durationMs);
    }

    return id;
  }

  showSuccess(message: string, durationMs = 4000): string {
    return this.showToast(message, 'success', durationMs);
  }

  showError(message: string, durationMs = 6000): string {
    return this.showToast(message, 'error', durationMs);
  }

  showWarning(message: string, durationMs = 5000): string {
    return this.showToast(message, 'warning', durationMs);
  }

  dismissToast(id: string): void {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }

  /**
   * Accessible modal confirmation dialog replacing browser confirm().
   */
  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const id = `dialog_${Date.now()}`;
      this.activeDialog.set({
        ...options,
        id,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        resolve: (val: boolean) => {
          this.activeDialog.set(null);
          resolve(val);
        },
      });
    });
  }

  /**
   * Accessible modal alert replacing browser alert().
   */
  alert(title: string, message: string, buttonText = 'OK'): Promise<void> {
    return new Promise<void>((resolve) => {
      const id = `alert_${Date.now()}`;
      this.activeDialog.set({
        title,
        message,
        confirmText: buttonText,
        cancelText: undefined,
        id,
        resolve: () => {
          this.activeDialog.set(null);
          resolve();
        },
      });
    });
  }

  resolveActiveDialog(result: boolean): void {
    const dlg = this.activeDialog();
    if (dlg) {
      dlg.resolve(result);
    }
  }
}
