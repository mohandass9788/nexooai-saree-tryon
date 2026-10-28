import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="dialog-backdrop"
      *ngIf="notificationService.activeDialog() as dialog"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="'dialog-title-' + dialog.id"
      [attr.aria-describedby]="'dialog-desc-' + dialog.id"
    >
      <div class="dialog-panel">
        <h3 [id]="'dialog-title-' + dialog.id" class="dialog-title">
          {{ dialog.title }}
        </h3>
        <p [id]="'dialog-desc-' + dialog.id" class="dialog-message">
          {{ dialog.message }}
        </p>

        <div class="dialog-actions">
          <button
            *ngIf="dialog.cancelText"
            type="button"
            class="kiosk-btn kiosk-btn-secondary"
            (click)="onCancel()"
          >
            {{ dialog.cancelText }}
          </button>
          <button
            type="button"
            class="kiosk-btn"
            [ngClass]="dialog.isDestructive ? 'kiosk-btn-danger' : 'kiosk-btn-primary'"
            (click)="onConfirm()"
          >
            {{ dialog.confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      animation: fadeIn 0.2s ease-out;
    }
    .dialog-panel {
      background: #18181f;
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 16px;
      padding: 2rem;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 15px rgba(212, 175, 55, 0.15);
      animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .dialog-title {
      font-size: 1.45rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 0.85rem 0;
      line-height: 1.3;
    }
    .dialog-message {
      font-size: 1.05rem;
      color: rgba(255, 255, 255, 0.85);
      margin: 0 0 1.75rem 0;
      line-height: 1.5;
      word-break: break-word;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
    }
    .kiosk-btn {
      min-height: 48px;
      min-width: 110px;
      padding: 0.75rem 1.5rem;
      border-radius: 10px;
      font-size: 1.05rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: transform 0.1s, opacity 0.15s, background 0.15s;
    }
    .kiosk-btn:active {
      transform: scale(0.97);
    }
    .kiosk-btn-primary {
      background: linear-gradient(135deg, #d4af37 0%, #b8932b 100%);
      color: #0b0b0e;
    }
    .kiosk-btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .kiosk-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.18);
    }
    .kiosk-btn-danger {
      background: #dc2626;
      color: #ffffff;
    }
    .kiosk-btn-danger:hover {
      background: #b91c1c;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleUp {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `],
})
export class ConfirmDialogComponent {
  readonly notificationService = inject(NotificationService);

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.onCancel();
  }

  onConfirm(): void {
    this.notificationService.resolveActiveDialog(true);
  }

  onCancel(): void {
    this.notificationService.resolveActiveDialog(false);
  }
}
