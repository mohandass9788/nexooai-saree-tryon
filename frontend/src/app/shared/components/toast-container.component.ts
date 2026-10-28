import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, ToastItem } from '../../core/services/notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="toast-portal-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      *ngIf="notificationService.toasts().length > 0"
    >
      <div
        *ngFor="let toast of notificationService.toasts(); trackBy: trackById"
        class="kiosk-toast"
        [ngClass]="'toast-' + toast.type"
        role="status"
      >
        <span class="toast-icon" aria-hidden="true">
          <ng-container [ngSwitch]="toast.type">
            <span *ngSwitchCase="'success'">✓</span>
            <span *ngSwitchCase="'error'">✕</span>
            <span *ngSwitchCase="'warning'">⚠️</span>
            <span *ngSwitchDefault>ℹ️</span>
          </ng-container>
        </span>
        <div class="toast-content">{{ toast.message }}</div>
        <button
          type="button"
          class="toast-dismiss-btn"
          (click)="notificationService.dismissToast(toast.id)"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toast-portal-container {
      position: fixed;
      top: 2rem;
      right: 2rem;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 420px;
      width: calc(100vw - 3rem);
      pointer-events: none;
    }
    .kiosk-toast {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 1rem 1.25rem;
      border-radius: 12px;
      font-size: 1.05rem;
      font-weight: 500;
      color: #ffffff;
      background: rgba(18, 18, 24, 0.96);
      backdrop-filter: blur(12px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.2);
      border-left: 5px solid #d4af37;
      animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .toast-success {
      border-left-color: #10b981;
    }
    .toast-error {
      border-left-color: #ef4444;
      background: rgba(30, 12, 14, 0.96);
    }
    .toast-warning {
      border-left-color: #f59e0b;
    }
    .toast-info {
      border-left-color: #3b82f6;
    }
    .toast-icon {
      font-size: 1.3rem;
      flex-shrink: 0;
    }
    .toast-content {
      flex: 1;
      line-height: 1.4;
      word-break: break-word;
    }
    .toast-dismiss-btn {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 1.6rem;
      line-height: 1;
      cursor: pointer;
      padding: 0.25rem;
      min-width: 36px;
      min-height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: color 0.15s, background 0.15s;
    }
    .toast-dismiss-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
    }
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(30px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `],
})
export class ToastContainerComponent {
  readonly notificationService = inject(NotificationService);

  trackById(_index: number, item: ToastItem): string {
    return item.id;
  }
}
