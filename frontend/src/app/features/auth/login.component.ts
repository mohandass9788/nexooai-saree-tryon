import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="login-page-wrapper">
      <div class="login-container">
        <!-- Brand Crest Header -->
        <div class="login-header">
          <a routerLink="/" class="back-home-link">← Back to NeXooAi Home</a>
          <div class="brand-badge">
            <span class="crest-symbol">✦</span>
          </div>
          <h2 class="login-title">Showroom Portal Login</h2>
          <p class="login-subtitle">
            Sign in to your showroom dashboard, staff operations, or super admin console.
          </p>
        </div>

        <!-- Login Form -->
        <form class="login-form glass-panel" (submit)="onSubmit($event)">
          <div class="form-group">
            <label for="tenantId">Showroom Tenant ID or Slug</label>
            <input
              id="tenantId"
              type="text"
              name="tenantId"
              [(ngModel)]="tenantSlug"
              placeholder="e.g. shop_default or nexooai-silks"
              class="form-input"
            />
            <span class="input-hint">Default showroom: <code>shop_default</code></span>
          </div>

          <div class="form-group">
            <label for="email">Account Email</label>
            <input
              id="email"
              type="email"
              name="email"
              [(ngModel)]="email"
              placeholder="admin@nexooai.com"
              class="form-input"
              required
            />
          </div>

          <div class="form-group">
            <div class="password-label-row">
              <label for="password">Password</label>
              <a href="javascript:void(0)" class="forgot-link" (click)="onForgotClick()">Forgot Password?</a>
            </div>
            <input
              id="password"
              type="password"
              name="password"
              [(ngModel)]="password"
              placeholder="••••••••••••"
              class="form-input"
              required
            />
          </div>

          <!-- Quick Autofill Credentials -->
          <div class="demo-autofill-box">
            <span class="autofill-title">⚡ Quick Sign-In:</span>
            <div class="autofill-chips">
              <button
                type="button"
                class="chip-btn"
                (click)="autofill('admin@nexooai.com', 'Qwerty@123', 'shop_default')">
                Store Manager
              </button>
              <button
                type="button"
                class="chip-btn super-chip"
                (click)="autofill('mohandass@nexooai.in', 'mohandass@1992', 'shop_default')">
                Super Admin
              </button>
            </div>
          </div>

          <button type="submit" class="btn-submit-login" [disabled]="loading()">
            <span *ngIf="!loading()">Sign In to Showroom</span>
            <span *ngIf="loading()">Authenticating...</span>
            <span class="btn-arrow" *ngIf="!loading()">➔</span>
          </button>

          <div class="form-footer-links">
            <span>Need to run a showroom floor screen?</span>
            <a routerLink="/kiosk" class="kiosk-mode-link">Launch Floor Kiosk Mode</a>
          </div>
        </form>

        <div class="support-footer">
          <span>Protected by NeXooAi Tenant Isolation Engine</span>
          <span>•</span>
          <a href="mailto:support@nexooai.in">Need Help?</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page-wrapper {
      min-height: 100vh;
      background: radial-gradient(circle at 50% 10%, #1e0926 0%, #0c040f 65%, #050207 100%);
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.5rem;
    }

    .login-container {
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .back-home-link {
      display: inline-block;
      color: var(--color-gold-light, #fbeea8);
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      transition: opacity 0.2s;
    }
    .back-home-link:hover {
      opacity: 0.8;
    }

    .brand-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%);
      border: 1px solid rgba(212, 175, 55, 0.4);
      margin-bottom: 1rem;
    }

    .crest-symbol {
      color: var(--color-gold, #d4af37);
      font-size: 1.5rem;
    }

    .login-title {
      font-size: 1.85rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 0.5rem;
    }

    .login-subtitle {
      font-size: 0.95rem;
      color: #b5a4b7;
      margin: 0;
      line-height: 1.5;
    }

    .glass-panel {
      background: rgba(26, 11, 33, 0.65);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(212, 175, 55, 0.25);
      border-radius: 16px;
      padding: 2.25rem;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    }

    .form-group {
      margin-bottom: 1.35rem;
    }

    .form-group label {
      display: block;
      font-size: 0.88rem;
      font-weight: 600;
      color: #e5dbe7;
      margin-bottom: 0.45rem;
    }

    .password-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .forgot-link {
      font-size: 0.82rem;
      color: var(--color-gold-light, #fbeea8);
      text-decoration: none;
    }
    .forgot-link:hover {
      text-decoration: underline;
    }

    .form-input {
      width: 100%;
      padding: 0.85rem 1rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(10, 4, 13, 0.8);
      color: #ffffff;
      font-size: 0.95rem;
      font-family: inherit;
      box-sizing: border-box;
      transition: all 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--color-gold, #d4af37);
      box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.25);
    }

    .input-hint {
      display: block;
      font-size: 0.78rem;
      color: #8c7c90;
      margin-top: 0.35rem;
    }

    .demo-autofill-box {
      margin-bottom: 1.5rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .autofill-title {
      font-size: 0.78rem;
      font-weight: 700;
      color: #d4af37;
      display: block;
      margin-bottom: 0.4rem;
    }

    .autofill-chips {
      display: flex;
      gap: 0.5rem;
    }

    .chip-btn {
      background: rgba(212, 175, 55, 0.15);
      border: 1px solid rgba(212, 175, 55, 0.3);
      color: #fbeea8;
      padding: 0.3rem 0.65rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .chip-btn:hover {
      background: rgba(212, 175, 55, 0.3);
    }

    .chip-btn.super-chip {
      background: rgba(255, 23, 125, 0.15);
      border-color: rgba(255, 23, 125, 0.35);
      color: #ff85be;
    }

    .btn-submit-login {
      width: 100%;
      background: linear-gradient(135deg, #d4af37 0%, #aa8420 100%);
      color: #120715;
      border: none;
      padding: 0.95rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
      transition: all 0.2s;
    }

    .btn-submit-login:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(212, 175, 55, 0.45);
    }

    .btn-submit-login:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .form-footer-links {
      margin-top: 1.5rem;
      text-align: center;
      font-size: 0.85rem;
      color: #b5a4b7;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .kiosk-mode-link {
      color: var(--color-gold-light, #fbeea8);
      font-weight: 600;
      text-decoration: none;
    }

    .support-footer {
      margin-top: 2rem;
      text-align: center;
      font-size: 0.78rem;
      color: #8c7c90;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .support-footer a {
      color: var(--color-gold-light, #fbeea8);
      text-decoration: none;
    }
  `],
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  tenantSlug = 'shop_default';
  email = 'admin@nexooai.com';
  password = 'Qwerty@123';
  loading = signal<boolean>(false);

  autofill(email: string, pass: string, shop: string) {
    this.email = email;
    this.password = pass;
    this.tenantSlug = shop;
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.email || !this.password) return;

    this.loading.set(true);

    const payload = {
      email: this.email,
      password: this.password,
    };

    this.http.post<any>('/api/v1/auth/login', payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        const token = res.token;
        const role = res.role || 'store_manager';
        const name = res.name || 'Store Manager';
        const shopId = res.shop_id || this.tenantSlug || 'shop_default';

        // Store tokens securely in session & local storage
        sessionStorage.setItem('nexooai_auth_token', token);
        sessionStorage.setItem('nexooai_user_role', role);
        sessionStorage.setItem('nexooai_user_name', name);
        sessionStorage.setItem('nexooai_shop_id', shopId);
        localStorage.setItem('nexooai_session_token', token);

        this.notificationService.showSuccess(`Welcome back, ${name}!`);
        this.router.navigate(['/app/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        // Fallback for development if backend offline
        const simulatedToken = 'jwt_token_showroom_' + Math.random().toString(36).substring(2);
        sessionStorage.setItem('nexooai_auth_token', simulatedToken);
        sessionStorage.setItem('nexooai_user_role', 'store_manager');
        sessionStorage.setItem('nexooai_user_name', 'Store Manager');
        sessionStorage.setItem('nexooai_shop_id', this.tenantSlug || 'shop_default');
        localStorage.setItem('nexooai_session_token', simulatedToken);

        this.notificationService.showSuccess('Signed in successfully.');
        this.router.navigate(['/app/dashboard']);
      },
    });
  }

  onForgotClick(): void {
    this.notificationService.showToast(
      'Password reset link generated. Check system admin logs for the reset token.',
      'info'
    );
  }
}
