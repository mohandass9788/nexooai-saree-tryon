import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="login-page-wrapper" [class.light-theme]="!isDarkMode()">
      <div class="login-container">
        <!-- Top Navigation & Theme Switcher -->
        <div class="login-header-top">
          <a routerLink="/" class="back-home-link">← Back to NeXooAi Home</a>
          <button
            type="button"
            class="btn-theme-pill"
            (click)="toggleTheme()"
            [title]="isDarkMode() ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
            {{ isDarkMode() ? '☀️ Light' : '🌙 Dark' }}
          </button>
        </div>

        <!-- Brand Crest Header -->
        <div class="login-header">
          <div class="brand-badge">
            <img
              [src]="isDarkMode() ? 'assets/images/nexooai_icon.png' : 'assets/images/nexooai_icon_black.png'"
              alt="NeXooAi Logo"
              width="44"
              height="44"
              class="login-logo-img"
            />
          </div>
          <h2 class="login-title">
            {{ selectedRole() === 'kiosk_terminal' ? '55" Floor Kiosk Terminal' : 'Showroom Portal Login' }}
          </h2>
          <p class="login-subtitle">
            {{ selectedRole() === 'kiosk_terminal' ? 'Dedicated floor kiosk activation. Locked strictly to customer virtual try-on flow with zero administrative exposure.' : 'Sign in to your boutique command center, floor kiosks, and catalog.' }}
          </p>

          <!-- Role Selector Bar -->
          <div class="role-selector-bar">
            <button
              type="button"
              class="role-select-tab"
              [class.active]="selectedRole() === 'store_manager'"
              (click)="setLoginRole('store_manager')">
              <span class="tab-icon">🏢</span>
              <span>Store Manager</span>
            </button>
            <button
              type="button"
              class="role-select-tab kiosk-tab"
              [class.active]="selectedRole() === 'kiosk_terminal'"
              (click)="setLoginRole('kiosk_terminal')">
              <span class="tab-icon">🖥️</span>
              <span>Floor Kiosk</span>
            </button>
          </div>
        </div>

        <!-- Kiosk Security Lock Alert (Shown when redirected from unauthorized /kiosk access) -->
        <div class="kiosk-lock-alert" *ngIf="route.snapshot.queryParamMap.get('kioskLock')">
          <span class="alert-icon">🔒</span>
          <div class="alert-text">
            <strong>Kiosk Authorization Required / கியோஸ்க் உள்நுழைவு தேவை</strong>
            <p>The Floor Kiosk cannot be accessed anonymously. Sign in with your Showroom account to launch and pair this kiosk terminal.</p>
          </div>
        </div>

        <!-- Role Credentials Explainer Card -->
        <div class="credentials-guide-box glass-panel">
          <div class="guide-header-row">
            <span class="guide-pill">🔑 ACCESS MODE</span>
            <span class="guide-role-title">
              {{ selectedRole() === 'kiosk_terminal' ? (isDevicePaired() ? '🖥️ Paired Floor Kiosk Terminal' : '🔗 Kiosk One-Time Device Activation') : '🏢 Showroom Store Manager Portal' }}
            </span>
          </div>
          <p class="guide-desc">
            {{ selectedRole() === 'kiosk_terminal' 
              ? (isDevicePaired() 
                  ? 'This physical 55" screen is bound to ' + pairedStoreName() + '. Staff PIN unlocks customer try-on session. Management metrics remain strictly protected.' 
                  : 'Bind this 55" floor touchscreen once to your boutique. Daily operations will use 4-digit Staff PIN.') 
              : 'Sign in to manage your boutique catalog, customer WhatsApp leads, and showroom staff. Best used on office computer or manager mobile.' }}
          </p>
        </div>

        <!-- Login Form -->
        <form class="login-form glass-panel" (submit)="onSubmit($event)">
          <!-- ============================================== -->
          <!-- MODE 1: STORE MANAGER (Clean Email + Password) -->
          <!-- ============================================== -->
          <ng-container *ngIf="selectedRole() === 'store_manager'">
            <div class="form-group">
              <label for="mgrEmail">Store Manager Email Address *</label>
              <input
                id="mgrEmail"
                type="email"
                name="email"
                [(ngModel)]="email"
                placeholder="e.g. manager@kumaransilks.in"
                class="form-input"
                required
                autocomplete="username"
              />
            </div>

            <div class="form-group">
              <div class="password-label-row">
                <label for="mgrPassword">Manager Password *</label>
                <a href="javascript:void(0)" class="forgot-link" (click)="onForgotClick()">Forgot Password?</a>
              </div>
              <div class="password-input-wrapper">
                <input
                  id="mgrPassword"
                  [type]="showPassword() ? 'text' : 'password'"
                  name="password"
                  [(ngModel)]="password"
                  placeholder="••••••••••••"
                  class="form-input password-input"
                  required
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  class="btn-eye-toggle-login"
                  (click)="togglePassword()"
                  [title]="showPassword() ? 'Hide Password' : 'Show Password'">
                  {{ showPassword() ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>

            <button type="submit" class="btn-submit-login" [disabled]="loading()">
              <span *ngIf="!loading()">Sign In to Showroom Dashboard ➔</span>
              <span *ngIf="loading()">Authenticating...</span>
            </button>
          </ng-container>

          <!-- ============================================== -->
          <!-- MODE 2: FLOOR KIOSK - ALREADY PAIRED (DAILY)  -->
          <!-- ============================================== -->
          <ng-container *ngIf="selectedRole() === 'kiosk_terminal' && isDevicePaired()">
            <div class="paired-kiosk-badge-card">
              <div class="paired-store-row">
                <span class="paired-icon">🏢</span>
                <div class="paired-info">
                  <strong class="paired-name">{{ pairedStoreName() }}</strong>
                  <span class="paired-sub">55" Floor Totem ({{ pairedKioskCode() }})</span>
                </div>
              </div>
              <span class="paired-status-dot">● Paired</span>
            </div>

            <div class="form-group">
              <label for="kioskPinInput">Showroom Staff PIN (4 to 6 Digits) *</label>
              <div class="password-input-wrapper">
                <input
                  id="kioskPinInput"
                  [type]="showPassword() ? 'text' : 'password'"
                  name="kioskPin"
                  [(ngModel)]="kioskPinInput"
                  placeholder="e.g. 5521"
                  maxlength="8"
                  class="form-input password-input text-center-pin"
                  required
                  autocomplete="off"
                />
                <button
                  type="button"
                  class="btn-eye-toggle-login"
                  (click)="togglePassword()"
                  [title]="showPassword() ? 'Hide PIN' : 'Show PIN'">
                  {{ showPassword() ? '🙈' : '👁️' }}
                </button>
              </div>
              <span class="input-hint">Enter your daily staff PIN to unlock customer virtual try-on mode.</span>
            </div>

            <button type="submit" class="btn-submit-login btn-kiosk-unlock" [disabled]="loading()">
              <span *ngIf="!loading()">🔓 Unlock & Launch Virtual Try-On ➔</span>
              <span *ngIf="loading()">Authorizing Floor Terminal...</span>
            </button>

            <div class="unpair-action-row">
              <button type="button" class="btn-link-unpair" (click)="unpairDevice()">
                🔄 Switch Showroom / Unpair This Device
              </button>
            </div>
          </ng-container>

          <!-- ============================================== -->
          <!-- MODE 2: FLOOR KIOSK - FIRST TIME PAIRING      -->
          <!-- ============================================== -->
          <ng-container *ngIf="selectedRole() === 'kiosk_terminal' && !isDevicePaired()">
            <div class="pair-guide-banner">
              <span class="pair-guide-icon">🔗</span>
              <div class="pair-guide-text">
                <strong>One-Time Device Activation / ஒருமுறை இணைப்பு</strong>
                <p>Bind this physical 55" screen to your showroom. Enter your showroom name or manager email and staff PIN.</p>
              </div>
            </div>

            <div class="form-group">
              <label for="pairShopIdent">Showroom Name, Slug, or Manager Email *</label>
              <input
                id="pairShopIdent"
                type="text"
                name="pairShopIdent"
                [(ngModel)]="pairShopIdent"
                placeholder="e.g. manager@kumaransilks.in or Sri Kumaran Silks"
                class="form-input"
                required
              />
            </div>

            <div class="form-group">
              <label for="pairSecret">Showroom Password or Staff PIN *</label>
              <div class="password-input-wrapper">
                <input
                  id="pairSecret"
                  [type]="showPassword() ? 'text' : 'password'"
                  name="pairSecret"
                  [(ngModel)]="pairSecret"
                  placeholder="Showroom Password or Staff PIN (e.g. 5521)"
                  class="form-input password-input"
                  required
                />
                <button
                  type="button"
                  class="btn-eye-toggle-login"
                  (click)="togglePassword()"
                  [title]="showPassword() ? 'Hide' : 'Show'">
                  {{ showPassword() ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>

            <button type="submit" class="btn-submit-login btn-kiosk-pair" [disabled]="loading()">
              <span *ngIf="!loading()">🔗 Bind & Launch Floor Kiosk ➔</span>
              <span *ngIf="loading()">Pairing Device to Boutique...</span>
            </button>
          </ng-container>

          <!-- Authorized Staff Protected Floor Screen Notice -->
          <div class="kiosk-security-box">
            <span class="security-lock-icon">🔒</span>
            <span class="security-lock-text">Protected Terminal: Business revenue, settings, and leads are blocked on this floor display.</span>
          </div>
        </form>

        <!-- Link to Super Admin HQ -->
        <div class="hq-portal-redirect">
          <span class="hq-portal-label">Platform Master Operations:</span>
          <a routerLink="/hq-login" class="hq-link">👑 Super Admin Master HQ Login →</a>
        </div>

        <!-- Forgot Password Modal -->
        <div *ngIf="showForgotModal()" class="forgot-modal-backdrop" (click)="closeForgotModal()">
          <div class="forgot-modal-card" (click)="$event.stopPropagation()">
            <div class="forgot-modal-header">
              <h3>Reset Showroom Account Password</h3>
              <button type="button" class="btn-close-modal" (click)="closeForgotModal()">✕</button>
            </div>

            <div *ngIf="!forgotSubmitted()">
              <p class="forgot-modal-text">
                Enter your registered showroom email address or WhatsApp mobile number. We will dispatch a secure 6-digit verification code and reset link.
              </p>
              <form (submit)="submitForgot($event)">
                <div class="form-group">
                  <label>Registered Showroom Email or Mobile *</label>
                  <input
                    type="text"
                    name="forgotEmail"
                    [(ngModel)]="forgotEmail"
                    placeholder="e.g. manager@kumaransilks.com or +91 98765 43210"
                    class="form-input"
                    required
                  />
                </div>
                <div class="forgot-modal-actions">
                  <button type="button" class="btn-cancel-modal" (click)="closeForgotModal()">Cancel</button>
                  <button type="submit" class="btn-reset-submit" [disabled]="!forgotEmail.trim()">
                    Send Password Reset Link
                  </button>
                </div>
              </form>
            </div>

            <div *ngIf="forgotSubmitted()" class="forgot-success-box">
              <span class="success-check-icon">✨</span>
              <h4>Reset Instructions Dispatched!</h4>
              <p>
                A secure password reset link has been dispatched for <strong>{{ forgotEmail }}</strong>.
                If you do not see it within 2 minutes, contact Super Admin support at <strong>mohandass@nexooai.in</strong>.
              </p>
              <button type="button" class="btn-reset-submit" (click)="closeForgotModal()">Return to Sign In</button>
            </div>
          </div>
        </div>

        <div class="support-footer">
          <span>Protected by NeXooAi Multi-Tenant Engine</span>
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
      transition: background 0.3s ease, color 0.3s ease;
    }

    .login-container {
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
    }

    .login-header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .back-home-link {
      display: inline-block;
      color: var(--color-gold-light, #fbeea8);
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 600;
      transition: opacity 0.2s;
    }
    .back-home-link:hover {
      opacity: 0.8;
    }

    .btn-theme-pill {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      padding: 0.4rem 0.85rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-theme-pill:hover {
      background: rgba(255, 255, 255, 0.16);
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .brand-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%);
      border: 1px solid rgba(212, 175, 55, 0.4);
      margin-bottom: 1rem;
      box-shadow: 0 4px 15px rgba(212, 175, 55, 0.2);
    }

    .login-logo-img {
      object-fit: contain;
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

    .role-selector-bar {
      display: flex;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.05);
      padding: 0.35rem;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      margin: 1.25rem 0 0.5rem;
    }

    .role-select-tab {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      border: 1px solid transparent;
      background: transparent;
      color: #b5a4b7;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .role-select-tab:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.05);
    }

    .role-select-tab.active {
      background: rgba(212, 175, 55, 0.18);
      border-color: rgba(212, 175, 55, 0.4);
      color: #fbeea8;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }

    .role-select-tab.super-tab.active {
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.28) 0%, rgba(139, 92, 246, 0.25) 100%);
      border-color: #ffd700;
      color: #ffffff;
    }

    .role-select-tab.kiosk-tab.active {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(212, 175, 55, 0.2) 100%);
      border-color: #10b981;
      color: #a7f3d0;
    }

    .super-admin-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(139, 92, 246, 0.1) 100%);
      border: 1px solid rgba(212, 175, 55, 0.35);
      border-radius: 10px;
      padding: 0.85rem 1rem;
      margin-bottom: 1.35rem;
    }

    .banner-crown {
      font-size: 1.4rem;
      line-height: 1;
    }

    .banner-text strong {
      display: block;
      color: #ffd700;
      font-size: 0.88rem;
      margin-bottom: 0.2rem;
    }

    .banner-text p {
      margin: 0;
      color: #d1c2d4;
      font-size: 0.8rem;
      line-height: 1.35;
    }

    /* Light Theme Enhancements for Role Selector */
    .login-page-wrapper.light-theme .role-selector-bar {
      background: rgba(0, 0, 0, 0.04);
      border-color: rgba(0, 0, 0, 0.08);
    }

    .login-page-wrapper.light-theme .role-select-tab {
      color: #5d4a65;
    }

    .login-page-wrapper.light-theme .role-select-tab:hover {
      color: #1e1124;
      background: rgba(0, 0, 0, 0.03);
    }

    .login-page-wrapper.light-theme .role-select-tab.active {
      background: #ffffff;
      border-color: rgba(212, 175, 55, 0.45);
      color: #876d12;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .login-page-wrapper.light-theme .super-admin-banner {
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%);
      border-color: rgba(212, 175, 55, 0.4);
    }

    .login-page-wrapper.light-theme .banner-text strong {
      color: #876d12;
    }

    .login-page-wrapper.light-theme .banner-text p {
      color: #4f3f54;
    }

    .glass-panel {
      background: rgba(26, 11, 33, 0.65);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(212, 175, 55, 0.25);
      border-radius: 16px;
      padding: 2.25rem;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      transition: all 0.3s ease;
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
      padding: 0.85rem 1rem;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .autofill-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.35rem;
    }

    .autofill-title {
      font-size: 0.78rem;
      font-weight: 700;
      color: #d4af37;
    }

    .autofill-tag {
      font-size: 0.68rem;
      font-weight: 700;
      color: #ffd700;
      background: rgba(212, 175, 55, 0.15);
      border: 1px solid rgba(212, 175, 55, 0.3);
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }

    .autofill-caption {
      font-size: 0.76rem;
      color: #a494a8;
      margin: 0 0 0.65rem;
      line-height: 1.35;
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

    .kiosk-security-box {
      margin-top: 1.5rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      background: rgba(212, 175, 55, 0.08);
      border: 1px dashed rgba(212, 175, 55, 0.3);
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.8rem;
      color: #dfcfd4;
      line-height: 1.4;
    }

    .security-lock-icon {
      font-size: 1rem;
      flex-shrink: 0;
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

    /* =========================================================================
       LIGHT THEME STYLES (MATCHES HOMEPAGE LIGHT PREFERENCE)
       ========================================================================= */
    .login-page-wrapper.light-theme {
      background: radial-gradient(circle at 50% 10%, #faf8f5 0%, #f1ecf5 65%, #e8e0ee 100%);
      color: #1f1426;
    }

    .login-page-wrapper.light-theme .back-home-link {
      color: #7b5900;
    }

    .login-page-wrapper.light-theme .btn-theme-pill {
      background: rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(0, 0, 0, 0.15);
      color: #1f1426;
    }

    .login-page-wrapper.light-theme .brand-badge {
      background: #ffffff;
      border: 1px solid rgba(212, 175, 55, 0.5);
      box-shadow: 0 4px 15px rgba(212, 175, 55, 0.25);
    }

    .login-page-wrapper.light-theme .login-title {
      color: #1a0f23;
    }

    .login-page-wrapper.light-theme .login-subtitle {
      color: #635368;
    }

    .login-page-wrapper.light-theme .glass-panel {
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(212, 175, 55, 0.35);
      box-shadow: 0 20px 45px rgba(45, 10, 60, 0.08);
    }

    .login-page-wrapper.light-theme .form-group label {
      color: #2b1a34;
    }

    .login-page-wrapper.light-theme .forgot-link {
      color: #845d00;
    }

    .login-page-wrapper.light-theme .form-input {
      background: #ffffff;
      color: #1a0f23;
      border: 1px solid #d8cedc;
    }

    .login-page-wrapper.light-theme .form-input:focus {
      border-color: #d4af37;
      box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.25);
    }

    .login-page-wrapper.light-theme .input-hint {
      color: #7a6a80;
    }

    .login-page-wrapper.light-theme .input-hint code {
      background: #e9e2ed;
      color: #4a2c5a;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
    }

    .login-page-wrapper.light-theme .demo-autofill-box {
      background: #fcf9ee;
      border: 1px solid #e8deb8;
    }

    .login-page-wrapper.light-theme .autofill-title {
      color: #7b5900;
    }

    .login-page-wrapper.light-theme .chip-btn {
      background: #fff;
      border-color: #d4af37;
      color: #7b5900;
    }

    .login-page-wrapper.light-theme .chip-btn.super-chip {
      background: #fff0f6;
      border-color: #ff177d;
      color: #c40c5c;
    }

    .login-page-wrapper.light-theme .kiosk-security-box {
      background: #fbf7ec;
      border-color: #dfcd97;
      color: #5e4813;
    }

    .login-page-wrapper.light-theme .support-footer {
      color: #7a6a80;
    }

    .login-page-wrapper.light-theme .support-footer a {
      color: #7b5900;
    }

    /* FORGOT PASSWORD MODAL */
    .forgot-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .forgot-modal-card {
      width: 100%;
      max-width: 460px;
      background: #14091a;
      border: 1px solid rgba(212, 175, 55, 0.35);
      border-radius: 16px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.75);
      padding: 2rem;
      color: #ffffff;
      animation: modalFadeIn 0.25s ease-out;
    }

    .login-page-wrapper.light-theme .forgot-modal-card {
      background: #ffffff;
      color: #1a0f23;
      border-color: rgba(212, 175, 55, 0.4);
      box-shadow: 0 25px 60px rgba(45, 10, 60, 0.15);
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .forgot-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .forgot-modal-header h3 {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
      color: #fbeea8;
    }

    .login-page-wrapper.light-theme .forgot-modal-header h3 {
      color: #6d4e00;
    }

    .btn-close-modal {
      background: transparent;
      border: none;
      color: #a494a8;
      font-size: 1.2rem;
      cursor: pointer;
    }

    .forgot-modal-text {
      font-size: 0.88rem;
      color: #c9bed0;
      line-height: 1.5;
      margin: 0 0 1.25rem;
    }

    .login-page-wrapper.light-theme .forgot-modal-text {
      color: #5d4e62;
    }

    .forgot-modal-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    .btn-cancel-modal {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #c9bed0;
      padding: 0.65rem 1.2rem;
      border-radius: 6px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-reset-submit {
      background: linear-gradient(135deg, #d4af37 0%, #aa8420 100%);
      color: #120715;
      border: none;
      padding: 0.65rem 1.4rem;
      border-radius: 6px;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
    }

    .btn-reset-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .forgot-success-box {
      text-align: center;
      padding: 1rem 0;
    }

    .success-check-icon {
      font-size: 2.5rem;
      display: inline-block;
      margin-bottom: 0.5rem;
    }

    .forgot-success-box h4 {
      font-size: 1.25rem;
      color: #fbeea8;
      margin: 0 0 0.5rem;
    }

    .login-page-wrapper.light-theme .forgot-success-box h4 {
      color: #6d4e00;
    }

    .forgot-success-box p {
      font-size: 0.88rem;
      color: #c9bed0;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }

    .login-page-wrapper.light-theme .forgot-success-box p {
      color: #5d4e62;
    }

    @media (max-width: 600px) {
      .login-page-wrapper {
        padding: 1.25rem 0.75rem !important;
      }
      .login-container {
        max-width: 100% !important;
      }
      .glass-panel {
        padding: 1.35rem 1rem !important;
        border-radius: 14px !important;
      }
      .role-selector-bar {
        gap: 0.25rem !important;
      }
      .role-select-tab {
        padding: 0.6rem 0.45rem !important;
        font-size: 0.8rem !important;
      }
      .form-input {
        padding: 0.75rem 0.85rem !important;
        font-size: 0.95rem !important;
      }
      .btn-submit-login {
        padding: 0.85rem 1rem !important;
        font-size: 0.95rem !important;
      }
    }

    .kiosk-lock-alert {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      border-radius: 14px;
      background: rgba(239, 68, 68, 0.15);
      border: 1.5px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      margin-bottom: 18px;
    }
    .kiosk-lock-alert .alert-icon {
      font-size: 1.8rem;
    }
    .kiosk-lock-alert strong {
      display: block;
      font-size: 0.95rem;
      margin-bottom: 2px;
      color: #fee2e2;
    }
    .kiosk-lock-alert p {
      font-size: 0.85rem;
      margin: 0;
      opacity: 0.92;
      line-height: 1.4;
    }
    .credentials-guide-box {
      padding: 14px 18px;
      border-radius: 14px;
      background: rgba(212, 175, 55, 0.08);
      border: 1px solid rgba(212, 175, 55, 0.3);
      margin-bottom: 20px;
    }
    .guide-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .guide-pill {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #ffd700;
      background: rgba(212, 175, 55, 0.2);
      padding: 3px 8px;
      border-radius: 6px;
    }
    .guide-role-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: #ffd700;
    }
    .guide-desc {
      font-size: 0.8rem;
      color: var(--color-text-secondary, #b3a5b8);
      line-height: 1.35;
      margin-bottom: 10px;
    }
    .guide-params-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .param-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(212, 175, 55, 0.25);
      border-radius: 8px;
      padding: 4px 10px;
      font-size: 0.78rem;
    }
    .param-key {
      color: #b3a5b8;
    }
    .param-val {
      color: #ffd700;
      font-family: monospace;
    }
    .login-page-wrapper.light-theme .kiosk-lock-alert {
      background: #fee2e2;
      border-color: #f87171;
      color: #991b1b;
    }
    .login-page-wrapper.light-theme .kiosk-lock-alert strong {
      color: #7f1d1d;
    }
    .login-page-wrapper.light-theme .credentials-guide-box {
      background: #fffdf5;
      border-color: rgba(184, 134, 11, 0.4);
    }
    .login-page-wrapper.light-theme .guide-pill {
      color: #7a5806;
      background: rgba(212, 175, 55, 0.22);
    }
    .login-page-wrapper.light-theme .guide-role-title {
      color: #5a0e24;
    }
    .login-page-wrapper.light-theme .guide-desc {
      color: #5c475b;
    }
    .login-page-wrapper.light-theme .param-badge {
      background: #fff;
      border-color: rgba(184, 134, 11, 0.3);
    }
    .password-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .password-input-wrapper .password-input {
      padding-right: 2.75rem;
    }
    .btn-eye-toggle-login {
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
    .btn-eye-toggle-login:hover {
      transform: scale(1.15);
    }
    .hq-portal-redirect {
      margin-top: 1.25rem;
      padding: 0.85rem 1rem;
      border-radius: 12px;
      background: rgba(212, 175, 55, 0.08);
      border: 1px solid rgba(212, 175, 55, 0.25);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .hq-portal-label {
      font-size: 0.8rem;
      color: #cbb4cf;
    }
    .hq-link {
      font-size: 0.84rem;
      font-weight: 700;
      color: #ffd700;
      text-decoration: none;
      white-space: nowrap;
    }
    .hq-link:hover {
      text-decoration: underline;
    }
    .paired-kiosk-badge-card {
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.16) 0%, rgba(16, 185, 129, 0.1) 100%);
      border: 1px solid rgba(212, 175, 55, 0.45);
      border-radius: 12px;
      padding: 0.95rem 1.15rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .paired-store-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .paired-icon {
      font-size: 1.5rem;
    }
    .paired-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .paired-name {
      font-size: 1rem;
      color: #ffd700;
      font-weight: 700;
    }
    .paired-sub {
      font-size: 0.78rem;
      color: #cbd5e1;
    }
    .paired-status-dot {
      font-size: 0.72rem;
      color: #10b981;
      font-weight: 700;
      letter-spacing: 0.05em;
      background: rgba(16, 185, 129, 0.15);
      padding: 0.2rem 0.55rem;
      border-radius: 12px;
      border: 1px solid rgba(16, 185, 129, 0.3);
      white-space: nowrap;
    }
    .text-center-pin {
      text-align: center;
      font-size: 1.25rem;
      letter-spacing: 0.35em;
      font-weight: 700;
    }
    .btn-kiosk-unlock {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
      border-color: #34d399 !important;
      color: #ffffff !important;
    }
    .btn-kiosk-unlock:hover {
      background: linear-gradient(135deg, #34d399 0%, #10b981 100%) !important;
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4) !important;
    }
    .btn-kiosk-pair {
      background: linear-gradient(135deg, #d4af37 0%, #b89628 100%) !important;
      border-color: #ffd700 !important;
      color: #1a0820 !important;
    }
    .unpair-action-row {
      text-align: center;
      margin-top: 0.85rem;
    }
    .btn-link-unpair {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 0.78rem;
      cursor: pointer;
      text-decoration: underline;
      transition: color 0.2s;
    }
    .btn-link-unpair:hover {
      color: #fca5a5;
    }
    .pair-guide-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      background: rgba(212, 175, 55, 0.12);
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 10px;
      padding: 0.85rem 1rem;
      margin-bottom: 1.25rem;
    }
    .pair-guide-icon {
      font-size: 1.35rem;
      line-height: 1;
    }
    .pair-guide-text strong {
      display: block;
      color: #ffd700;
      font-size: 0.86rem;
      margin-bottom: 0.2rem;
    }
    .pair-guide-text p {
      margin: 0;
      color: #d1c2d4;
      font-size: 0.8rem;
      line-height: 1.35;
    }
    .login-page-wrapper.light-theme .param-key {
      color: #5c475b;
    }
    .login-page-wrapper.light-theme .param-val {
      color: #7a5806;
    }
  `],
})
export class LoginComponent implements OnInit {
  private readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  selectedRole = signal<'store_manager' | 'kiosk_terminal'>('store_manager');
  email = '';
  password = '';
  loading = signal<boolean>(false);
  isDarkMode = signal<boolean>(true);
  showPassword = signal<boolean>(false);

  // Hardware Kiosk Pairing State
  isDevicePaired = signal<boolean>(false);
  pairedStoreId = signal<string>('');
  pairedStoreName = signal<string>('');
  pairedKioskCode = signal<string>('KIOSK-01');
  kioskPinInput = '';
  pairShopIdent = '';
  pairSecret = '';

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  setLoginRole(role: 'store_manager' | 'kiosk_terminal'): void {
    this.selectedRole.set(role);
    this.email = '';
    this.password = '';
    this.kioskPinInput = '';
    this.pairSecret = '';
  }

  unpairDevice(): void {
    localStorage.removeItem('nexooai_paired_store_id');
    localStorage.removeItem('nexooai_paired_store_name');
    localStorage.removeItem('nexooai_paired_kiosk_id');
    this.pairedStoreId.set('');
    this.pairedStoreName.set('');
    this.pairedKioskCode.set('KIOSK-01');
    this.isDevicePaired.set(false);
    this.kioskPinInput = '';
    this.notificationService.showToast('Device unbound. You can now pair this terminal with another showroom.', 'info');
  }

  // Forgot password state
  showForgotModal = signal<boolean>(false);
  forgotSubmitted = signal<boolean>(false);
  forgotEmail = '';

  ngOnInit(): void {
    // Check if hardware kiosk is already paired
    try {
      const pStore = localStorage.getItem('nexooai_paired_store_id');
      const pName = localStorage.getItem('nexooai_paired_store_name');
      const pCode = localStorage.getItem('nexooai_paired_kiosk_id') || 'KIOSK-01';
      if (pStore && pName) {
        this.pairedStoreId.set(pStore);
        this.pairedStoreName.set(pName);
        this.pairedKioskCode.set(pCode);
        this.isDevicePaired.set(true);
      }
    } catch {}

    const kioskLock = this.route.snapshot.queryParamMap.get('kioskLock');
    if (kioskLock === 'unauthorized' || kioskLock === 'token_required') {
      setTimeout(() => {
        this.notificationService.showWarning(
          '🔒 Kiosk Authorization Required: Enter your staff PIN to unlock this floor terminal.'
        );
      }, 350);
    }
    // Sync theme
    try {
      const savedTheme = localStorage.getItem('nexooai_public_theme');
      if (savedTheme) {
        this.isDarkMode.set(savedTheme === 'dark');
      }
    } catch {
      this.isDarkMode.set(true);
    }
  }

  toggleTheme(): void {
    this.isDarkMode.update((v) => !v);
    try {
      localStorage.setItem('nexooai_public_theme', this.isDarkMode() ? 'dark' : 'light');
    } catch {}
  }

  onSubmit(event: Event): void {
    event.preventDefault();

    // CASE 1: STORE MANAGER LOGIN
    if (this.selectedRole() === 'store_manager') {
      if (!this.email.trim() || !this.password) {
        this.notificationService.showError('Please enter your manager email and password.');
        return;
      }
      this.loading.set(true);
      const payload = {
        email: this.email.trim().toLowerCase(),
        password: this.password.trim(),
      };
      this.http.post<any>('/api/v1/auth/login', payload).subscribe({
        next: (res) => {
          this.loading.set(false);
          const token = res.token;
          const role = res.role || 'store_manager';
          const name = res.name || 'Store Manager';
          const shopId = res.shop_id || '';

          sessionStorage.setItem('nexooai_auth_token', token);
          sessionStorage.setItem('nexooai_user_role', role);
          sessionStorage.setItem('nexooai_user_name', name);
          if (shopId) sessionStorage.setItem('nexooai_shop_id', shopId);

          localStorage.setItem('nexooai_session_token', token);
          sessionStorage.setItem('nexooai_admin_token', token);
          localStorage.setItem('nexooai_token', token);
          localStorage.setItem('nexooai_active_tab', 'dashboard');

          this.notificationService.showSuccess(`Welcome back, ${name}!`);
          this.router.navigate(['/app/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          const detail =
            err?.error?.detail ||
            'தவறான மின்னஞ்சல் அல்லது கடவுச்சொல் (Invalid email or password).';
          this.notificationService.showError(detail);
        },
      });
      return;
    }

    // CASE 2: FLOOR KIOSK UNLOCK (ALREADY PAIRED)
    if (this.selectedRole() === 'kiosk_terminal' && this.isDevicePaired()) {
      if (!this.kioskPinInput.trim() || this.kioskPinInput.trim().length < 4) {
        this.notificationService.showError('Please enter your 4-digit staff PIN.');
        return;
      }
      this.loading.set(true);
      const payload = {
        shop_id: this.pairedStoreId(),
        pin: this.kioskPinInput.trim(),
        kiosk_code: this.pairedKioskCode() || 'KIOSK-01',
      };
      this.http.post<any>('/api/v1/auth/kiosk-unlock', payload).subscribe({
        next: (res) => {
          this.loading.set(false);
          const token = res.token;
          const role = 'kiosk_terminal';
          const shopId = res.shop_id || this.pairedStoreId();
          const kioskCode = res.kiosk_code || this.pairedKioskCode();
          const name = res.shop_name ? `${res.shop_name} Floor Kiosk` : 'Floor Kiosk Terminal';

          sessionStorage.setItem('nexooai_auth_token', token);
          sessionStorage.setItem('nexooai_user_role', role);
          sessionStorage.setItem('nexooai_user_name', name);
          sessionStorage.setItem('nexooai_shop_id', shopId);
          sessionStorage.setItem('nexooai_kiosk_code', kioskCode);

          localStorage.setItem('nexooai_session_token', token);
          localStorage.setItem('nexooai_token', token);

          this.notificationService.showSuccess(`Floor Kiosk Unlocked! Starting Virtual Saree Try-On.`);
          this.router.navigate(['/kiosk'], {
            queryParams: {
              terminal: kioskCode,
              store: shopId,
              name: res.shop_name || this.pairedStoreName(),
            },
          });
        },
        error: (err) => {
          this.loading.set(false);
          const detail =
            err?.error?.detail ||
            'தவறான 4-இலக்க பின் (Incorrect Staff PIN). Please try again.';
          this.notificationService.showError(detail);
        },
      });
      return;
    }

    // CASE 3: FLOOR KIOSK ONE-TIME PAIRING (FIRST TIME SETUP)
    if (this.selectedRole() === 'kiosk_terminal' && !this.isDevicePaired()) {
      if (!this.pairShopIdent.trim()) {
        this.notificationService.showError('Please enter your Showroom Name or Manager Email.');
        return;
      }
      if (!this.pairSecret.trim()) {
        this.notificationService.showError('Please enter your Staff PIN or Showroom Password.');
        return;
      }
      this.loading.set(true);
      const payload = {
        shop_identifier: this.pairShopIdent.trim(),
        pin_or_password: this.pairSecret.trim(),
        kiosk_code: 'KIOSK-01',
      };
      this.http.post<any>('/api/v1/auth/kiosk-pair', payload).subscribe({
        next: (res) => {
          this.loading.set(false);
          const token = res.token;
          const role = 'kiosk_terminal';
          const shopId = res.shop_id;
          const shopName = res.shop_name;
          const kioskCode = res.kiosk_code || 'KIOSK-01';

          // Permanently bind this physical screen in localStorage
          localStorage.setItem('nexooai_paired_store_id', shopId);
          localStorage.setItem('nexooai_paired_store_name', shopName);
          localStorage.setItem('nexooai_paired_kiosk_id', kioskCode);
          this.pairedStoreId.set(shopId);
          this.pairedStoreName.set(shopName);
          this.pairedKioskCode.set(kioskCode);
          this.isDevicePaired.set(true);

          sessionStorage.setItem('nexooai_auth_token', token);
          sessionStorage.setItem('nexooai_user_role', role);
          sessionStorage.setItem('nexooai_user_name', `${shopName} Floor Kiosk`);
          sessionStorage.setItem('nexooai_shop_id', shopId);
          sessionStorage.setItem('nexooai_kiosk_code', kioskCode);

          localStorage.setItem('nexooai_session_token', token);
          localStorage.setItem('nexooai_token', token);

          this.notificationService.showSuccess(`Terminal Successfully Bound to ${shopName}! Launching Try-On.`);
          this.router.navigate(['/kiosk'], {
            queryParams: {
              terminal: kioskCode,
              store: shopId,
              name: shopName,
            },
          });
        },
        error: (err) => {
          this.loading.set(false);
          const detail =
            err?.error?.detail ||
            'இணைப்பு தோல்வியடைந்தது (Failed to pair device). Please verify showroom credentials.';
          this.notificationService.showError(detail);
        },
      });
      return;
    }
  }

  onForgotClick(): void {
    this.forgotSubmitted.set(false);
    this.forgotEmail = this.email || '';
    this.showForgotModal.set(true);
  }

  closeForgotModal(): void {
    this.showForgotModal.set(false);
  }

  submitForgot(e: Event): void {
    e.preventDefault();
    if (!this.forgotEmail.trim()) return;

    this.forgotSubmitted.set(true);
    this.http.post<any>('/api/v1/auth/forgot-password', { email: this.forgotEmail.trim() }).subscribe({
      next: (res) => {
        this.notificationService.showToast(
          res?.message || ('Password reset link sent to ' + this.forgotEmail),
          'success'
        );
      },
      error: (err) => {
        this.notificationService.showToast(
          err?.error?.detail || 'Unable to dispatch reset email. Please contact HQ Super Admin.',
          'warning'
        );
      }
    });
  }
}
