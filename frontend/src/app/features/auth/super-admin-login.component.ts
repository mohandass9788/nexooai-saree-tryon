import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-super-admin-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="hq-login-wrapper">
      <div class="hq-login-card">
        <!-- Top Back Link -->
        <div class="card-top-bar">
          <a routerLink="/" class="back-link">← NeXooAi Platform</a>
          <span class="hq-security-badge">🔒 RESTRICTED HQ PORTAL</span>
        </div>

        <!-- Crest & Header -->
        <div class="hq-header">
          <div class="crest-container">
            <span class="crest-icon">👑</span>
          </div>
          <h1 class="hq-title">Master Control HQ</h1>
          <p class="hq-subtitle">
            Centralized platform management, showroom onboardings, token allocations & global AI model routing.
          </p>
        </div>

        <!-- Error Alert -->
        <div *ngIf="errorMessage" class="hq-error-banner">
          <span class="err-icon">⚠️</span>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Login Form -->
        <form class="hq-form" (submit)="onSubmit($event)">
          <div class="form-group">
            <label for="hqEmail">Super Admin Master Email</label>
            <div class="input-wrap">
              <span class="input-icon">✉️</span>
              <input
                id="hqEmail"
                type="email"
                name="email"
                [(ngModel)]="email"
                placeholder="mohandass@nexooai.in"
                class="hq-input"
                required
                autocomplete="email"
              />
            </div>
            <span *ngIf="emailError" class="field-error-msg">{{ emailError }}</span>
          </div>

          <div class="form-group">
            <label for="hqPassword">Master Security Password</label>
            <div class="input-wrap password-wrap">
              <span class="input-icon">🔑</span>
              <input
                id="hqPassword"
                [type]="showPassword() ? 'text' : 'password'"
                name="password"
                [(ngModel)]="password"
                placeholder="••••••••••••"
                class="hq-input"
                required
                autocomplete="current-password"
              />
              <button
                type="button"
                class="btn-eye-toggle"
                (click)="togglePassword()"
                [title]="showPassword() ? 'Hide Password' : 'Show Password'">
                {{ showPassword() ? '🙈' : '👁️' }}
              </button>
            </div>
            <span *ngIf="passwordError" class="field-error-msg">{{ passwordError }}</span>
          </div>

          <button type="submit" class="btn-submit-hq" [disabled]="loading()">
            <span *ngIf="!loading()">Authorize & Access Master Console ➔</span>
            <span *ngIf="loading()">Verifying Master Security Clearance...</span>
          </button>
        </form>

        <!-- Footer Links -->
        <div class="hq-card-footer">
          <div class="switch-portal-row">
            <span>Are you a Showroom Store Manager or Floor Kiosk?</span>
            <a routerLink="/login" class="switch-portal-link">🏢 Showroom & Kiosk Login →</a>
          </div>
          <div class="hq-security-note">
            <span>Protected by NeXooAi Encrypted Zero-Trust Security Protocol. All administrative access events are audited.</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hq-login-wrapper {
      min-height: 100vh;
      background: radial-gradient(circle at 50% 15%, #1f0724 0%, #0c020f 60%, #030105 100%);
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.5rem;
    }

    .hq-login-card {
      width: 100%;
      max-width: 460px;
      background: rgba(22, 10, 27, 0.88);
      border: 1px solid rgba(212, 175, 55, 0.45);
      border-radius: 20px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(212, 175, 55, 0.15);
      padding: 2.25rem 2rem;
      backdrop-filter: blur(12px);
    }

    .card-top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .back-link {
      color: #e6c875;
      text-decoration: none;
      font-size: 0.84rem;
      font-weight: 600;
      transition: opacity 0.2s;
    }
    .back-link:hover {
      opacity: 0.8;
    }

    .hq-security-badge {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #ffd700;
      background: rgba(255, 215, 0, 0.12);
      border: 1px solid rgba(255, 215, 0, 0.35);
      padding: 0.25rem 0.65rem;
      border-radius: 12px;
    }

    .hq-header {
      text-align: center;
      margin-bottom: 1.75rem;
    }

    .crest-container {
      width: 58px;
      height: 58px;
      margin: 0 auto 1rem;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.3) 0%, rgba(212, 175, 55, 0.05) 100%);
      border: 1.5px solid rgba(212, 175, 55, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 20px rgba(212, 175, 55, 0.3);
    }

    .crest-icon {
      font-size: 1.85rem;
    }

    .hq-title {
      font-size: 1.85rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
      margin: 0 0 0.45rem;
      background: linear-gradient(135deg, #ffffff 40%, #f7d788 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hq-subtitle {
      font-size: 0.88rem;
      color: #bfaabf;
      line-height: 1.5;
      margin: 0;
    }

    .hq-error-banner {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      font-size: 0.86rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 1.25rem;
    }

    .hq-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .form-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #e5d8e7;
    }

    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 0.95rem;
      font-size: 1rem;
      pointer-events: none;
      opacity: 0.7;
    }

    .hq-input {
      width: 100%;
      box-sizing: border-box;
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 10px;
      padding: 0.82rem 1rem 0.82rem 2.65rem;
      color: #ffffff;
      font-size: 0.95rem;
      outline: none;
      transition: all 0.2s ease;
    }

    .hq-input:focus {
      border-color: #ffd700;
      box-shadow: 0 0 12px rgba(255, 215, 0, 0.25);
      background: rgba(0, 0, 0, 0.65);
    }

    .password-wrap .hq-input {
      padding-right: 2.75rem;
    }

    .btn-eye-toggle {
      position: absolute;
      right: 0.75rem;
      background: transparent;
      border: none;
      font-size: 1.15rem;
      cursor: pointer;
      color: #d1c1d4;
      padding: 0.25rem;
      transition: transform 0.15s;
    }
    .btn-eye-toggle:hover {
      transform: scale(1.15);
    }

    .field-error-msg {
      color: #ef4444;
      font-size: 0.78rem;
      font-weight: 500;
      margin-top: 0.2rem;
    }

    .btn-submit-hq {
      margin-top: 0.5rem;
      width: 100%;
      background: linear-gradient(135deg, #d4af37 0%, #b89628 100%);
      border: 1px solid #ffd700;
      color: #1a0820;
      font-size: 1rem;
      font-weight: 700;
      padding: 0.88rem 1.25rem;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 6px 20px rgba(212, 175, 55, 0.35);
    }

    .btn-submit-hq:hover:not(:disabled) {
      background: linear-gradient(135deg, #f5cc4b 0%, #d4af37 100%);
      box-shadow: 0 8px 25px rgba(212, 175, 55, 0.5);
      transform: translateY(-1px);
    }

    .btn-submit-hq:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .hq-card-footer {
      margin-top: 1.75rem;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      text-align: center;
    }

    .switch-portal-row {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.82rem;
      color: #a894ac;
    }

    .switch-portal-link {
      color: #ffd700;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.88rem;
    }
    .switch-portal-link:hover {
      text-decoration: underline;
    }

    .hq-security-note {
      font-size: 0.72rem;
      color: #7d6b81;
      line-height: 1.4;
    }
  `],
})
export class SuperAdminLoginComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  email = 'mohandass@nexooai.in';
  password = '';
  loading = signal<boolean>(false);
  showPassword = signal<boolean>(false);

  errorMessage = '';
  emailError = '';
  passwordError = '';

  ngOnInit(): void {
    // If already logged in as super_admin, redirect straight to dashboard
    const role = sessionStorage.getItem('nexooai_user_role');
    const token = sessionStorage.getItem('nexooai_auth_token');
    if (token && role === 'super_admin') {
      this.router.navigate(['/app/dashboard'], { queryParams: { tab: 'sa-showrooms' } });
    }
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(e: Event): void {
    e.preventDefault();
    this.errorMessage = '';
    this.emailError = '';
    this.passwordError = '';

    if (!this.email.trim()) {
      this.emailError = 'மின்னஞ்சல் முகவரி தேவை (Master Email is required)';
      return;
    }
    if (!this.password) {
      this.passwordError = 'கடவுச்சொல் தேவை (Master Password is required)';
      return;
    }

    this.loading.set(true);

    const payload = {
      email: this.email.trim(),
      password: this.password.trim(),
    };

    this.http.post<any>('/api/v1/auth/login', payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        const role = res.role || '';
        const token = res.token || '';
        const name = res.name || 'Mohandass (NeXooAi Super Admin)';

        if (role !== 'super_admin') {
          this.errorMessage =
            'அணுகல் மறுக்கப்பட்டது: இந்த தளம் சூப்பர் அட்மின்கான பிரத்தியேக போர்டல் ஆகும். தயவுசெய்து ஷோரூம் உள்நுழைவு பக்கத்தை பயன்படுத்தவும். (Access Denied: Store Managers must sign in via /login).';
          return;
        }

        // Store tokens securely in session & local storage
        sessionStorage.setItem('nexooai_auth_token', token);
        sessionStorage.setItem('nexooai_user_role', 'super_admin');
        sessionStorage.setItem('nexooai_user_name', name);
        sessionStorage.removeItem('nexooai_shop_id');

        localStorage.setItem('nexooai_session_token', token);
        sessionStorage.setItem('nexooai_admin_token', token);
        localStorage.setItem('nexooai_token', token);
        localStorage.setItem('nexooai_active_tab', 'sa-showrooms');

        this.notificationService.showSuccess(`Master Control Clearance Verified. Welcome, ${name}!`);
        this.router.navigate(['/app/dashboard'], {
          queryParams: { tab: 'sa-showrooms' },
        });
      },
      error: (err) => {
        this.loading.set(false);
        const detail =
          err?.error?.detail ||
          'தவறான சூப்பர் அட்மின் மின்னஞ்சல் அல்லது கடவுச்சொல் (Invalid master credentials).';
        this.errorMessage = detail;
      },
    });
  }
}
