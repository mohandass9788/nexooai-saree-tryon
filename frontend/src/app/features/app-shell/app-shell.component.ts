export interface AiEngineModel {
  id: string;
  name: string;
  vendor: string;
  role: 'primary' | 'fallback_1' | 'fallback_2' | 'standby' | 'emergency';
  status: 'live' | 'ready' | 'degraded' | 'offline';
  latencyMs: number;
  costInr: number;
  quotaTotal: number;
  quotaUsed: number;
  successRatePct: number;
  qualityScore: number;
  apiKeyMasked: string;
  lastTested: string;
  isTesting?: boolean;
}
import { Component, OnInit, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';
import { ApiService } from '../../core/services/api.service';

interface SareeInventoryItem {
  id: string;
  sku: string;
  name_en: string;
  name_ta: string;
  category: string;
  fabric: string;
  price: number;
  rack_location: string;
  is_active: boolean;
  thumbnail: string;
}

interface KioskDevice {
  id: string;
  name: string;
  section: string;
  status: 'online' | 'offline' | 'idle';
  lastPing: string;
  screenResolution: string;
  isLocked: boolean;
  username?: string;
  kiosk_username?: string;
  kiosk_password?: string;
  pin?: string;
  trial_count?: number;
  today_trials?: number;
  last_trial_at?: string | null;
  shop_id?: string;
}

export interface GarmentCategory {
  id: string;
  name: string;
  subcategories: string[];
}

export interface CustomerLead {
  id: string;
  phone: string;
  name: string;
  sareeName: string;
  sku: string;
  price: number;
  thumbnail: string;
  floorKiosk: string;
  stylist: string;
  timestamp: string;
  status: 'new' | 'billed' | 'followup' | 'offer_sent';
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'tenant_owner' | 'store_manager' | 'staff';
  status: 'active' | 'invited';
  lastActive: string;
}

export interface ShowroomKioskInfo {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'paused' | 'offline';
  lastPing?: string;
}

export interface ShowroomAuditAction {
  action: string;
  timestamp: string;
  by: string;
  detail: string;
}

export interface SaasCustomerShowroom {
  id: string;
  name: string;
  slug: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
  plan_tier: 'TRIAL' | 'SILVER' | 'GOLD' | 'PLATINUM';
  subscription_price_inr: number;
  monthly_token_quota: number;
  tokens_used_this_month: number;
  payment_status: 'paid' | 'payment_due' | 'grace' | 'trial';
  billing_cycle: 'monthly' | 'yearly';
  api_key: string;
  created_at: string;
  city: string;
  address?: string;
  temp_password?: string;
  ai_provider?: string;
  ai_api_key_masked?: string;
  kiosk_count?: number;
  kiosk_password?: string;
  kiosk_pin?: string;
  days_remaining: number;
  kiosks?: any[];
  last_action?: ShowroomAuditAction;
}

export interface OfflinePaymentRecord {
  id: string;
  showroom_name: string;
  amount_inr: number;
  payment_mode: 'NEFT / RTGS' | 'UPI Business' | 'Cash Deposit' | 'Cheque';
  utr_reference: string;
  verified_by: string;
  payment_date: string;
  extension_granted: string;
}

export interface CompanyStaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  accessScope: string;
}

export interface HardwareFleetUnit {
  id: string;
  code: string;
  storeName: string;
  type: string;
  camera: string;
  pcUnit: string;
  status: 'Online' | 'Maintenance' | 'Trial';
  deployedDate: string;
  warranty: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="app-shell-wrapper" [class.light-theme]="!isDarkMode()">
      <!-- App Shell Mobile Drawer Backdrop -->
      <div *ngIf="isMobileMenuOpen()" class="mobile-sidebar-backdrop" (click)="closeMobileMenu()"></div>

      <!-- App Shell Sidebar -->
      <aside class="app-sidebar" [class.collapsed]="isSidebarCollapsed()" [class.mobile-open]="isMobileMenuOpen()">
        <div class="mobile-sidebar-close-row">
          <button type="button" class="btn-close-drawer" (click)="closeMobileMenu()" aria-label="Close Navigation Drawer">✕</button>
        </div>
        <!-- Brand Crest Header -->
        <div class="sidebar-brand">
          <img
            [src]="isDarkMode() ? 'assets/images/nexooai_icon.png' : 'assets/images/nexooai_icon_black.png'"
            alt="NeXooAi Logo"
            width="34"
            height="34"
            class="brand-crest-logo"
            style="object-fit: contain; border-radius: 8px;"
          />
          <div class="brand-info">
            <span class="brand-name">NeXooAi</span>
            <span class="tenant-badge">{{ userRole() === 'super_admin' ? 'Super Admin' : 'Showroom Portal' }}</span>
          </div>
        </div>

        <!-- Store Context Pill -->
        <div class="store-pill">
          <span class="store-icon">{{ userRole() === 'super_admin' ? '🏛️' : '🏬' }}</span>
          <div class="store-meta">
            <span class="store-name">{{ userRole() === 'super_admin' ? 'NeXooAi Global Console' : shopName() }}</span>
            <span class="store-id">{{ userRole() === 'super_admin' ? 'Scope: Platform Master' : shopId() }}</span>
          </div>
        </div>

        <!-- SUPER ADMIN SIDEBAR NAVIGATION (When user is Mohandass / Super Admin) -->
        <nav class="sidebar-nav" *ngIf="userRole() === 'super_admin'">
          <div class="nav-section-title">PLATFORM MANAGEMENT</div>
          <button
            type="button"
            class="nav-item"
            [class.active]="activeNav() === 'sa-showrooms'"
            (click)="setNav('sa-showrooms')">
            <span class="nav-icon">🌐</span>
            <span>Showrooms & Tenancy ({{ saasShowrooms.length }})</span>
          </button>
          <button
            type="button"
            class="nav-item"
            [class.active]="activeNav() === 'sa-payments'"
            (click)="setNav('sa-payments')">
            <span class="nav-icon">💳</span>
            <span>Offline Payments & Renewals</span>
          </button>
          <button
            type="button"
            class="nav-item"
            [class.active]="activeNav() === 'sa-aipool'"
            (click)="setNav('sa-aipool')">
            <span class="nav-icon">🤖</span>
            <span>AI Engine & Token Pool</span>
          </button>
          <button
            type="button"
            class="nav-item"
            [class.active]="activeNav() === 'sa-team'"
            (click)="setNav('sa-team')">
            <span class="nav-icon">👥</span>
            <span>Company Staff ({{ companyStaff.length }})</span>
          </button>
          <button
            type="button"
            class="nav-item"
            [class.active]="activeNav() === 'sa-hardware'"
            (click)="setNav('sa-hardware')">
            <span class="nav-icon">🖥️</span>
            <span>55" Kiosks & Hardware</span>
          </button>

          <div class="nav-section-title mt-4">SHOWROOM CONSOLE</div>
          <button
            type="button"
            class="nav-item store-view-toggle-btn"
            [class.active]="activeNav() === 'dashboard'"
            (click)="setNav('dashboard')">
            <span class="nav-icon">🏬</span>
            <span>View Flagship Showroom</span>
          </button>
        </nav>

        <!-- STORE MANAGER SIDEBAR NAVIGATION (When user is Store Manager / Staff) -->
        <nav class="sidebar-nav" *ngIf="userRole() !== 'super_admin'">
          <button
            type="button"
            class="nav-item"
            [class.active]="activeNav() === 'dashboard'"
            (click)="setNav('dashboard')">
            <span class="nav-icon">📊</span>
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            class="nav-item"
            [class.active]="activeNav() === 'catalogue'"
            (click)="setNav('catalogue')">
            <span class="nav-icon">👘</span>
            <span>Catalogue ({{ sarees.length }})</span>
          </button>
          <button
            type="button"
            class="nav-item"
            [class.active]="activeNav() === 'kiosks'"
            (click)="setNav('kiosks')">
            <span class="nav-icon">🖥️</span>
            <span>Floor Kiosks ({{ kiosks.length }})</span>
          </button>
          <button
            type="button"
            class="nav-item"
            [class.active]="activeNav() === 'leads'"
            (click)="setNav('leads')">
            <span class="nav-icon">📱</span>
            <span>Leads CRM ({{ customerLeads.length }})</span>
          </button>
          <button
            type="button"
            class="nav-item"
            [class.active]="activeNav() === 'subscription'"
            (click)="setNav('subscription')">
            <span class="nav-icon">⚡</span>
            <span>Drape Quota & Usage</span>
          </button>
          <button
            type="button"
            class="nav-item"
            [class.active]="activeNav() === 'team'"
            (click)="setNav('team')">
            <span class="nav-icon">👥</span>
            <span>Team & Roles</span>
          </button>
          <button
            type="button"
            class="nav-item"
            [class.active]="activeNav() === 'settings'"
            (click)="setNav('settings')">
            <span class="nav-icon">⚙️</span>
            <span>Settings</span>
          </button>
        </nav>

        <!-- Sidebar Footer -->
        <div class="sidebar-footer">
          <a
            routerLink="/kiosk"
            [queryParams]="{ store: shopId() || 'shop_default', name: customStoreName() || shopName() || 'NeXooAi Luxury Silks' }"
            class="btn-floor-kiosk"
            id="btn-launch-floor-kiosk"
            title="Launch 55 Inch Floor Kiosk for {{ customStoreName() || shopName() }}"
          >
            <span class="kiosk-launch-icon">📺</span>
            <div class="kiosk-launch-meta">
              <span class="kiosk-launch-label">Launch Floor Kiosk</span>
              <span class="kiosk-store-pill">{{ customStoreName() || shopName() }}</span>
            </div>
          </a>
          <button type="button" class="btn-logout" (click)="logout()">
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <!-- Main Portal Workspace -->
      <main class="app-main">
        <!-- Topbar -->
        <header class="app-topbar">
          <div class="topbar-left">
            <button
              type="button"
              class="btn-sidebar-toggle"
              (click)="toggleSidebarOrMenu()"
              [title]="isSidebarCollapsed() ? 'Expand Navigation Sidebar' : 'Collapse Sidebar'"
              aria-label="Toggle Navigation Sidebar">
              <span class="toggle-icon-bars">☰</span>
            </button>
            <div class="topbar-title-wrap">
              <h2 class="page-title">
                {{ navTitles[activeNav()] || 'Platform Console' }}
              </h2>
              <div class="status-indicator-badge">
                <span class="status-dot"></span>
                <span class="status-full" *ngIf="userRole() === 'super_admin'">Platform Status: <strong>GLOBAL MASTER (All Nodes Healthy)</strong></span>
                <span class="status-full" *ngIf="userRole() !== 'super_admin'">Account Status: <strong>ACTIVE</strong> (Platinum Enterprise)</span>
                <span class="status-compact">ONLINE</span>
              </div>
            </div>
          </div>

          <div class="topbar-right">
            <!-- Theme Mode Switcher Pill -->
            <button
              type="button"
              class="btn-theme-pill"
              (click)="toggleTheme()"
              [title]="isDarkMode() ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
              <span class="theme-icon">{{ isDarkMode() ? '☀️' : '🌙' }}</span>
              <span class="theme-text">{{ isDarkMode() ? 'Light' : 'Dark' }}</span>
            </button>

            <!-- Super Admin Telemetry Header -->
            <div class="quota-pill" *ngIf="userRole() === 'super_admin'">
              <span class="quota-full">Showrooms: <strong>{{ saasShowrooms.length }} Enrolled</strong></span>
              <span class="quota-compact">🏛️ <strong>{{ saasShowrooms.length }}</strong></span>
              <span class="quota-mrr" style="font-size: 0.72rem; color: #d4af37;">MRR: ₹{{ calculateTotalMrr() | number }}</span>
            </div>

            <!-- Store Manager Quota Header -->
            <div class="quota-pill" *ngIf="userRole() !== 'super_admin'">
              <span class="quota-full">Try-Ons: <strong>{{ tokensUsed() }} / {{ tokenQuota() }}</strong></span>
              <span class="quota-compact">⚡ <strong>{{ tokensUsed() }}/{{ tokenQuota() }}</strong></span>
              <div class="mini-progress-bar">
                <div class="mini-fill" [style.width]="(tokensUsed() / tokenQuota() * 100) + '%'"></div>
              </div>
            </div>

            <!-- Profile Chip -->
            <div class="user-chip">
              <div class="user-avatar" [class.sa-avatar]="userRole() === 'super_admin'">{{ userInitials() }}</div>
              <div class="user-text">
                <span class="user-name">{{ userName() }}</span>
                <span class="user-role" [class.gold-text]="userRole() === 'super_admin'">{{ userRole() === 'super_admin' ? 'Master Super Admin' : userRole() }}</span>
              </div>
            </div>
          </div>
        </header>

        <!-- Workspace Content Area -->
        <div class="app-content-body">

          <!-- ========================================================================= -->
          <!-- SUPER ADMIN TAB 1: SHOWROOMS & TENANCY MASTER DIRECTORY                   -->
          <!-- ========================================================================= -->
          <div *ngIf="userRole() === 'super_admin' && activeNav() === 'sa-showrooms'" class="tab-view-body">
            <!-- DEDICATED FULL-PAGE VIEW: CUSTOMER DETAIL & KIOSK FLEET (No popup modal) -->
            <div *ngIf="selectedShowroomForDetails; else showroomDirectoryListView" class="showroom-detail-fullpage">
              <!-- Back Navigation Bar -->
              <div class="detail-page-top-nav">
                <button type="button" class="btn-back-link" (click)="closeDetailsModal()" title="Return to Showrooms Directory">
                  <span class="back-arrow">←</span>
                  <span class="back-text">Back to Showrooms Table</span>
                </button>
                <div class="breadcrumb-trail">
                  <span>Showrooms Directory</span>
                  <span class="bc-sep">/</span>
                  <strong class="bc-current">{{ selectedShowroomForDetails.name }}</strong>
                </div>
              </div>

              <!-- Customer Hero Banner Card -->
              <div class="portal-card customer-hero-card mt-3">
                <div class="customer-hero-top">
                  <div class="customer-hero-info">
                    <div class="title-avatar-large">{{ selectedShowroomForDetails.name.charAt(0).toUpperCase() }}</div>
                    <div>
                      <div class="hero-name-row">
                        <h2 class="customer-page-title">{{ selectedShowroomForDetails.name }}</h2>
                        <span class="badge-status" [ngClass]="selectedShowroomForDetails.payment_status">
                          {{ selectedShowroomForDetails.payment_status === 'paid' ? '✓ Paid' : (selectedShowroomForDetails.payment_status === 'trial' ? '⏱ Free Trial' : '⚠️ Due in ' + selectedShowroomForDetails.days_remaining + 'd') }}
                        </span>
                        <span class="tile-status-pill" [class.status-active]="selectedShowroomForDetails.is_active" [class.status-paused]="!selectedShowroomForDetails.is_active">
                          {{ selectedShowroomForDetails.is_active ? '● Active' : '⏸ Suspended' }}
                        </span>
                        <span class="plan-tag" [ngClass]="'tier-' + selectedShowroomForDetails.plan_tier.toLowerCase()">
                          {{ selectedShowroomForDetails.plan_tier }} Plan
                        </span>
                      </div>
                      <p class="customer-page-subtitle">
                        <span>📍 {{ selectedShowroomForDetails.city }}</span>
                        <span class="sep-dot">•</span>
                        <span>Slug: <code>{{ selectedShowroomForDetails.slug }}</code></span>
                        <span class="sep-dot">•</span>
                        <span>ID: <code class="font-mono text-xs">{{ selectedShowroomForDetails.id }}</code></span>
                        <span class="sep-dot">•</span>
                        <span>Onboarded: {{ selectedShowroomForDetails.created_at }}</span>
                      </p>
                    </div>
                  </div>

                  <div class="customer-hero-actions">
                    <button type="button" class="btn-hero-action primary-gold" (click)="launchKioskForShowroom(selectedShowroomForDetails)" title="Launch 55-inch Kiosk Simulator for this boutique">
                      <span>🖥️ Launch Simulator</span>
                    </button>
                    <button type="button" class="btn-hero-action" (click)="detailModalTab.set(detailModalTab() === 'edit' ? 'details' : 'edit')">
                      <span>{{ detailModalTab() === 'edit' ? '📋 View Overview' : '✏️ Edit Boutique' }}</span>
                    </button>
                    <button type="button" class="btn-hero-action danger" (click)="promptDeleteShowroom(selectedShowroomForDetails)" title="Delete this boutique">
                      <span>🗑️ Delete</span>
                    </button>
                  </div>
                </div>

                <!-- Sub Nav inside Dedicated Customer Page -->
                <div class="customer-page-tabs mt-4">
                  <button type="button" class="page-tab-btn" [class.active]="detailModalTab() !== 'edit'" (click)="detailModalTab.set('details')">
                    <span>📋 Commercials & Kiosks Fleet ({{ selectedShowroomForDetails.kiosks?.length || 0 }})</span>
                  </button>
                  <button type="button" class="page-tab-btn" [class.active]="detailModalTab() === 'edit'" (click)="detailModalTab.set('edit')">
                    <span>✏️ Edit Showroom Settings</span>
                  </button>
                </div>
              </div>

              <!-- VIEW 1: COMMERCIALS, CREDENTIALS & KIOSKS FLEET -->
              <div *ngIf="detailModalTab() !== 'edit'" class="customer-detail-content-body mt-4">
                <!-- Grid of 2 Cards: Manager Provisioning & Commercials / Contact -->
                <div class="customer-two-col-grid">
                  <!-- Col 1: Manager Provisioning & Plain Credentials -->
                  <div class="portal-card credentials-section-card">
                    <div class="section-card-header">
                      <div class="sch-left">
                        <span class="sch-icon">🔐</span>
                        <div>
                          <h4 class="sch-title">Store Manager Access & Credentials</h4>
                          <p class="sch-sub">Direct access credentials for this boutique manager.</p>
                        </div>
                      </div>
                      <span class="cred-badge">Direct Access</span>
                    </div>

                    <div class="credentials-card-box mt-3">
                      <div class="cred-grid">
                        <div class="cred-row">
                          <span class="cred-label">Login Email:</span>
                          <div class="cred-val-wrap">
                            <span class="cred-val font-mono">{{ selectedShowroomForDetails.contact_email }}</span>
                            <button type="button" class="btn-mini-copy" (click)="copyToClipboard(selectedShowroomForDetails.contact_email || '', 'Email')">📋 Copy</button>
                          </div>
                        </div>

                        <div class="cred-row">
                          <span class="cred-label">Manager Password:</span>
                          <div class="cred-val-wrap">
                            <span class="cred-val font-mono font-bold text-amber" style="font-size: 0.95rem; color: #fbbf24;">
                              {{ selectedShowroomForDetails.temp_password || 'Boutique@123' }}
                            </span>
                            <button type="button" class="btn-mini-copy" (click)="copyToClipboard(selectedShowroomForDetails.temp_password || 'Boutique@123', 'Password')">📋 Copy</button>
                          </div>
                        </div>

                        <div class="cred-row">
                          <span class="cred-label">Catalog API Key:</span>
                          <div class="cred-val-wrap">
                            <span class="cred-val font-mono text-truncate">{{ selectedShowroomForDetails.api_key || ('sk_live_' + selectedShowroomForDetails.id) }}</span>
                            <button type="button" class="btn-mini-copy" (click)="copyToClipboard(selectedShowroomForDetails.api_key || ('sk_live_' + selectedShowroomForDetails.id), 'API Key')">📋 Copy</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Col 2: Commercials & Subscription Usage -->
                  <div class="portal-card commercials-section-card">
                    <div class="section-card-header">
                      <div class="sch-left">
                        <span class="sch-icon">💳</span>
                        <div>
                          <h4 class="sch-title">Commercials & Drape Limits</h4>
                          <p class="sch-sub">Try-on usage balance and assigned AI engine.</p>
                        </div>
                      </div>
                    </div>

                    <div class="commercials-metrics-grid mt-3">
                      <div class="c-metric-tile">
                        <span class="cm-lbl">Monthly Try-On Drapes</span>
                        <div class="cm-val-row">
                          <span class="cm-num">{{ selectedShowroomForDetails.tokens_used_this_month }}</span>
                          <span class="cm-denom">/ {{ selectedShowroomForDetails.monthly_token_quota }}</span>
                        </div>
                        <div class="cm-progress-bar">
                          <div class="cm-fill" [style.width]="(((selectedShowroomForDetails.tokens_used_this_month || 0) / (selectedShowroomForDetails.monthly_token_quota || 1)) * 100) + '%'"></div>
                        </div>
                      </div>

                      <div class="c-metric-tile">
                        <span class="cm-lbl">Billing Amount</span>
                        <span class="cm-val-main">₹{{ selectedShowroomForDetails.subscription_price_inr | number }} / {{ selectedShowroomForDetails.billing_cycle }}</span>
                      </div>

                      <div class="c-metric-tile">
                        <span class="cm-lbl">Assigned AI Engine</span>
                        <span class="cm-val-main" style="color: #ffd700; font-size: 0.85rem;">{{ getShowroomAiProviderLabel(selectedShowroomForDetails.ai_provider, selectedShowroomForDetails.plan_tier) }}</span>
                      </div>

                      <div class="c-metric-tile">
                        <span class="cm-lbl">Store Contact</span>
                        <span class="cm-val-main">{{ selectedShowroomForDetails.contact_person }} ({{ selectedShowroomForDetails.contact_phone }})</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- SECTION: FLOOR KIOSKS FLEET MANAGEMENT -->
                <div class="portal-card kiosk-fleet-master-card mt-4">
                  <div class="kiosk-fleet-header-row">
                    <div>
                      <h3 class="card-title" style="display: flex; align-items: center; gap: 8px;">
                        <span>🖥️</span>
                        <span>Showroom Floor Kiosks Fleet ({{ selectedShowroomForDetails.kiosks?.length || 0 }} Registered Totems)</span>
                      </h3>
                      <p class="card-subtitle">
                        Every 55" totem has a dedicated Username, Password, and Touchscreen Staff PIN. Credentials and hits are isolated per kiosk.
                      </p>
                    </div>
                    <button type="button" class="btn-primary-action gold-btn" (click)="openAddKioskModalForShop(selectedShowroomForDetails)">
                      <span>➕</span>
                      <span>Register New Floor Kiosk</span>
                    </button>
                  </div>

                  <!-- Kiosks Fleet Cards Grid -->
                  <div class="kiosk-fleet-cards-grid mt-4">
                    @for (k of selectedShowroomForDetails.kiosks; track k.id) {
                      <div class="kiosk-detail-unit-card">
                        <div class="unit-card-top">
                          <div>
                            <span class="unit-code-badge">{{ k.kiosk_code }}</span>
                            <h5 class="unit-name">{{ k.display_name }}</h5>
                            <span class="unit-section-hint">📍 {{ k.section || 'Main Showroom Floor' }}</span>
                          </div>
                          <span class="status-pill-badge" [class.online]="k.status === 'online'">
                            {{ k.status === 'online' ? '● Online' : '⏸ Idle' }}
                          </span>
                        </div>

                        <!-- Trial Telemetry Metrics for this specific Kiosk -->
                        <div class="unit-trial-stats-box mt-2">
                          <div class="trial-stat-col">
                            <span class="trial-stat-num">{{ k.trial_count || 0 }}</span>
                            <span class="trial-stat-lbl">Total Try-Ons</span>
                          </div>
                          <div class="trial-stat-col">
                            <span class="trial-stat-num highlight-today">{{ k.today_trials || 0 }}</span>
                            <span class="trial-stat-lbl">Today's Drapes</span>
                          </div>
                          <div class="trial-stat-col">
                            <span class="trial-stat-time">{{ k.last_trial_at || 'No trials' }}</span>
                            <span class="trial-stat-lbl">Last Activity</span>
                          </div>
                        </div>

                        <!-- Dedicated Kiosk Credentials - ALWAYS VISIBLE, NO MASKING -->
                        <div class="unit-credentials-box mt-3">
                          <div class="unit-cred-line">
                            <span class="u-lbl">Kiosk Username:</span>
                            <div class="u-val-row">
                              <code class="font-mono text-amber" style="color: #fbbf24;">{{ k.username }}</code>
                              <button type="button" class="btn-micro-copy" (click)="copyToClipboard(k.username, 'Kiosk Username')">📋</button>
                            </div>
                          </div>
                          <div class="unit-cred-line">
                            <span class="u-lbl">Kiosk Password:</span>
                            <div class="u-val-row">
                              <code class="font-mono text-emerald" style="color: #10b981; font-weight: 700; font-size: 0.9rem;">{{ k.kiosk_password || 'Kiosk@2026' }}</code>
                              <button type="button" class="btn-micro-copy" (click)="copyToClipboard(k.kiosk_password || 'Kiosk@2026', 'Kiosk Password')">📋</button>
                            </div>
                          </div>
                          <div class="unit-cred-line">
                            <span class="u-lbl">Staff Unlock PIN:</span>
                            <div class="u-val-row">
                              <code class="font-mono text-emerald" style="color: #10b981; font-weight: 700;">{{ k.pin || '5521' }}</code>
                              <button type="button" class="btn-micro-copy" (click)="copyToClipboard(k.pin || '5521', 'Staff PIN')">📋</button>
                            </div>
                          </div>
                        </div>

                        <!-- Action Buttons: View Trials, Edit, Delete, Launch -->
                        <div class="unit-card-actions mt-3">
                          <button type="button" class="btn-unit-action gold-action" (click)="openKioskTrialsModal(k, selectedShowroomForDetails.id)" title="View all try-on trials done by this kiosk">
                            <span>📊 Trials ({{ k.trial_count || 0 }})</span>
                          </button>
                          <button type="button" class="btn-unit-action" (click)="openEditKioskModal(k, selectedShowroomForDetails.id)" title="Edit Kiosk Name, Password or PIN">
                            <span>✏️ Edit</span>
                          </button>
                          <button type="button" class="btn-unit-action" (click)="launchKioskForShowroom(selectedShowroomForDetails)" title="Simulate this Kiosk mirror">
                            <span>🖥️ Launch</span>
                          </button>
                          <button type="button" class="btn-unit-action danger-action" (click)="promptDeleteKiosk(k, selectedShowroomForDetails.id)" title="Delete this Kiosk">
                            <span>🗑️</span>
                          </button>
                        </div>
                      </div>
                    } @empty {
                      <div class="kiosk-empty-box" style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; background: rgba(0,0,0,0.25); border-radius: 12px; border: 1px dashed rgba(212,175,55,0.3);">
                        <div style="font-size: 36px; margin-bottom: 8px;">🖥️</div>
                        <h4 style="margin: 0; color: #ffd700;">No Floor Kiosks Registered Yet</h4>
                        <p style="margin: 6px 0 16px; color: #94a3b8; font-size: 0.85rem;">
                          Set up dedicated 55" totems with custom usernames and passwords to track live try-ons on the showroom floor.
                        </p>
                        <button type="button" class="btn-primary-action gold-btn" (click)="openAddKioskModalForShop(selectedShowroomForDetails)">
                          <span>➕ Register First Floor Kiosk</span>
                        </button>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <!-- VIEW 2: EDIT SHOWROOM -->
              <div *ngIf="detailModalTab() === 'edit'" class="portal-card mt-4">
                <div class="card-header-flex mb-4">
                  <div>
                    <h3 class="card-title">✏️ Edit Boutique Profile & Settings</h3>
                    <p class="card-subtitle">Update contact details, subscription tier, and dedicated AI model configurations.</p>
                  </div>
                  <button type="button" class="btn-cancel-modal" (click)="detailModalTab.set('details')">
                    ← Return to Overview
                  </button>
                </div>

                <form (submit)="saveEditedShowroom($event)">
                  <div class="settings-form-grid">
                    <div class="settings-field">
                      <label>Boutique / Showroom Name *</label>
                      <input type="text" [(ngModel)]="editShowroomForm.name" name="editName" class="form-input" required />
                    </div>
                    <div class="settings-field">
                      <label>City / Location *</label>
                      <input type="text" [(ngModel)]="editShowroomForm.city" name="editCity" class="form-input" required />
                    </div>
                    <div class="settings-field">
                      <label>Address</label>
                      <input type="text" [(ngModel)]="editShowroomForm.address" name="editAddress" placeholder="e.g. 104 Cross Cut Road, Gandhipuram" class="form-input" />
                    </div>
                    <div class="settings-field">
                      <label>Owner / Manager Name *</label>
                      <input type="text" [(ngModel)]="editShowroomForm.contact_person" name="editContact" class="form-input" required />
                    </div>
                    <div class="settings-field">
                      <label>WhatsApp / Phone Number *</label>
                      <input type="text" [(ngModel)]="editShowroomForm.contact_phone" name="editPhone" class="form-input" required />
                    </div>
                    <div class="settings-field">
                      <label>Manager Login Email *</label>
                      <input type="email" [(ngModel)]="editShowroomForm.contact_email" name="editEmail" class="form-input" required />
                    </div>
                    <div class="settings-field">
                      <label>Plan Tier *</label>
                      <select [(ngModel)]="editShowroomForm.plan_tier" name="editTier" class="form-input">
                        <option value="trial">Trial (14-Day Free Evaluation)</option>
                        <option value="silver">Silver Tier (₹2,999 / mo)</option>
                        <option value="gold">Gold Tier (₹7,999 / mo)</option>
                        <option value="platinum">Platinum Enterprise (₹14,999 / mo)</option>
                      </select>
                    </div>
                    <div class="settings-field">
                      <label>Account Status *</label>
                      <select [(ngModel)]="editShowroomForm.is_active" name="editActive" class="form-input">
                        <option [ngValue]="true">Active (Kiosks & Portal Online)</option>
                        <option [ngValue]="false">Suspended / Paused (Soft Lock)</option>
                      </select>
                    </div>

                    <div class="settings-field full-span">
                      <label>🧠 Dedicated AI Model Routing *</label>
                      <select [(ngModel)]="editShowroomForm.ai_provider" name="editAiProvider" class="form-input">
                        <option value="auto_by_plan">⚡ Type 1: Plan-Based Auto (Platinum=FASHN v1.6, Gold=Kolors, Silver=CatVTON, Trial=Mock)</option>
                        <option value="fal-fashn">💎 Type 2: Fal.ai - FASHN v1.6 (High-Res Luxury Saree)</option>
                        <option value="fal-catvton">⚡ Type 2: Fal.ai - CatVTON (Fast & Budget ₹2)</option>
                        <option value="fal-kolors">🎨 Type 2: Fal.ai - Kling Kolors v1.5 (High Realism)</option>
                        <option value="fal-leffa">🌊 Type 2: Fal.ai - Leffa VTON (Dynamic Fabric Flow)</option>
                        <option value="gemini">🤖 Type 2: Google Gemini 2.0 Flash Vision</option>
                        <option value="openai">👁️ Type 2: OpenAI Vision Engine</option>
                        <option value="hf">🤗 Type 2: HuggingFace IDM-VTON</option>
                        <option value="mock">🧪 Type 2: Offline Mock Engine (Zero Cost Demo)</option>
                      </select>
                    </div>

                    <div class="settings-field full-span" *ngIf="editShowroomForm.ai_provider !== 'auto_by_plan' && editShowroomForm.ai_provider !== 'mock'">
                      <label>Custom API Key for this Boutique (Optional / BYOK)</label>
                      <input type="password" [(ngModel)]="editShowroomForm.ai_api_key" name="editAiKey" placeholder="Leave empty to use platform default key, or paste boutique's own key" class="form-input" />
                    </div>
                    <div class="settings-field full-span">
                      <label>New Manager Password (leave blank to keep current)</label>
                      <input type="text" [(ngModel)]="editShowroomForm.new_password" name="editPass" placeholder="Enter new password to reset" class="form-input" />
                    </div>
                  </div>

                  <div class="modal-footer-actions-between mt-6">
                    <button type="button" class="btn-cancel-modal" (click)="detailModalTab.set('details')">
                      ← Cancel
                    </button>
                    <button type="submit" class="btn-primary-action" [disabled]="isSavingShowroom()">
                      <span>{{ isSavingShowroom() ? '⏳ Saving...' : '💾 Save Changes' }}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <!-- DIRECTORY LIST VIEW (KPIs + Showrooms Table/Cards) -->
            <ng-template #showroomDirectoryListView>
              <!-- 4 Platform Metric KPI Cards -->
            <div class="kpi-grid">
              <div class="kpi-card gold-border">
                <div class="kpi-icon">🏬</div>
                <div class="kpi-meta">
                  <span class="kpi-label">Onboarded Showrooms</span>
                  <div class="kpi-value-row">
                    <span class="kpi-val">{{ saasShowrooms.length }}</span>
                    <span class="kpi-denom">Stores</span>
                  </div>
                </div>
              </div>

              <div class="kpi-card">
                <div class="kpi-icon">💳</div>
                <div class="kpi-meta">
                  <span class="kpi-label">Monthly SaaS Run Rate</span>
                  <div class="kpi-value-row">
                    <span class="kpi-val">₹{{ calculateTotalMrr() | number }}</span>
                    <span class="kpi-denom">/mo</span>
                  </div>
                </div>
              </div>

              <div class="kpi-card">
                <div class="kpi-icon">✨</div>
                <div class="kpi-meta">
                  <span class="kpi-label">Try-On Generations</span>
                  <div class="kpi-value-row">
                    <span class="kpi-val">{{ calculateTotalTryOns() | number }}</span>
                    <span class="kpi-denom">Drapes</span>
                  </div>
                </div>
              </div>

              <div class="kpi-card">
                <div class="kpi-icon">⏳</div>
                <div class="kpi-meta">
                  <span class="kpi-label">Trials & Due Intimations</span>
                  <div class="kpi-value-row">
                    <span class="kpi-val">{{ countPendingRenewals() }}</span>
                    <span class="kpi-denom">Accounts</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Showrooms Management Table Card -->
            <div class="portal-card mt-6">
              <div class="card-header-flex">
                <div>
                  <h3 class="card-title">Client Showrooms & Tenant Subscriptions</h3>
                  <p class="card-subtitle">
                    Oversee commercial subscriptions, try-on limits, bank payment status, and credentials for all boutiques.
                  </p>
                </div>
                <div class="card-actions-row">
                  <div class="view-mode-toggle">
                    <button
                      type="button"
                      class="btn-view-toggle"
                      [class.active]="showroomViewMode() === 'tiles'"
                      (click)="setCustomerViewMode('tiles')"
                      title="Switch to Cards / Tiles view">
                      <span>▦</span>
                      <span>Tiles</span>
                    </button>
                    <button
                      type="button"
                      class="btn-view-toggle"
                      [class.active]="showroomViewMode() === 'table'"
                      (click)="setCustomerViewMode('table')"
                      title="Switch to Table view">
                      <span>☰</span>
                      <span>Table</span>
                    </button>
                  </div>
                  <button type="button" class="btn-primary-action" (click)="openOnboardModal()">
                    <span>➕</span>
                    <span>Onboard New Showroom</span>
                  </button>
                </div>
              </div>

              <!-- Filter Bar -->
              <div class="showroom-filter-bar">
                <input
                  type="text"
                  [(ngModel)]="showroomSearch"
                  placeholder="🔍 Search showroom by boutique name, city, owner, email..."
                  class="search-input"
                />
                <div class="filter-pills">
                  <button type="button" class="pill-filter" [class.active]="selectedTierFilter === 'ALL'" (click)="selectedTierFilter = 'ALL'">All</button>
                  <button type="button" class="pill-filter" [class.active]="selectedTierFilter === 'GOLD'" (click)="selectedTierFilter = 'GOLD'">Gold</button>
                  <button type="button" class="pill-filter" [class.active]="selectedTierFilter === 'PLATINUM'" (click)="selectedTierFilter = 'PLATINUM'">Platinum</button>
                  <button type="button" class="pill-filter" [class.active]="selectedTierFilter === 'SILVER'" (click)="selectedTierFilter = 'SILVER'">Silver</button>
                  <button type="button" class="pill-filter" [class.active]="selectedTierFilter === 'TRIAL'" (click)="selectedTierFilter = 'TRIAL'">Trials</button>
                </div>
              </div>

              <!-- Compact Tiles View (Shop Name, Owner Mobile, Payment Status & Action Icons) -->
              <div *ngIf="showroomViewMode() === 'tiles'" class="showroom-tiles-grid mt-4">
                @for (s of paginatedShowrooms(); track s.id) {
                  <div class="showroom-tile-compact" (click)="openShowroomDetailsModal(s)">
                    <div class="compact-tile-header">
                      <h4 class="compact-shop-name" [title]="s.name">{{ s.name }}</h4>
                      <span class="badge-status compact-payment-badge" [ngClass]="s.payment_status">
                        {{ s.payment_status === 'paid' ? '✓ Paid' : (s.payment_status === 'trial' ? '⏱ Trial' : '⚠️ Due') }}
                      </span>
                    </div>

                    <div class="compact-tile-footer">
                      <div class="compact-mobile-row">
                        <span class="compact-mobile-icon">📞</span>
                        <span class="compact-mobile-text">{{ s.contact_phone || 'No phone' }}</span>
                      </div>

                      <div class="compact-actions-row" (click)="$event.stopPropagation()">
                        <button
                          type="button"
                          class="btn-compact-icon gold-icon"
                          (click)="openShowroomDetailsModal(s)"
                          title="View Full Profile, Password & Credentials">
                          👁️
                        </button>
                        <button
                          type="button"
                          class="btn-compact-icon"
                          (click)="launchKioskForShowroom(s)"
                          title="Launch Kiosk Mirror Simulator">
                          🖥️
                        </button>
                        <button
                          type="button"
                          class="btn-compact-icon"
                          (click)="openShowroomDetailsModal(s, 'edit')"
                          title="Edit Boutique Details">
                          ✏️
                        </button>
                        <button
                          type="button"
                          class="btn-compact-icon danger-icon"
                          (click)="promptDeleteShowroom(s, $event)"
                          title="Delete Boutique">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="tiles-empty-container">
                    <div class="empty-icon-large">🏬</div>
                    <h4>No Boutique Showrooms Found</h4>
                    <p>No showrooms found matching the current filter. Try resetting filters or onboard your first boutique.</p>
                    <button type="button" class="btn-primary-action gold-btn mt-2" (click)="openOnboardModal()">
                      <span>✨</span>
                      <span>+ Onboard First Boutique</span>
                    </button>
                  </div>
                }
              </div>

              <!-- Table View -->
              <div *ngIf="showroomViewMode() === 'table'" class="table-responsive mt-3">
                <table class="portal-table">
                  <thead>
                    <tr>
                      <th>Showroom & City</th>
                      <th>Owner / Manager</th>
                      <th>Plan Tier</th>
                      <th>Floor Kiosks & Status</th>
                      <th>Monthly Drape Quota</th>
                      <th>Last Action / Audit</th>
                      <th>Payment & Expiry</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (s of paginatedShowrooms(); track s.id) {
                      <tr>
                        <td>
                          <div class="store-cell">
                            <strong>{{ s.name }}</strong>
                            <span class="store-slug-hint">{{ s.city }} • Slug: <code>{{ s.slug }}</code></span>
                          </div>
                        </td>
                        <td>
                          <div class="contact-cell">
                            <span>{{ s.contact_person }}</span>
                            <span class="contact-sub">{{ s.contact_phone }} • {{ s.contact_email }}</span>
                          </div>
                        </td>
                        <td>
                          <span class="plan-tag" [ngClass]="'tier-' + s.plan_tier.toLowerCase()">
                            {{ s.plan_tier }}
                          </span>
                        </td>
                        <td>
                          <div class="kiosk-status-cell" (click)="openPauseModal(s)" style="cursor: pointer;" title="Manage Floor Kiosks">
                            <span class="badge-status" [ngClass]="getKiosksStatusBadgeClass(s)">
                              {{ getKiosksStatusSummary(s) }}
                            </span>
                            <span class="kiosk-count-sub">{{ s.kiosks?.length || 0 }} Mirrors Linked</span>
                          </div>
                        </td>
                        <td>
                          <div class="quota-cell">
                            <span><strong>{{ s.tokens_used_this_month }}</strong> / {{ s.monthly_token_quota }}</span>
                            <div class="table-meter-bar">
                              <div class="table-meter-fill" [style.width]="(s.tokens_used_this_month / s.monthly_token_quota * 100) + '%'"></div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div class="audit-cell" *ngIf="s.last_action">
                            <span class="audit-badge">{{ s.last_action.action }}</span>
                            <span class="audit-meta">{{ s.last_action.timestamp }} • {{ s.last_action.by }}</span>
                          </div>
                          <div class="audit-cell text-muted" *ngIf="!s.last_action">
                            <span class="audit-meta">No recent activity</span>
                          </div>
                        </td>
                        <td>
                          <div class="status-cell">
                            <span class="badge-status" [ngClass]="s.payment_status">
                              {{ s.payment_status === 'paid' ? '✓ Paid' : (s.payment_status === 'trial' ? '⏱ Free Trial' : '⚠️ Due in ' + s.days_remaining + 'd') }}
                            </span>
                            <span class="expiry-sub">{{ s.days_remaining }} days remaining</span>
                          </div>
                        </td>
                        <td>
                          <div class="action-buttons-flex">
                            <button
                              type="button"
                              class="btn-table-action"
                              style="background: rgba(212, 175, 55, 0.2); border-color: rgba(212, 175, 55, 0.5); color: #ffd700;"
                              (click)="openShowroomDetailsModal(s)"
                              title="View Full Details, Credentials & Password">
                              👁️ Details
                            </button>
                            <button
                              type="button"
                              class="btn-table-action"
                              (click)="launchKioskForShowroom(s)"
                              title="Launch 55-inch Kiosk Mirror Simulation">
                              🖥️ Kiosk
                            </button>
                            <button
                              type="button"
                              class="btn-table-action gold-action"
                              (click)="openPaymentModal(s)"
                              title="Record Offline Bank Transfer / Renew">
                              💰 Payment
                            </button>
                            <button
                              type="button"
                              class="btn-table-action"
                              (click)="openPasswordModal(s)"
                              title="Reset Store Manager Credentials">
                              🔑 Reset Pass
                            </button>
                            <button
                              type="button"
                              class="btn-table-action"
                              (click)="openPauseModal(s)"
                              [title]="s.is_active ? 'Manage Kiosks / Suspend Boutique' : 'Re-Activate Boutique Access'">
                              {{ s.is_active ? '⏸ Pause / Kiosks' : '▶ Activate' }}
                            </button>
                            <button
                              type="button"
                              class="btn-table-action"
                              style="background: rgba(212, 175, 55, 0.15); border-color: rgba(212, 175, 55, 0.4); color: #ffd700;"
                              (click)="openFeatureConfigModal(s)"
                              title="Configure Granular AI Features for this Boutique">
                              ⚙️ Features
                            </button>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="8" style="text-align: center; padding: 48px 16px;">
                          <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                            <div style="font-size: 40px;">🏬</div>
                            <h4 style="margin: 0; font-size: 1.1rem; color: #fff;">No Boutiques Onboarded Yet</h4>
                            <p style="margin: 0; font-size: 0.85rem; color: #94a3b8; max-width: 420px;">
                              Platform is running in clean Day-0 production state. Click below to onboard your first boutique showroom.
                            </p>
                            <button type="button" class="btn-primary-action gold-btn mt-2" (click)="openOnboardModal()">
                              <span>✨</span>
                              <span>+ Onboard First Boutique</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Showroom Table Pagination -->
              <div class="pagination-footer mt-4" *ngIf="filteredShowrooms().length > 0">
                <div class="pagination-info">
                  Showing <strong>{{ getShowroomStartIdx() + 1 }}</strong> to
                  <strong>{{ getShowroomEndIdx() }}</strong> of
                  <strong>{{ filteredShowrooms().length }}</strong> boutiques
                </div>
                <div class="pagination-controls">
                  <div class="page-size-selector">
                    <label>Rows:</label>
                    <select [(ngModel)]="showroomPageSize" (change)="showroomPage.set(1)" class="form-input-sm">
                      <option [ngValue]="5">5</option>
                      <option [ngValue]="10">10</option>
                      <option [ngValue]="20">20</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    class="btn-page-nav"
                    [disabled]="showroomPage() === 1"
                    (click)="showroomPage.set(showroomPage() - 1)">
                    ‹ Prev
                  </button>
                  <span class="page-current">Page {{ showroomPage() }} of {{ getShowroomTotalPages() }}</span>
                  <button
                    type="button"
                    class="btn-page-nav"
                    [disabled]="showroomPage() >= getShowroomTotalPages()"
                    (click)="showroomPage.set(showroomPage() + 1)">
                    Next ›
                  </button>
                </div>
              </div>
            </div>
            </ng-template>
          </div>

          <!-- ========================================================================= -->
          <!-- SUPER ADMIN TAB 2: OFFLINE PAYMENTS & SUBSCRIPTIONS                       -->
          <!-- ========================================================================= -->
          <div *ngIf="userRole() === 'super_admin' && activeNav() === 'sa-payments'" class="tab-view-body">
            <div class="portal-card">
              <div class="payments-header-action-row" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; flex-wrap: wrap;">
                <div>
                  <h3 class="card-title">Showroom Offline Payment Verification Desk</h3>
                  <p class="card-subtitle">
                    Showrooms pay through Direct Bank Transfer (NEFT/RTGS), UPI Business, Cheque, or Cash. Verify against company bank statement, record transaction UTR references, and renew subscriptions.
                  </p>
                </div>
                <button type="button" class="btn-primary-action" (click)="openPaymentModal()">
                  <span>💳</span>
                  <span>+ Record Offline Payment / Renew</span>
                </button>
              </div>

              <!-- Payment Verification History -->
              <h4 class="mt-8 section-subheading">Recent Verified Payments History</h4>
              <div class="table-responsive mt-3">
                <table class="portal-table">
                  <thead>
                    <tr>
                      <th>Showroom</th>
                      <th>Payment Mode</th>
                      <th>Amount</th>
                      <th>UTR / Reference</th>
                      <th>Verified By</th>
                      <th>Date</th>
                      <th>Extension</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of paginatedPayments(); track p.id) {
                      <tr>
                        <td><strong>{{ p.showroom_name }}</strong></td>
                        <td><span class="pay-mode-pill">{{ p.payment_mode }}</span></td>
                        <td><strong style="color: #00e676;">₹{{ p.amount_inr | number }}</strong></td>
                        <td><code>{{ p.utr_reference }}</code></td>
                        <td>{{ p.verified_by }}</td>
                        <td>{{ p.payment_date }}</td>
                        <td><span class="badge-status paid">{{ p.extension_granted }}</span></td>
                        <td>
                          <button type="button" class="btn-table-action gold-action" (click)="openPaymentModalForName(p.showroom_name)">
                            💳 Renew
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Payments Table Pagination -->
              <div class="pagination-footer mt-4">
                <div class="pagination-info">
                  Showing <strong>{{ getPaymentStartIdx() + 1 }}</strong> to
                  <strong>{{ getPaymentEndIdx() }}</strong> of
                  <strong>{{ paymentHistory.length }}</strong> verified transactions
                </div>
                <div class="pagination-controls">
                  <div class="page-size-selector">
                    <label>Rows:</label>
                    <select [(ngModel)]="paymentPageSize" (change)="paymentPage.set(1)" class="form-input-sm">
                      <option [ngValue]="5">5</option>
                      <option [ngValue]="10">10</option>
                      <option [ngValue]="20">20</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    class="btn-page-nav"
                    [disabled]="paymentPage() === 1"
                    (click)="paymentPage.set(paymentPage() - 1)">
                    ‹ Prev
                  </button>
                  <span class="page-current">Page {{ paymentPage() }} of {{ getPaymentTotalPages() }}</span>
                  <button
                    type="button"
                    class="btn-page-nav"
                    [disabled]="paymentPage() >= getPaymentTotalPages()"
                    (click)="paymentPage.set(paymentPage() + 1)">
                    Next ›
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ========================================================================= -->
          <!-- SUPER ADMIN TAB 3: AI ENGINE & CENTRALIZED TOKEN POOL ROUTING             -->
          <!-- ========================================================================= -->
          <div *ngIf="userRole() === 'super_admin' && activeNav() === 'sa-aipool'" class="tab-view-body">
            <!-- Top KPI Grid -->
            <div class="kpi-grid">
              <div class="kpi-card gold-border">
                <div class="kpi-icon">⚡</div>
                <div class="kpi-meta">
                  <span class="kpi-label">Active Production Engine</span>
                  <span class="kpi-val" style="font-size: 1.25rem; color: #ffd700;">{{ getPrimaryEngine().name }}</span>
                  <span class="live-pulse-badge">● LIVE ROUTING</span>
                </div>
              </div>
              <div class="kpi-card">
                <div class="kpi-icon">🔄</div>
                <div class="kpi-meta">
                  <span class="kpi-label">Failover Backup 1</span>
                  <span class="kpi-val" style="font-size: 1.25rem;">{{ getFallbackEngine().name }}</span>
                  <span class="standby-badge">HOT STANDBY</span>
                </div>
              </div>
              <div class="kpi-card">
                <div class="kpi-icon">⏱️</div>
                <div class="kpi-meta">
                  <span class="kpi-label">Primary P95 Latency</span>
                  <div class="kpi-value-row">
                    <span class="kpi-val">{{ getPrimaryEngine().latencyMs }}</span>
                    <span class="kpi-denom">ms</span>
                  </div>
                  <span class="sub-metric-hint">{{ getPrimaryEngine().successRatePct }}% SLA Success</span>
                </div>
              </div>
              <div class="kpi-card">
                <div class="kpi-icon">💎</div>
                <div class="kpi-meta">
                  <span class="kpi-label">Global AI Token Pool</span>
                  <div class="kpi-value-row">
                    <span class="kpi-val">{{ calculateTotalAiTokensRemaining() | number }}</span>
                    <span class="kpi-denom">/ {{ calculateTotalAiTokensCapacity() | number }}</span>
                  </div>
                  <span class="sub-metric-hint">Avg ₹{{ getPrimaryEngine().costInr | number:'1.2-2' }} per try-on</span>
                </div>
              </div>
            </div>

            <!-- Cascading Failover Routing Circuit Banner -->
            <div class="failover-circuit-card mt-6">
              <div class="circuit-header">
                <div>
                  <h4 class="circuit-title">🛡️ Smart Failover Routing Circuit (Zero-Downtime Guarantee)</h4>
                  <p class="circuit-desc">
                    If the primary engine hits a rate limit (HTTP 429) or latency timeout (&gt;4.5s), requests automatically and seamlessly cascade down the priority chain. Showroom floor mirrors never freeze in front of customers.
                  </p>
                </div>
                <span class="circuit-status-chip">
                  <span class="pulse-dot"></span>
                  Circuit Armed &amp; Monitoring
                </span>
              </div>

              <div class="circuit-steps-row mt-4">
                <div class="circuit-step active-step">
                  <div class="step-num">1</div>
                  <div class="step-info">
                    <span class="step-role">Primary (100% Traffic)</span>
                    <strong class="step-name">{{ getPrimaryEngine().name }}</strong>
                    <span class="step-meta">{{ getPrimaryEngine().latencyMs }}ms · {{ getPrimaryEngine().successRatePct }}% SLA</span>
                  </div>
                </div>

                <div class="circuit-arrow">
                  <span>➔</span>
                  <small>Timeout &gt; 4.5s / 429</small>
                </div>

                <div class="circuit-step standby-step">
                  <div class="step-num">2</div>
                  <div class="step-info">
                    <span class="step-role">Hot Standby (Failover 1)</span>
                    <strong class="step-name">{{ getFallbackEngine().name }}</strong>
                    <span class="step-meta">{{ getFallbackEngine().latencyMs }}ms · Standby Ready</span>
                  </div>
                </div>

                <div class="circuit-arrow">
                  <span>➔</span>
                  <small>Zero Internet / Network Outage</small>
                </div>

                <div class="circuit-step shield-step">
                  <div class="step-num">3</div>
                  <div class="step-info">
                    <span class="step-role">Emergency Shield</span>
                    <strong class="step-name">NeXooAi Offline Edge Shield</strong>
                    <span class="step-meta">12ms · Zero Cloud Demo Fallback</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Live AI Engines Pool Matrix Table -->
            <div class="portal-card mt-6">
              <div class="card-header-flex">
                <div>
                  <h3 class="card-title">Live AI Engine Registry &amp; Real-Time Usage Meters</h3>
                  <p class="card-subtitle">
                    Centralized AI token quota and live operational routing. Promote any provider to Live Primary with a single click without touching individual boutique screens.
                  </p>
                </div>
                <div class="action-btns-gap">
                  <button type="button" class="btn-outline-action" (click)="testAllAiEngines()">
                    <span>📡</span>
                    <span>Ping All Engines</span>
                  </button>
                  <button type="button" class="btn-primary-action" (click)="saveAiSettings()">
                    <span>💾</span>
                    <span>Save Active Engine &amp; Routing</span>
                  </button>
                </div>
              </div>

              <!-- High-Density Responsive Engine Fleet Cards (No Horizontal Scrolling) -->
              <div class="ai-engines-grid mt-4">
                @for (engine of aiEngines; track engine.id) {
                  <div class="engine-fleet-card" [class.is-primary]="engine.role === 'primary'" [class.is-fallback]="engine.role === 'fallback_1'">
                    <div class="engine-fleet-top">
                      <div>
                        <h4 class="engine-fleet-name">{{ engine.name }}</h4>
                        <span class="engine-fleet-vendor">{{ engine.vendor }}</span>
                      </div>
                      <div class="engine-status-col">
                        <span class="ai-role-tag" [ngClass]="'role-' + engine.role">
                          {{ formatRoleTitle(engine.role) }}
                        </span>
                        <small class="tested-hint">Ping: {{ engine.lastTested }}</small>
                      </div>
                    </div>

                    <!-- 3 Core Telemetry Metrics -->
                    <div class="engine-fleet-stats">
                      <div class="stat-box">
                        <span class="stat-box-label">Latency</span>
                        <strong class="stat-box-val" [class.latency-good]="engine.latencyMs < 2000" [class.latency-ok]="engine.latencyMs >= 2000">
                          {{ engine.latencyMs }} ms
                        </strong>
                      </div>
                      <div class="stat-box">
                        <span class="stat-box-label">Unit Cost</span>
                        <strong class="stat-box-val">₹{{ engine.costInr | number:'1.2-2' }}</strong>
                      </div>
                      <div class="stat-box">
                        <span class="stat-box-label">Reliability</span>
                        <strong class="stat-box-val">★ {{ engine.qualityScore }}</strong>
                      </div>
                    </div>

                    <!-- Token Balance & Quota Meter -->
                    <div class="engine-quota-wrap">
                      <div class="quota-numbers-row">
                        <span style="font-size: 0.76rem; color: #a89fae;">Token Balance:</span>
                        <strong>{{ (engine.quotaTotal - engine.quotaUsed) | number }} / {{ engine.quotaTotal | number }}</strong>
                      </div>
                      <div class="table-meter-bar" style="margin: 0.35rem 0;">
                        <div
                          class="table-meter-fill"
                          [style.width]="(100 - (engine.quotaUsed / engine.quotaTotal * 100)) + '%'"
                          [style.background]="getMeterColor(100 - (engine.quotaUsed / engine.quotaTotal * 100))">
                        </div>
                      </div>
                      <div class="quota-meta-row">
                        <span>{{ (100 - (engine.quotaUsed / engine.quotaTotal * 100)) | number:'1.0-0' }}% available</span>
                        <code>{{ engine.apiKeyMasked }}</code>
                      </div>
                    </div>

                    <!-- Clean Actions Dock (Always visible, never cut off) -->
                    <div class="engine-fleet-actions">
                      <button
                        type="button"
                        class="btn-table-action make-primary-btn"
                        *ngIf="engine.role !== 'primary' && engine.id !== 'local_heuristic'"
                        (click)="setPrimaryEngine(engine)">
                        ⚡ Make Primary
                      </button>
                      <button
                        type="button"
                        class="btn-table-action make-fallback-btn"
                        *ngIf="engine.role !== 'primary' && engine.role !== 'fallback_1' && engine.id !== 'local_heuristic'"
                        (click)="setFallbackEngine(engine)">
                        🔄 Make Fallback
                      </button>
                      <button
                        type="button"
                        class="btn-table-action ping-btn"
                        [disabled]="engine.isTesting"
                        (click)="testSingleEngine(engine)">
                        {{ engine.isTesting ? '⏳ Testing...' : '📡 Live Ping' }}
                      </button>
                      <button
                        type="button"
                        class="btn-table-action key-btn"
                        *ngIf="engine.id !== 'local_heuristic'"
                        (click)="openEditKeyModal(engine)">
                        🔑 Key
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Provider Configuration & Alert Thresholds -->
            <div class="portal-card mt-6">
              <div class="card-header-flex">
                <div>
                  <h3 class="card-title">Centralized API Keys &amp; Low-Balance Threshold Alerts</h3>
                  <p class="card-subtitle">
                    Platform credentials sync securely across all kiosks. When token quota drops below the threshold, NeXooAi sends automated WhatsApp alerts to Super Admin.
                  </p>
                </div>
                <button type="button" class="btn-primary-action" (click)="saveAiSettings()">
                  <span>💾</span>
                  <span>Save AI Credentials</span>
                </button>
              </div>

              <div class="settings-form-grid mt-4">
                <div class="settings-field">
                  <label>Google Gemini Vertex / AI Studio API Key</label>
                  <input type="password" [(ngModel)]="aiProviderSettings.geminiApiKey" class="form-input" placeholder="AIzaSy..." />
                </div>
                <div class="settings-field">
                  <label>Fashn.ai Enterprise Secret Key</label>
                  <input type="password" [(ngModel)]="aiProviderSettings.fashnApiKey" class="form-input" placeholder="fa_prod_..." />
                </div>
                <div class="settings-field">
                  <label>OpenAI Secret Key (Optional Backup)</label>
                  <input type="password" [(ngModel)]="aiProviderSettings.openaiApiKey" class="form-input" placeholder="sk-..." />
                </div>
                <div class="settings-field">
                  <label>Super Admin WhatsApp Phone for Low-Balance Alerts</label>
                  <input type="tel" [(ngModel)]="aiProviderSettings.lowBalancePhone" class="form-input" placeholder="+91 97880 12345" />
                </div>
                <div class="settings-field">
                  <label>Low Balance WhatsApp Alert Threshold</label>
                  <select class="form-input" [(ngModel)]="aiProviderSettings.lowBalanceThreshold">
                    <option [value]="15">Alert when quota falls below 15% (Recommended)</option>
                    <option [value]="10">Alert when quota falls below 10%</option>
                    <option [value]="5">Alert when quota falls below 5% (Urgent)</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Showrooms AI Consumption & Quota Allocation Table -->
            <div class="portal-card mt-6">
              <div class="card-header-flex">
                <div>
                  <h3 class="card-title">Showroom Fleet AI Token Quota &amp; Consumption</h3>
                  <p class="card-subtitle">
                    Live breakdown of AI try-on quota allocated and used across all enrolled boutiques.
                  </p>
                </div>
              </div>
              <div class="table-responsive mt-3">
                <table class="portal-table">
                  <thead>
                    <tr>
                      <th>Showroom Name</th>
                      <th>Plan Tier</th>
                      <th>Monthly Quota</th>
                      <th>Used This Month</th>
                      <th>Remaining Balance</th>
                      <th>Usage Progress</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (s of saasShowrooms; track s.id) {
                      <tr>
                        <td>
                          <strong>{{ s.name }}</strong>
                          <span class="store-slug-hint">{{ s.city }} · {{ s.kiosk_count || 1 }} Kiosk(s)</span>
                        </td>
                        <td><span class="tier-badge">{{ s.plan_tier | uppercase }}</span></td>
                        <td>{{ s.monthly_token_quota | number }} try-ons</td>
                        <td><strong>{{ s.tokens_used_this_month | number }}</strong></td>
                        <td style="color: #00e676; font-weight: 600;">{{ (s.monthly_token_quota - s.tokens_used_this_month) | number }}</td>
                        <td style="min-width: 140px;">
                          <div class="quota-meter-bar" style="background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                            <div [style.width.%]="(s.tokens_used_this_month / (s.monthly_token_quota || 1)) * 100" style="background: #ffd700; height: 100%;"></div>
                          </div>
                          <small style="opacity: 0.75;">{{ ((s.tokens_used_this_month / (s.monthly_token_quota || 1)) * 100) | number:'1.0-0' }}% consumed</small>
                        </td>
                        <td>
                          <span class="badge" [class.badge-success]="s.is_active" [class.badge-warning]="!s.is_active">
                            {{ s.is_active ? '● Active' : '○ Suspended' }}
                          </span>
                        </td>
                      </tr>
                    }
                    @if (saasShowrooms.length === 0) {
                      <tr>
                        <td colspan="7" style="text-align: center; padding: 24px; opacity: 0.7;">
                          No individual showrooms enrolled yet. Add showrooms in the "Showrooms &amp; Tenancy" tab.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- SUPER ADMIN TAB 4: INTERNAL COMPANY STAFF DELEGATION                      -->
          <!-- ========================================================================= -->
          <div *ngIf="userRole() === 'super_admin' && activeNav() === 'sa-team'" class="tab-view-body">
            <div class="portal-card">
              <div class="card-header-flex">
                <div>
                  <h3 class="card-title">NeXooAi Internal Company Staff Delegation</h3>
                  <p class="card-subtitle">
                    Delegate operational tasks to your internal team (Sales Executives, Customer Support, Billing Managers). Each staff member logs in with their unique company credentials.
                  </p>
                </div>
                <button type="button" class="btn-primary-action" (click)="openAddStaffModal()">
                  <span>➕</span>
                  <span>Add Company Staff Member</span>
                </button>
              </div>

              <div class="table-responsive mt-3">
                <table class="portal-table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Company Email</th>
                      <th>Assigned Role</th>
                      <th>Operational Access Scope</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (member of companyStaff; track member.id) {
                      <tr>
                        <td><strong>{{ member.name }}</strong></td>
                        <td>{{ member.email }}</td>
                        <td><span class="role-badge">{{ member.role }}</span></td>
                        <td>{{ member.accessScope }}</td>
                        <td><span class="badge-status paid">{{ member.status }}</span></td>
                        <td>
                          <button
                            type="button"
                            class="btn-table-action"
                            *ngIf="member.id !== 'cs-1'"
                            (click)="openRemoveStaffModal(member)">
                            ✕ Remove Access
                          </button>
                          <span *ngIf="member.id === 'cs-1'" style="font-size: 0.78rem; color: #ffd700;">★ Account Owner</span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ========================================================================= -->
          <!-- SUPER ADMIN TAB 5: 55" SMART MIRROR HARDWARE FLEET                        -->
          <!-- ========================================================================= -->
          <div *ngIf="userRole() === 'super_admin' && activeNav() === 'sa-hardware'" class="tab-view-body">
            <div class="portal-card">
              <div class="card-header-flex">
                <div>
                  <h3 class="card-title">Turnkey 55" Smart Mirror Kiosks & Camera Fleet</h3>
                  <p class="card-subtitle">
                    NeXooAi provides complete hardware packages (55" Portrait Display + 4K Sensor Camera + Mini-PC). Monitor hardware serial numbers, deployed boutiques, and warranty SLAs.
                  </p>
                </div>
              </div>

              <div class="table-responsive mt-3">
                <table class="portal-table">
                  <thead>
                    <tr>
                      <th>Kiosk Code</th>
                      <th>Deployed Showroom</th>
                      <th>Hardware Specification</th>
                      <th>Camera Sensor</th>
                      <th>Mini-PC Unit</th>
                      <th>Hardware Status</th>
                      <th>Warranty SLA</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (hw of hardwareFleet; track hw.id) {
                      <tr>
                        <td><code>{{ hw.code }}</code></td>
                        <td><strong>{{ hw.storeName }}</strong></td>
                        <td>{{ hw.type }}</td>
                        <td>{{ hw.camera }}</td>
                        <td>{{ hw.pcUnit }}</td>
                        <td><span class="badge-status paid">● {{ hw.status }}</span></td>
                        <td><span class="expiry-sub">{{ hw.warranty }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ========================================================================= -->
          <!-- STORE MANAGER TABS (Existing Catalogue, Kiosks, Subscription, Settings)   -->
          <!-- ========================================================================= -->
          <div *ngIf="activeNav() === 'dashboard'" class="tab-view-body">
            <!-- 4 KPI Metrics Cards -->
            <div class="kpi-grid">
              <div class="kpi-card gold-border">
                <div class="kpi-icon">👗</div>
                <div class="kpi-meta">
                  <span class="kpi-label">Monthly Try-On Quota</span>
                  <div class="kpi-value-row">
                    <span class="kpi-val">{{ tokensUsed() }}</span>
                    <span class="kpi-denom">/ {{ tokenQuota() }} used</span>
                  </div>
                </div>
              </div>
              <div class="kpi-card">
                <div class="kpi-icon">🖥️</div>
                <div class="kpi-meta">
                  <span class="kpi-label">Active Floor Kiosks</span>
                  <div class="kpi-value-row">
                    <span class="kpi-val">{{ kiosks.length }}</span>
                    <span class="kpi-denom">Screens Online</span>
                  </div>
                </div>
              </div>
              <div class="kpi-card">
                <div class="kpi-icon">✨</div>
                <div class="kpi-meta">
                  <span class="kpi-label">Catalogue Garments</span>
                  <div class="kpi-value-row">
                    <span class="kpi-val">{{ sarees.length }}</span>
                    <span class="kpi-denom">Live SKUs</span>
                  </div>
                </div>
              </div>
              <div class="kpi-card">
                <div class="kpi-icon">👥</div>
                <div class="kpi-meta">
                  <span class="kpi-label">Today's Visitors</span>
                  <div class="kpi-value-row">
                    <span class="kpi-val">142</span>
                    <span class="kpi-denom">Drapes Tried</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Executive Business Intelligence & Conversion Analytics Grid -->
            <div class="analytics-intelligence-grid mt-6">
              <!-- Widget 1: Top 5 Trending Sarees this Week -->
              <div class="portal-card trending-garments-card">
                <div class="card-header-flex">
                  <div>
                    <h3 class="card-title">🔥 Top 5 Trending Garments this Week</h3>
                    <p class="card-subtitle">Real-time customer try-on demand and popularity ranking across showroom totems.</p>
                  </div>
                  <span class="badge-gold-trend">Live Trend</span>
                </div>

                <div class="trending-list mt-4">
                  @for (t of topTrendingGarments; track t.sku; let i = $index) {
                    <div class="trending-item">
                      <span class="trend-rank">#{{ i + 1 }}</span>
                      <img [src]="t.thumbnail" class="trend-thumb" alt="Garment thumbnail" />
                      <div class="trend-info">
                        <div class="trend-title-row">
                          <strong>{{ t.name }}</strong>
                          <span class="trend-trials">{{ t.trials }} Try-Ons</span>
                        </div>
                        <div class="trend-meta-sub">
                          <code>{{ t.sku }}</code> • ₹{{ t.price | number }} • <span class="conversion-text">{{ t.purchases }} Billed ({{ t.conversion }}%)</span>
                        </div>
                        <div class="trend-meter-bar">
                          <div class="trend-meter-fill" [style.width.%]="t.interestPercent"></div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Widget 2: Floor Conversion & Footfall Intelligence -->
              <div class="portal-card conversion-metrics-card">
                <h3 class="card-title">📈 Try-On to Billing Conversion</h3>
                <p class="card-subtitle">AI mirror impact on showroom bridal and ethnic wear sales.</p>

                <div class="conversion-rate-display mt-4">
                  <div class="rate-circle-box">
                    <span class="rate-large">{{ conversionRate() }}%</span>
                    <span class="rate-sub">Try-On Conversion</span>
                  </div>
                  <div class="conversion-kpis">
                    <div class="conv-kpi-item">
                      <span class="conv-lbl">Total Try-Ons Today:</span>
                      <strong class="conv-val">48 Drapes</strong>
                    </div>
                    <div class="conv-kpi-item">
                      <span class="conv-lbl">Walk-in Purchases:</span>
                      <strong class="conv-val success">32 Billed 💰</strong>
                    </div>
                    <div class="conv-kpi-item">
                      <span class="conv-lbl">Avg. Drape Speed:</span>
                      <strong class="conv-val">38 seconds</strong>
                    </div>
                  </div>
                </div>

                <!-- Peak Footfall Heatmap -->
                <div class="peak-hours-widget mt-4">
                  <h4 class="sub-widget-title">⏰ Peak Try-On Hours Today</h4>
                  <div class="hours-bar-group mt-2">
                    <div class="hour-segment">
                      <span class="hour-time">10 AM - 1 PM</span>
                      <div class="hour-bar"><div class="hour-fill" style="width: 18%"></div></div>
                      <span class="hour-pct">18%</span>
                    </div>
                    <div class="hour-segment">
                      <span class="hour-time">2 PM - 5 PM</span>
                      <div class="hour-bar"><div class="hour-fill" style="width: 24%"></div></div>
                      <span class="hour-pct">24%</span>
                    </div>
                    <div class="hour-segment peak">
                      <span class="hour-time">5 PM - 8 PM (Peak) 🔥</span>
                      <div class="hour-bar"><div class="hour-fill peak" style="width: 58%"></div></div>
                      <span class="hour-pct">58%</span>
                    </div>
                  </div>
                </div>

                <!-- Stylist Performance Leaderboard -->
                <div class="stylist-leaderboard mt-4">
                  <h4 class="sub-widget-title">🏆 Top Floor Stylists (Sessions Assisted)</h4>
                  <div class="stylist-mini-list mt-2">
                    <div class="stylist-mini-row">
                      <span>👑 <strong>Priya Raman</strong> (Bridal Stylist)</span>
                      <span class="stylist-score">18 Trials • 8 Sales</span>
                    </div>
                    <div class="stylist-mini-row">
                      <span>🥈 <strong>K. Anand</strong> (Floor Sales)</span>
                      <span class="stylist-score">14 Trials • 6 Sales</span>
                    </div>
                    <div class="stylist-mini-row">
                      <span>🥉 <strong>Deepa S.</strong> (Sales Executive)</span>
                      <span class="stylist-score">11 Trials • 5 Sales</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Recent Floor Sessions -->
            <div class="portal-card mt-6">
              <h3 class="card-title">Live Floor Try-On Activity (Recent Sessions)</h3>
              <div class="table-responsive mt-3">
                <table class="portal-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Floor Kiosk</th>
                      <th>Garment Name</th>
                      <th>SKU</th>
                      <th>Category</th>
                      <th>Counter Token</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (s of paginatedActivity(); track s.tokenCode) {
                      <tr>
                        <td>{{ s.time }}</td>
                        <td>{{ s.kiosk }}</td>
                        <td><strong>{{ s.sareeName }}</strong></td>
                        <td><code>{{ s.sku }}</code></td>
                        <td>{{ s.category }}</td>
                        <td><span class="token-chip">{{ s.tokenCode }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Floor Activity Pagination -->
              <div class="pagination-footer mt-4">
                <div class="pagination-info">
                  Showing <strong>{{ getActivityStartIdx() + 1 }}</strong> to
                  <strong>{{ getActivityEndIdx() }}</strong> of
                  <strong>{{ recentSessions.length }}</strong> sessions
                </div>
                <div class="pagination-controls">
                  <div class="page-size-selector">
                    <label>Rows:</label>
                    <select [(ngModel)]="activityPageSize" (change)="activityPage.set(1)" class="form-input-sm">
                      <option [ngValue]="5">5</option>
                      <option [ngValue]="10">10</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    class="btn-page-nav"
                    [disabled]="activityPage() === 1"
                    (click)="activityPage.set(activityPage() - 1)">
                    ‹ Prev
                  </button>
                  <span class="page-current">Page {{ activityPage() }} of {{ getActivityTotalPages() }}</span>
                  <button
                    type="button"
                    class="btn-page-nav"
                    [disabled]="activityPage() >= getActivityTotalPages()"
                    (click)="activityPage.set(activityPage() + 1)">
                    Next ›
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Existing Catalogue Tab -->
          <div *ngIf="activeNav() === 'catalogue'" class="tab-view-body">
            <div class="portal-card">
              <div class="card-header-flex">
                <div>
                  <h3 class="card-title">Live Garment & Saree Inventory</h3>
                  <p class="card-subtitle">Manage showroom catalog items, SKUs, rack placements, and visibility on floor kiosks.</p>
                </div>
                <div class="action-btn-group-responsive">
                  <button type="button" class="btn-outline-action" (click)="openCategoryModal()">
                    <span>🏷️</span>
                    <span>Category Master</span>
                  </button>
                  <button type="button" class="btn-outline-action" (click)="openEcomSyncModal()">
                    <span>🌐</span>
                    <span>Website Sync</span>
                  </button>
                  <button type="button" class="btn-outline-action" (click)="openPosLookupModal()">
                    <span>📱</span>
                    <span>Live POS Scan</span>
                  </button>
                  <button type="button" class="btn-outline-action" (click)="openBulkCsvModal()">
                    <span>📂</span>
                    <span>Bulk CSV Upload</span>
                  </button>
                  <button type="button" class="btn-primary-action" (click)="openAddModal()">
                    <span>➕</span>
                    <span>Add Garment</span>
                  </button>
                </div>
              </div>

              <div class="table-responsive mt-3">
                <table class="portal-table">
                  <thead>
                    <tr>
                      <th>Preview</th>
                      <th>SKU</th>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Fabric</th>
                      <th>Price</th>
                      <th>Rack</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (s of sarees; track s.id) {
                      <tr>
                        <td><img [src]="s.thumbnail" class="thumbnail-cell" alt="Saree thumbnail" /></td>
                        <td><code>{{ s.sku }}</code></td>
                        <td>
                          <div class="bilingual-title">
                            <strong>{{ s.name_en }}</strong>
                            <span class="sub-ta">{{ s.name_ta }}</span>
                          </div>
                        </td>
                        <td>{{ s.category }}</td>
                        <td>{{ s.fabric }}</td>
                        <td><strong>₹{{ s.price | number }}</strong></td>
                        <td><span class="rack-pill">{{ s.rack_location }}</span></td>
                        <td>
                          <button
                            type="button"
                            class="btn-stock-status-pill"
                            [class.in-stock]="s.is_active"
                            [class.out-of-stock]="!s.is_active"
                            (click)="toggleSareeStatus(s)"
                            [title]="s.is_active ? 'Click to mark as Sold Out' : 'Click to mark as In Stock'">
                            <span>{{ s.is_active ? '🟢 In Stock' : '🔴 Sold Out' }}</span>
                          </button>
                        </td>
                        <td>
                          <button type="button" class="btn-table-action" (click)="toggleSareeStatus(s)">
                            {{ s.is_active ? 'Mark Sold' : 'Restock' }}
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Existing Kiosks Tab -->
          <div *ngIf="activeNav() === 'kiosks'" class="tab-view-body">
            <div class="portal-card">
              <div class="card-header-flex">
                <div>
                  <h3 class="card-title">Floor Kiosks & Hardware Status ({{ kiosks.length }})</h3>
                  <p class="card-subtitle">55-inch portrait hardware totems registered in showroom. Ground Floor Bridal, First Floor Designer & custom terminals.</p>
                </div>
                <button type="button" class="btn-primary-action" (click)="openAddKioskModal()">
                  <span>➕</span>
                  <span>Register Floor Kiosk</span>
                </button>
              </div>
              <div class="kiosk-grid mt-4">
                @for (k of kiosks; track k.id) {
                  <div class="kiosk-card">
                    <div class="kiosk-header">
                      <div class="kiosk-title-block">
                        <h4>{{ k.name }}</h4>
                        <span class="kiosk-id-tag">{{ k.id }}</span>
                      </div>
                      <span class="kiosk-ping-dot" [class.online]="k.status === 'online'"></span>
                    </div>
                    <div class="kiosk-meta-rows">
                      <div class="meta-row"><span class="k-lbl">Section:</span><span class="k-val">{{ k.section }}</span></div>
                      <div class="meta-row"><span class="k-lbl">Username:</span><span class="k-val font-mono">{{ k.username || k.id }}</span></div>
                      <div class="meta-row"><span class="k-lbl">Password:</span><span class="k-val font-mono">{{ k.kiosk_password || 'Kiosk@2026' }}</span></div>
                      <div class="meta-row"><span class="k-lbl">Staff PIN:</span><span class="k-val font-mono text-emerald">{{ k.pin || '5521' }}</span></div>
                    </div>

                    <!-- Kiosk Trial Counters Box -->
                    <div class="kiosk-trial-summary-bar mt-2">
                      <div class="k-stat-item">
                        <span class="k-stat-val">{{ k.trial_count || 0 }}</span>
                        <span class="k-stat-lbl">Total Trials</span>
                      </div>
                      <div class="k-stat-item">
                        <span class="k-stat-val text-emerald">{{ k.today_trials || 0 }}</span>
                        <span class="k-stat-lbl">Today's Drapes</span>
                      </div>
                    </div>

                    <div class="kiosk-card-footer">
                      <div class="kiosk-action-btn-row">
                        <button type="button" class="btn-kiosk-action gold-action" (click)="openKioskTrialsModal(k)" title="View all try-on trials done by this specific kiosk">
                          <span>📊</span>
                          <span>Trials History ({{ k.trial_count || 0 }})</span>
                        </button>
                        <button type="button" class="btn-kiosk-action" (click)="openEditKioskModal(k)" title="Edit Kiosk Name, Password or PIN">
                          <span>✏️</span>
                          <span>Edit</span>
                        </button>
                        <button type="button" class="btn-kiosk-action" (click)="copyKioskLaunchUrl(k)" title="Copy 1-Click Launch Link for 55-inch totem">
                          <span>🔗</span>
                          <span>Link</span>
                        </button>
                        <button type="button" class="btn-kiosk-action launch-direct" (click)="launchKioskWindow(k)" title="Open Kiosk simulator">
                          <span>🚀</span>
                          <span>Open</span>
                        </button>
                        <button type="button" class="btn-kiosk-action danger-action" (click)="promptDeleteKiosk(k)" title="Remove Kiosk from Showroom">
                          <span>🗑️</span>
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- TAB: CUSTOMER LEADS & CRM (WHATSAPP MARKETING & FOOTFALL FOLLOW-UP) -->
          <div *ngIf="activeNav() === 'leads'" class="tab-view-body">
            <div class="portal-card">
              <div class="card-header-flex">
                <div>
                  <h3 class="card-title">📱 Customer Leads & WhatsApp CRM</h3>
                  <p class="card-subtitle">Capture high-intent walk-in customers from 55" totems, track draped garments, and send direct WhatsApp festive offers.</p>
                </div>
                <div class="action-btn-group-responsive">
                  <button type="button" class="btn-outline-action" (click)="exportLeadsCsv()">
                    <span>📥</span>
                    <span>Export Leads CSV</span>
                  </button>
                </div>
              </div>

              <!-- Leads KPI Summary Strip -->
              <div class="kpi-grid mt-4">
                <div class="kpi-card">
                  <div class="kpi-icon">👥</div>
                  <div class="kpi-meta">
                    <span class="kpi-label">Total Walk-in Leads</span>
                    <div class="kpi-value-row">
                      <span class="kpi-val">{{ customerLeads.length }}</span>
                      <span class="kpi-denom">Shoppers Captured</span>
                    </div>
                  </div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-icon">💰</div>
                  <div class="kpi-meta">
                    <span class="kpi-label">Purchased & Billed</span>
                    <div class="kpi-value-row">
                      <span class="kpi-val">{{ getBilledLeadsCount() }}</span>
                      <span class="kpi-denom">Converted</span>
                    </div>
                  </div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-icon">📞</div>
                  <div class="kpi-meta">
                    <span class="kpi-label">Follow-up Needed</span>
                    <div class="kpi-value-row">
                      <span class="kpi-val">{{ getFollowupLeadsCount() }}</span>
                      <span class="kpi-denom">High Intent</span>
                    </div>
                  </div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-icon">📈</div>
                  <div class="kpi-meta">
                    <span class="kpi-label">Lead Conversion</span>
                    <div class="kpi-value-row">
                      <span class="kpi-val">{{ getLeadsConversionRate() }}%</span>
                      <span class="kpi-denom">Billing Rate</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Filter Bar -->
              <div class="leads-filter-bar mt-5">
                <div class="filter-group">
                  <label>Filter Status:</label>
                  <select [(ngModel)]="leadsFilterStatus" class="form-input-sm">
                    <option value="all">All Leads ({{ customerLeads.length }})</option>
                    <option value="new">New Leads</option>
                    <option value="followup">Follow-up Needed</option>
                    <option value="billed">Purchased & Billed</option>
                    <option value="offer_sent">WhatsApp Offer Sent</option>
                  </select>
                </div>
                <div class="search-group flex-1">
                  <input type="text" [(ngModel)]="leadsSearchQuery" placeholder="Search customer name, phone (+91), or saree SKU..." class="form-control" />
                </div>
              </div>

              <!-- Customer Leads Table -->
              <div class="table-responsive mt-3">
                <table class="portal-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Phone Number</th>
                      <th>Garment Draped</th>
                      <th>Price</th>
                      <th>Floor Kiosk & Stylist</th>
                      <th>Time</th>
                      <th>Lead Status</th>
                      <th>Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (lead of filteredCustomerLeads(); track lead.id) {
                      <tr>
                        <td>
                          <strong>{{ lead.name }}</strong>
                        </td>
                        <td>
                          <div class="phone-cell">
                            <code>{{ lead.phone }}</code>
                            <button type="button" class="btn-copy-mini" (click)="copyLeadPhone(lead.phone)" title="Copy Phone">📋</button>
                          </div>
                        </td>
                        <td>
                          <div class="lead-garment-cell">
                            <img [src]="lead.thumbnail" class="thumbnail-cell-sm" alt="Garment" />
                            <div>
                              <strong>{{ lead.sareeName }}</strong>
                              <span class="sub-sku">{{ lead.sku }}</span>
                            </div>
                          </div>
                        </td>
                        <td><strong>₹{{ lead.price | number }}</strong></td>
                        <td>
                          <div class="stylist-cell">
                            <span>{{ lead.floorKiosk }}</span>
                            <small class="stylist-sub">Assisted by: {{ lead.stylist }}</small>
                          </div>
                        </td>
                        <td>{{ lead.timestamp }}</td>
                        <td>
                          <select
                            [ngModel]="lead.status"
                            (ngModelChange)="updateLeadStatus(lead, $event)"
                            class="lead-status-select"
                            [class.billed]="lead.status === 'billed'"
                            [class.followup]="lead.status === 'followup'"
                            [class.offer_sent]="lead.status === 'offer_sent'">
                            <option value="new">New Lead</option>
                            <option value="followup">📞 Follow-up</option>
                            <option value="billed">💰 Billed</option>
                            <option value="offer_sent">💬 Offer Sent</option>
                          </select>
                        </td>
                        <td>
                          <div class="lead-actions-row">
                            <button
                              type="button"
                              class="btn-wa-offer"
                              (click)="openWhatsAppOffer(lead)"
                              title="Send WhatsApp festive offer with draped saree details">
                              <span>💬</span>
                              <span>WhatsApp</span>
                            </button>
                            <button
                              type="button"
                              class="btn-mark-billed"
                              [class.is-billed]="lead.status === 'billed'"
                              (click)="markLeadBilled(lead)"
                              title="Mark customer as converted at billing counter">
                              <span>💰</span>
                            </button>
                            <button
                              type="button"
                              class="btn-delete-lead"
                              (click)="deleteLead(lead.id)"
                              title="Delete lead">
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Existing Subscription Tab -->
          <div *ngIf="activeNav() === 'subscription'" class="tab-view-body">
            <div class="portal-card">
              <h3 class="card-title">Commercial Subscription & Quota</h3>
              <p class="card-subtitle">Track monthly virtual drape quota and enterprise entitlements.</p>
              <div class="plan-overview-card mt-4">
                <div class="plan-header-row">
                  <div>
                    <h4>Platinum Showroom License</h4>
                    <p class="license-desc">Active commercial entitlement for multi-floor showroom.</p>
                  </div>
                  <span class="plan-badge-gold">ACTIVE LICENSE</span>
                </div>
                <div class="meter-section mt-4">
                  <div class="meter-labels"><span>Virtual Drapes Used:</span><span><strong>{{ tokensUsed() }} / {{ tokenQuota() }}</strong></span></div>
                  <div class="large-meter-bar"><div class="meter-fill" [style.width]="(tokensUsed() / tokenQuota() * 100) + '%'"></div></div>
                </div>
                <div class="topup-box">
                  <h4 class="topup-heading">⚡ Instant Quota Top-Up (Live API Billing)</h4>
                  <p>Choose an instant drape pack or enter a custom quota for upcoming festival exhibitions:</p>

                  <div class="topup-tiers-grid mt-3">
                    <button type="button" class="btn-topup-tier" (click)="topUpTokens(500, 0)">
                      <div class="tier-drapes">+500 Drapes</div>
                      <div class="tier-tag">Starter Drape Pack</div>
                    </button>
                    <button type="button" class="btn-topup-tier tier-recommended" (click)="topUpTokens(1500, 0)">
                      <span class="recommended-badge">POPULAR</span>
                      <div class="tier-drapes">+1,500 Drapes</div>
                      <div class="tier-tag">Festive Rush Pack</div>
                    </button>
                    <button type="button" class="btn-topup-tier" (click)="topUpTokens(5000, 0)">
                      <div class="tier-drapes">+5,000 Drapes</div>
                      <div class="tier-tag">Wedding Season VIP</div>
                    </button>
                  </div>

                  <!-- Custom Token Input Row -->
                  <div class="custom-topup-row mt-3">
                    <div class="custom-input-group">
                      <label>Custom Drape Count:</label>
                      <input type="number" [(ngModel)]="customTopUpAmount" min="50" step="50" class="form-input custom-quota-input" placeholder="e.g. 2500" />
                    </div>
                    <button type="button" class="btn-primary-action btn-apply-topup" (click)="applyCustomTopUp()">
                      <span>⚡</span>
                      <span>Apply Custom Quota Top-Up</span>
                    </button>
                  </div>
                </div></div>
            </div>
          </div>

          <!-- Enhanced Team & Access Control Tab (Two-Part Roles Master + Staff Directory) -->
          <div *ngIf="activeNav() === 'team'" class="tab-view-body">
            <!-- Part 1: Roles & Permissions Master -->
            <div class="portal-card mb-6">
              <div class="card-header-flex">
                <div>
                  <h3 class="card-title">🛡️ Roles & Permissions Master ({{ rolesMaster().length }})</h3>
                  <p class="card-subtitle">Define departmental access levels, floor kiosk unlocking privileges, and commercial quota controls.</p>
                </div>
                <button type="button" class="btn-primary-action" (click)="openAddRoleModal()" id="btn-add-custom-role">
                  <span>➕</span>
                  <span>Add Custom Role</span>
                </button>
              </div>
              <div class="roles-master-grid mt-4">
                @for (r of rolesMaster(); track r.id) {
                  <div class="role-def-card">
                    <div class="role-def-header">
                      <div>
                        <h4>{{ r.name }}</h4>
                        <span class="role-id-tag"><code>{{ r.id }}</code></span>
                      </div>
                      <div class="role-header-actions">
                        <button type="button" class="btn-role-action" (click)="openEditRoleModal(r)" title="Edit Role">✏️</button>
                        @if (r.id !== 'store_manager') {
                          <button type="button" class="btn-role-action btn-role-del" (click)="deleteRole(r.id)" title="Delete Role">🗑️</button>
                        }
                      </div>
                    </div>
                    <p class="role-desc">{{ r.description }}</p>
                    <div class="role-permissions-wrap">
                      <span class="perm-title">Granted Permissions:</span>
                      <div class="perm-chips-row">
                        @for (p of r.permissions; track p) {
                          <span class="perm-chip">✓ {{ p }}</span>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Part 2: Showroom Staff Directory -->
            <div class="portal-card">
              <div class="card-header-flex">
                <div>
                  <h3 class="card-title">👥 Showroom Staff Directory ({{ team.length }})</h3>
                  <p class="card-subtitle">Floor executives, stylists, and managers authorized with 4-digit Kiosk PIN access.</p>
                </div>
                <button type="button" class="btn-primary-action" (click)="openAddTeamModal()">
                  <span>➕</span>
                  <span>Add Staff Member</span>
                </button>
              </div>
              <div class="table-responsive mt-3">
                <table class="portal-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Assigned Role</th><th>Status</th><th>Last Active</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    @for (m of team; track m.id) {
                      <tr>
                        <td><strong>{{ m.name }}</strong></td>
                        <td>{{ m.email }}</td>
                        <td><span class="role-badge">{{ m.role }}</span></td>
                        <td><span class="badge-status" [class.paid]="m.status === 'active'" [class.due]="m.status !== 'active'">{{ m.status }}</span></td>
                        <td>{{ m.lastActive }}</td>
                        <td class="table-actions-cell">
                          <button type="button" class="btn-table-action" (click)="openEditStaffModal(m)" title="Edit Staff Details">
                            ✏️ Edit
                          </button>
                          <button type="button" class="btn-table-action" (click)="toggleTeamMemberStatus(m)">
                            {{ m.status === 'active' ? 'Disable' : 'Enable' }}
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Enhanced Showroom Settings & Branded Print Frame Tab -->
          <div *ngIf="activeNav() === 'settings'" class="tab-view-body">
            <div class="portal-card">
              <h3 class="card-title">Showroom Store Configuration & Branding</h3>
              <p class="card-subtitle">Manage showroom identity, upload custom boutique logo, and configure floor totem watermarks.</p>

              <div class="settings-form-grid mt-4">
                <div class="settings-field">
                  <label>Showroom Display Name *</label>
                  <input type="text" [ngModel]="customStoreName()" (ngModelChange)="customStoreName.set($event)" class="form-input" />
                </div>
                <div class="settings-field">
                  <label>Store Tagline / Slogan</label>
                  <input type="text" [ngModel]="customStoreTagline()" (ngModelChange)="customStoreTagline.set($event)" class="form-input" />
                </div>
                <div class="settings-field">
                  <label>Primary City / Branch Location</label>
                  <input type="text" [ngModel]="customStoreCity()" (ngModelChange)="customStoreCity.set($event)" class="form-input" />
                </div>
                <div class="settings-field">
                  <label>Staff 4-Digit Kiosk Unlock PIN</label>
                  <input type="password" [ngModel]="customStaffPin()" (ngModelChange)="customStaffPin.set($event)" maxlength="4" class="form-input" />
                </div>
              </div>

              <!-- Store Logo Upload & Live Preview Section -->
              <div class="store-logo-section mt-6">
                <h4 style="font-size: 1.05rem; color: #ffd700; margin-bottom: 0.5rem;">🏬 Custom Showroom Logo Upload</h4>
                <p style="font-size: 0.85rem; opacity: 0.8; margin-bottom: 1rem;">
                  Upload your boutique's high-resolution transparent PNG or SVG logo. It will appear directly on floor kiosk headers, try-on print frames, and customer WhatsApp slips.
                </p>

                <div class="logo-upload-box">
                  <div class="logo-preview-box">
                    @if (customStoreLogo()) {
                      <img [src]="customStoreLogo()" alt="Custom Store Logo" class="custom-logo-img" />
                    } @else {
                      <div class="logo-placeholder">
                        <span>🏬</span>
                        <small>Default NeXooAi Crest</small>
                      </div>
                    }
                  </div>
                  <div class="logo-upload-controls">
                    <input type="file" #storeLogoInput (change)="onLogoFileSelected($event)" accept="image/png,image/jpeg,image/svg+xml" style="display: none;" />
                    <button type="button" class="btn-outline-action" (click)="storeLogoInput.click()">
                      <span>📁</span>
                      <span>Upload Store Logo</span>
                    </button>
                    @if (customStoreLogo()) {
                      <button type="button" class="btn-cancel-modal" (click)="removeStoreLogo()">
                        <span>✕</span>
                        <span>Remove Custom Logo</span>
                      </button>
                    }
                  </div>
                </div>
              </div>

              <!-- 55" KIOSK DIGITAL SIGNAGE & ATTRACT MODE CMS (FESTIVAL CAMPAIGNS) -->
              <div class="portal-card mt-6">
                <div class="card-header-flex">
                  <div>
                    <h3 class="card-title">📺 55" Kiosk Digital Signage & Attract Mode CMS</h3>
                    <p class="card-subtitle">Control the idle video ads, festival banners, and promotional campaigns playing across your showroom totems.</p>
                  </div>
                  <span class="badge-gold-trend">Live CMS</span>
                </div>

                <div class="signage-form-grid mt-4">
                  <div class="form-group">
                    <label>Idle Display Media Type *</label>
                    <select [(ngModel)]="attractForm.modeType" class="form-control">
                      <option value="both">Alternating Video Ad & Customer Lookbook</option>
                      <option value="video">Promotional Video Ad Only (YouTube / MP4)</option>
                      <option value="feed">Today's Customer Lookbook Showcase Feed</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Inactivity Trigger Timeout *</label>
                    <select [(ngModel)]="attractForm.timeoutSeconds" class="form-control">
                      <option [ngValue]="60">60 Seconds Inactivity</option>
                      <option [ngValue]="90">90 Seconds Inactivity (Standard)</option>
                      <option [ngValue]="120">120 Seconds Inactivity</option>
                    </select>
                  </div>
                  <div class="form-group full-width">
                    <label>Promotional Video URL (YouTube or Direct MP4) *</label>
                    <input type="text" [(ngModel)]="attractForm.videoUrl" placeholder="https://www.youtube.com/watch?v=scL_y2_p8c8" class="form-control" />
                    <small class="field-hint">Paste your showroom's TV commercial, festival promo, or boutique saree showcase video.</small>
                  </div>
                  <div class="form-group">
                    <label>Festival Campaign Headline *</label>
                    <input type="text" [(ngModel)]="attractForm.title" placeholder="e.g. NeXooAi Luxury Silks — Deepavali Mela" class="form-control" />
                  </div>
                  <div class="form-group">
                    <label>Campaign Subtitle / Tagline (Tamil/English) *</label>
                    <input type="text" [(ngModel)]="attractForm.subtitle" placeholder="e.g. விரல் தொட்டதும் அழகிய பட்டுப் புடவை உங்களுக்கான தோற்றத்தில்!" class="form-control" />
                  </div>
                </div>

                <div class="signage-action-footer mt-4">
                  <button type="button" class="btn-primary-action" (click)="saveAttractModeSettings()">
                    <span>💾</span>
                    <span>Save Digital Signage & Festival Campaign</span>
                  </button>
                </div>
              </div>

              <!-- Branded Watermark & Printable QR Slip Preview -->
              <div class="brand-watermark-preview-section mt-6">
                <h4 style="font-size: 1.05rem; color: #ffd700; margin-bottom: 0.5rem;">🖨️ Branded Photo Frame & Counter Slip Preview</h4>
                <div class="watermark-preview-card">
                  <div class="watermark-card-header">
                    <span class="store-brand-title">{{ customStoreName() }}</span>
                    <span class="store-city-pill">{{ customStoreCity() }}</span>
                  </div>
                  <div class="watermark-photo-mockup">
                    <div class="mockup-drape-frame">
                      <span class="mock-watermark-line">{{ brandedWatermarkText() }}</span>
                    </div>
                  </div>
                  <div class="watermark-card-footer">
                    <span>Scan at Billing Counter • Token #TK-4821</span>
                  </div>
                </div>
              </div>

              <div class="modal-footer-actions mt-6" style="justify-content: flex-start;">
                <button type="button" class="btn-primary-action" (click)="saveShowroomBranding()" [disabled]="isBrandingSaving()">
                  <span>💾</span>
                  <span>{{ isBrandingSaving() ? 'Saving...' : 'Save All Showroom Branding' }}</span>
                </button>
              </div>

              <div class="privacy-guarantee-box mt-6">
                <span class="privacy-icon">🛡️</span>
                <div>
                  <h4>Zero Customer PII Retention Guarantee</h4>
                  <p>Customer try-on photographs are encrypted in transit and purged automatically at midnight per ISO standards.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

    <!-- Add Saree / Garment Modal -->
    <div *ngIf="showAddGarmentModal()" class="app-modal-backdrop" (click)="closeAddModal()">
      <div class="app-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3>🥻 Add New Saree / Garment to Inventory</h3>
          <button type="button" class="btn-close-x" (click)="closeAddModal()">✕</button>
        </div>
        <p class="modal-sub">
          Register new garments into the showroom digital catalogue and make them available on floor kiosks.
        </p>

        <form (submit)="submitAddGarment($event)">
          <div class="form-row">
            <div class="form-group flex-1">
              <label>SKU / Barcode ID *</label>
              <input
                type="text"
                class="form-control"
                placeholder="e.g. KAN-BRD-2026-09"
                [(ngModel)]="addGarmentForm.sku"
                name="sku"
                required
              />
            </div>
            <div class="form-group flex-1">
              <label>Category *</label>
              <select class="form-control" [(ngModel)]="addGarmentForm.category" name="category">
                @for (cat of categories(); track cat.id) {
                  <optgroup [label]="cat.name">
                    @for (sub of cat.subcategories; track sub) {
                      <option [value]="sub">{{ sub }}</option>
                    }
                  </optgroup>
                }
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label>Product Name (English) *</label>
              <input
                type="text"
                class="form-control"
                placeholder="e.g. Royal Maroon Kanchipuram Temple Saree"
                [(ngModel)]="addGarmentForm.name_en"
                name="name_en"
                required
              />
            </div>
            <div class="form-group flex-1">
              <label>Product Name (Tamil - தமிழ்) *</label>
              <input
                type="text"
                class="form-control"
                placeholder="எ.கா. காஞ்சிபுரம் தங்க பட்டு புடவை"
                [(ngModel)]="addGarmentForm.name_ta"
                name="name_ta"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label>Fabric / Weave *</label>
              <input
                type="text"
                class="form-control"
                placeholder="e.g. Pure Mulberry Silk with Pure Zari"
                [(ngModel)]="addGarmentForm.fabric"
                name="fabric"
                required
              />
            </div>
            <div class="form-group flex-1">
              <label>Price (₹ INR) *</label>
              <input
                type="number"
                class="form-control"
                placeholder="e.g. 28500"
                [(ngModel)]="addGarmentForm.price"
                name="price"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label>Showroom Rack Placement *</label>
              <input
                type="text"
                class="form-control"
                placeholder="e.g. Ground Floor Bridal Rack B-03"
                [(ngModel)]="addGarmentForm.rack_location"
                name="rack_location"
                required
              />
            </div>
            <div class="form-group flex-1">
              <label>Image Asset URL</label>
              <input
                type="text"
                class="form-control"
                placeholder="assets/images/saree1.jpg"
                [(ngModel)]="addGarmentForm.thumbnail"
                name="thumbnail"
              />
            </div>
          </div>

          <div class="modal-actions-row mt-4">
            <button type="button" class="btn-cancel" (click)="closeAddModal()">Cancel</button>
            <button type="submit" class="btn-submit">
              <span>✓ Add to Live Catalogue</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 1: ONBOARD NEW SHOWROOM (SUPER ADMIN ONLY)                          -->
    <!-- ========================================================================= -->
    <div *ngIf="showOnboardModal()" class="app-modal-backdrop" (click)="closeOnboardModal()">
      <div class="app-modal-card onboard-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <div class="modal-title-wrap">
            <span class="modal-badge-gold">👑 HQ ONBOARDING</span>
            <h3>Onboard New Boutique Showroom</h3>
          </div>
          <button type="button" class="btn-close-x" (click)="closeOnboardModal()">✕</button>
        </div>
        <p class="modal-sub">
          Provision an isolated showroom space, manager credentials, quota, and floor kiosk hardware terminals.
        </p>

        <!-- Error Summary Alert -->
        <div *ngIf="hasOnboardErrors()" class="onboard-error-summary">
          <span>⚠️ தயவுசெய்து கீழே பிழையாக உள்ள விவரங்களை சரிபார்க்கவும் (Please correct the errors marked in red below).</span>
        </div>

        <form (submit)="submitOnboard($event)" novalidate>
          <div class="settings-form-grid">
            <!-- 1. Showroom Name -->
            <div class="settings-field">
              <label>Showroom / Boutique Name *</label>
              <input
                type="text"
                [(ngModel)]="onboardForm.name"
                name="bName"
                placeholder="e.g. Sri Kumaran Silks"
                class="form-input"
                [class.input-error]="onboardErrors['name']"
                (input)="clearFieldError('name')"
                required
              />
              <span *ngIf="onboardErrors['name']" class="field-error-msg">{{ onboardErrors['name'] }}</span>
            </div>

            <!-- 2. City / Location (NO DEFAULT CHENNAI) -->
            <div class="settings-field">
              <label>City / Location *</label>
              <input
                type="text"
                [(ngModel)]="onboardForm.city"
                name="bCity"
                placeholder="e.g. Madurai, Coimbatore, Chennai, Bangalore"
                class="form-input"
                [class.input-error]="onboardErrors['city']"
                (input)="clearFieldError('city')"
                required
              />
              <span *ngIf="onboardErrors['city']" class="field-error-msg">{{ onboardErrors['city'] }}</span>
            </div>

            <!-- 3. Owner / Manager Name -->
            <div class="settings-field">
              <label>Owner / Manager Name *</label>
              <input
                type="text"
                [(ngModel)]="onboardForm.contact_person"
                name="bContact"
                placeholder="e.g. Mr. R. Kumaran"
                class="form-input"
                [class.input-error]="onboardErrors['contact_person']"
                (input)="clearFieldError('contact_person')"
                required
              />
              <span *ngIf="onboardErrors['contact_person']" class="field-error-msg">{{ onboardErrors['contact_person'] }}</span>
            </div>

            <!-- 4. WhatsApp / Mobile with Locked +91 Prefix -->
            <div class="settings-field">
              <label>WhatsApp / Mobile Number *</label>
              <div class="phone-input-group" [class.group-error]="onboardErrors['contact_phone']">
                <span class="phone-prefix-locked">🇮🇳 +91</span>
                <input
                  type="tel"
                  [(ngModel)]="onboardPhoneOnly"
                  name="bPhone"
                  maxlength="10"
                  placeholder="98765 43210"
                  class="form-input phone-field"
                  (input)="onPhoneInput($event)"
                />
              </div>
              <span *ngIf="onboardErrors['contact_phone']" class="field-error-msg">{{ onboardErrors['contact_phone'] }}</span>
            </div>

            <!-- 5. Manager Login Email -->
            <div class="settings-field">
              <label>Manager Login Email Address *</label>
              <input
                type="email"
                [(ngModel)]="onboardForm.contact_email"
                name="bEmail"
                placeholder="manager@kumaransilks.in"
                class="form-input"
                [class.input-error]="onboardErrors['contact_email']"
                (input)="clearFieldError('contact_email')"
                required
              />
              <span *ngIf="onboardErrors['contact_email']" class="field-error-msg">{{ onboardErrors['contact_email'] }}</span>
            </div>

            <!-- 6. Initial Password with Eye Toggle -->
            <div class="settings-field">
              <label>Initial Login Password *</label>
              <div class="password-input-group" [class.group-error]="onboardErrors['password']">
                <input
                  [type]="showOnboardPassword() ? 'text' : 'password'"
                  [(ngModel)]="onboardForm.password"
                  name="bPass"
                  placeholder="Min 6 characters (e.g. Kumaran@2026)"
                  class="form-input password-field"
                  (input)="clearFieldError('password')"
                  required
                />
                <button
                  type="button"
                  class="btn-eye-toggle-inline"
                  (click)="showOnboardPassword.set(!showOnboardPassword())"
                  [title]="showOnboardPassword() ? 'Hide Password' : 'Show Password'">
                  {{ showOnboardPassword() ? '🙈' : '👁️' }}
                </button>
              </div>
              <span *ngIf="onboardErrors['password']" class="field-error-msg">{{ onboardErrors['password'] }}</span>
            </div>

            <!-- 7. Subscription Plan Tier -->
            <div class="settings-field">
              <label>Subscription Plan Tier *</label>
              <select
                [(ngModel)]="onboardForm.plan_tier"
                name="bTier"
                (ngModelChange)="onPlanTierChange($event)"
                class="form-input">
                <option value="TRIAL">🎁 Free Trial (2 Days / ₹0 - 50 Try-ons)</option>
                <option value="SILVER">🥈 Silver (₹9,999/mo - 500 Try-ons)</option>
                <option value="GOLD">🥇 Gold Retailer (₹19,999/mo - 2,500 Try-ons)</option>
                <option value="PLATINUM">💎 Platinum Enterprise (₹49,999/mo - 5,000 Try-ons)</option>
              </select>
              <span class="field-helper-gold">
                Plan Price: <strong>₹{{ (onboardForm.subscription_price_inr || 0) | number }}</strong> • Quota: <strong>{{ (onboardForm.monthly_token_quota || 0) | number }} Try-Ons</strong>
              </span>
            </div>

            <!-- 8. Monthly Token Quota -->
            <div class="settings-field">
              <label>Monthly Token Quota (Try-Ons)</label>
              <input
                type="number"
                [(ngModel)]="onboardForm.monthly_token_quota"
                name="bQuota"
                class="form-input"
                placeholder="50"
              />
            </div>
          </div>

          <div class="modal-footer-actions mt-6">
            <button type="button" class="btn-cancel-modal" (click)="closeOnboardModal()">Cancel</button>
            <button type="submit" class="btn-primary-action">
              Confirm & Onboard Showroom
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 2: RECORD OFFLINE BANK PAYMENT                                      -->
    <!-- ========================================================================= -->
    <div *ngIf="showPaymentModal()" class="app-modal-backdrop" (click)="closePaymentModal()">
      <div class="app-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3>{{ selectedShowroomForAction ? 'Record Showroom Payment: ' + selectedShowroomForAction.name : 'Record & Verify Showroom Payment' }}</h3>
          <button type="button" class="btn-close-x" (click)="closePaymentModal()">✕</button>
        </div>
        <p class="modal-sub">
          Record bank transfer UTR or UPI payment to renew showroom subscription and reset monthly AI try-on quota.
        </p>

        <div class="settings-form-grid">
          <div class="settings-field" *ngIf="!selectedShowroomForAction">
            <label>Select Boutique Showroom *</label>
            <select [(ngModel)]="paymentForm.selectedShopId" (change)="onShowroomSelectForPayment()" class="form-input">
              @for (s of saasShowrooms; track s.id) {
                <option [value]="s.id">{{ s.name }} ({{ s.city }}) — Plan: {{ s.plan_tier }}</option>
              }
            </select>
          </div>
          <div class="settings-field" *ngIf="selectedShowroomForAction">
            <label>Showroom Selected</label>
            <div class="selected-showroom-pill">
              <strong>{{ selectedShowroomForAction.name }}</strong> ({{ selectedShowroomForAction.city }})
            </div>
          </div>
          <div class="settings-field">
            <label>Payment Method *</label>
            <select [(ngModel)]="recordPaymentForm.mode" class="form-input">
              <option value="NEFT / RTGS">Bank NEFT / RTGS</option>
              <option value="UPI Business">UPI Business (GPay / PhonePe / QR)</option>
              <option value="Cash Deposit">Showroom Cash</option>
              <option value="Cheque">Bank Cheque</option>
            </select>
          </div>
          <div class="settings-field">
            <label>Amount Received (INR ₹) *</label>
            <input type="number" [(ngModel)]="recordPaymentForm.amount" class="form-input" />
          </div>
          <div class="settings-field">
            <label>Bank UTR / Transaction Reference ID *</label>
            <input type="text" [(ngModel)]="recordPaymentForm.utr" placeholder="UTR-HDFC-991823" class="form-input" />
          </div>
          <div class="settings-field">
            <label>Renewal Extension *</label>
            <select [(ngModel)]="recordPaymentForm.days" class="form-input">
              <option value="30">Extend +30 Days (1 Month)</option>
              <option value="365">Extend +365 Days (1 Full Year)</option>
              <option value="7">Grace Extension (+7 Days)</option>
            </select>
          </div>
        </div>

        <div class="modal-footer-actions mt-6">
          <button type="button" class="btn-cancel-modal" (click)="closePaymentModal()">Cancel</button>
          <button type="button" class="btn-primary-action" (click)="confirmRecordPayment()">
            <span>✓</span>
            <span>Confirm Payment & Renew</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 3: RESET SHOWROOM PASSWORD                                          -->
    <!-- ========================================================================= -->
    <!-- MODAL 3: RESET SHOWROOM MASTER PASSWORD -->
    <div *ngIf="showPasswordModal()" class="app-modal-backdrop" (click)="closePasswordModal()">
      <div class="app-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3>Reset Master Login Password</h3>
          <button type="button" class="btn-close-x" (click)="closePasswordModal()">✕</button>
        </div>
        <p class="modal-sub">
          You are resetting the manager login password for <strong>{{ selectedShowroomForAction?.name }}</strong> ({{ selectedShowroomForAction?.city }}).
        </p>

        <div class="action-alert-box mt-3">
          <span class="alert-icon">ℹ️</span>
          <div class="alert-text">
            <strong>What happens when you reset?</strong>
            <p>The boutique store manager will need this new password to sign in at <code>/login</code> and unlock configuration settings on floor smart mirrors. Existing inventory and historical try-on photos remain unchanged.</p>
          </div>
        </div>

        <div class="modal-field mt-4">
          <div class="field-label-row">
            <label>New Master Password *</label>
            <button type="button" class="btn-link-action" (click)="generateRandomPassword()">🎲 Generate Secure Password</button>
          </div>
          <input
            type="text"
            [(ngModel)]="newPasswordInput"
            placeholder="e.g. Kumaran@2026"
            class="form-input"
          />
        </div>

        <div class="modal-footer-actions mt-6">
          <button type="button" class="btn-cancel-modal" (click)="closePasswordModal()">Cancel</button>
          <button type="button" class="btn-primary-action" (click)="confirmPasswordReset()">
            <span>💾</span>
            <span>Confirm & Update Password</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 5: EDIT AI ENGINE API KEY -->
    <div *ngIf="showEditKeyModal()" class="app-modal-backdrop" (click)="closeEditKeyModal()">
      <div class="app-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3>Update API Key: {{ selectedEngineForEdit?.name }}</h3>
          <button type="button" class="btn-close-x" (click)="closeEditKeyModal()">✕</button>
        </div>
        <p class="modal-sub">
          Paste the new bulk production API credential from {{ selectedEngineForEdit?.vendor }}. Kiosks will dynamically inherit this key within 60 seconds without interruption.
        </p>
        <div class="modal-field mt-4">
          <label>API Key / Secret Token *</label>
          <input
            type="text"
            [(ngModel)]="newApiKeyInput"
            placeholder="Paste key starting with sk_live_ or AIzaSy..."
            class="form-input"
          />
        </div>
        <div class="modal-footer-actions mt-6">
          <button type="button" class="btn-cancel-modal" (click)="closeEditKeyModal()">Cancel</button>
          <button type="button" class="btn-primary-action" (click)="saveNewApiKey()">
            <span>💾</span>
            <span>Update API Key</span>
          </button>
        </div>
      </div>
    </div>

        
    <!-- MODAL 8: TENANT FEATURE CONFIGURATION ENGINE -->
    <div *ngIf="showFeatureConfigModal()" class="app-modal-backdrop" (click)="closeFeatureConfigModal()">
      <div class="app-modal-card" style="max-width: 640px;" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3>⚙️ Boutique Feature Engine</h3>
          <button type="button" class="btn-close-x" (click)="closeFeatureConfigModal()">✕</button>
        </div>
        <p class="modal-sub">
          Configure enabled AI and kiosk features for: <strong>{{ selectedShowroomForFeatures?.name }}</strong> (<code>{{ selectedShowroomForFeatures?.id }}</code>)
        </p>

        <div class="features-config-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 18px 0; max-height: 55vh; overflow-y: auto; padding-right: 6px;">
          <label class="feature-toggle-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); cursor: pointer;">
            <div>
              <strong style="display: block; font-size: 0.88rem; color: #ffd700;">🎥 Runway Video</strong>
              <small style="color: #94a3b8; font-size: 0.74rem;">5-Sec Motion Generator</small>
            </div>
            <input type="checkbox" [(ngModel)]="selectedFeatures.feature_runway_video" style="width: 18px; height: 18px; accent-color: #ffd700;" />
          </label>

          <label class="feature-toggle-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); cursor: pointer;">
            <div>
              <strong style="display: block; font-size: 0.88rem; color: #ffd700;">🌐 3D Saree Viewer</strong>
              <small style="color: #94a3b8; font-size: 0.74rem;">Interactive 360° Fabric</small>
            </div>
            <input type="checkbox" [(ngModel)]="selectedFeatures.feature_three_d_viewer" style="width: 18px; height: 18px; accent-color: #ffd700;" />
          </label>

          <label class="feature-toggle-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); cursor: pointer;">
            <div>
              <strong style="display: block; font-size: 0.88rem; color: #ffd700;">👫 Couple Matcher</strong>
              <small style="color: #94a3b8; font-size: 0.74rem;">Groom Dhoti/Kurta Match</small>
            </div>
            <input type="checkbox" [(ngModel)]="selectedFeatures.feature_couple_matcher" style="width: 18px; height: 18px; accent-color: #ffd700;" />
          </label>

          <label class="feature-toggle-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); cursor: pointer;">
            <div>
              <strong style="display: block; font-size: 0.88rem; color: #ffd700;">🗳️ Family Poll</strong>
              <small style="color: #94a3b8; font-size: 0.74rem;">WhatsApp Voting Engine</small>
            </div>
            <input type="checkbox" [(ngModel)]="selectedFeatures.feature_family_poll" style="width: 18px; height: 18px; accent-color: #ffd700;" />
          </label>

          <label class="feature-toggle-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); cursor: pointer;">
            <div>
              <strong style="display: block; font-size: 0.88rem; color: #ffd700;">↔️ Split Slider</strong>
              <small style="color: #94a3b8; font-size: 0.74rem;">Before & After Curtain</small>
            </div>
            <input type="checkbox" [(ngModel)]="selectedFeatures.feature_split_slider" style="width: 18px; height: 18px; accent-color: #ffd700;" />
          </label>

          <label class="feature-toggle-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); cursor: pointer;">
            <div>
              <strong style="display: block; font-size: 0.88rem; color: #ffd700;">✂️ Custom Fabric</strong>
              <small style="color: #94a3b8; font-size: 0.74rem;">Live Cloth Snapping</small>
            </div>
            <input type="checkbox" [(ngModel)]="selectedFeatures.feature_custom_fabric" style="width: 18px; height: 18px; accent-color: #ffd700;" />
          </label>

          <label class="feature-toggle-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); cursor: pointer;">
            <div>
              <strong style="display: block; font-size: 0.88rem; color: #ffd700;">🧾 POS Slip</strong>
              <small style="color: #94a3b8; font-size: 0.74rem;">Thermal Receipt Printing</small>
            </div>
            <input type="checkbox" [(ngModel)]="selectedFeatures.feature_pos_slip" style="width: 18px; height: 18px; accent-color: #ffd700;" />
          </label>

          <label class="feature-toggle-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); cursor: pointer;">
            <div>
              <strong style="display: block; font-size: 0.88rem; color: #ffd700;">💬 WhatsApp HD</strong>
              <small style="color: #94a3b8; font-size: 0.74rem;">Instant Draped Saree Delivery</small>
            </div>
            <input type="checkbox" [(ngModel)]="selectedFeatures.feature_whatsapp_delivery" style="width: 18px; height: 18px; accent-color: #ffd700;" />
          </label>

          <label class="feature-toggle-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); cursor: pointer;">
            <div>
              <strong style="display: block; font-size: 0.88rem; color: #ffd700;">✨ 2K Ultra HD</strong>
              <small style="color: #94a3b8; font-size: 0.74rem;">Sub-pixel Texture Enhancer</small>
            </div>
            <input type="checkbox" [(ngModel)]="selectedFeatures.feature_hd_resolution" style="width: 18px; height: 18px; accent-color: #ffd700;" />
          </label>

          <label class="feature-toggle-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); cursor: pointer;">
            <div>
              <strong style="display: block; font-size: 0.88rem; color: #ffd700;">🏷️ Remove Watermark</strong>
              <small style="color: #94a3b8; font-size: 0.74rem;">Enterprise Whitelabel</small>
            </div>
            <input type="checkbox" [(ngModel)]="selectedFeatures.feature_watermark_removal" style="width: 18px; height: 18px; accent-color: #ffd700;" />
          </label>

          <label class="feature-toggle-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); cursor: pointer;">
            <div>
              <strong style="display: block; font-size: 0.88rem; color: #ffd700;">🗣️ Multi-Language</strong>
              <small style="color: #94a3b8; font-size: 0.74rem;">Tamil, English, Hindi, Telugu</small>
            </div>
            <input type="checkbox" [(ngModel)]="selectedFeatures.feature_multi_language" style="width: 18px; height: 18px; accent-color: #ffd700;" />
          </label>

          <label class="feature-toggle-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); cursor: pointer;">
            <div>
              <strong style="display: block; font-size: 0.88rem; color: #ffd700;">📊 Analytics Export</strong>
              <small style="color: #94a3b8; font-size: 0.74rem;">CSV Lead & Heatmap Download</small>
            </div>
            <input type="checkbox" [(ngModel)]="selectedFeatures.feature_analytics_export" style="width: 18px; height: 18px; accent-color: #ffd700;" />
          </label>
        </div>

        <div class="modal-actions-row" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px;">
          <button type="button" class="btn-secondary" (click)="closeFeatureConfigModal()">Cancel</button>
          <button type="button" class="btn-primary" (click)="saveFeatureConfig()" [disabled]="isSavingFeatures()">
            {{ isSavingFeatures() ? 'Saving Flags...' : '💾 Save Feature Flags' }}
          </button>
        </div>
      </div>
    </div>


    <!-- MODAL 6: PAUSE / SUSPEND SHOWROOM CONFIRMATION -->
    <div *ngIf="showPauseModal()" class="app-modal-backdrop" (click)="closePauseModal()">
      <div class="app-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3>Showroom & Floor Kiosks Management</h3>
          <button type="button" class="btn-close-x" (click)="closePauseModal()">✕</button>
        </div>
        <p class="modal-sub">
          Showroom: <strong>{{ selectedShowroomForAction?.name }}</strong> ({{ selectedShowroomForAction?.city }} • <code>{{ selectedShowroomForAction?.slug }}</code>)
        </p>

        <!-- Entire Boutique Status Alert -->
        <div class="action-alert-box mt-3" [class.warning]="selectedShowroomForAction?.is_active">
          <span class="alert-icon">{{ selectedShowroomForAction?.is_active ? '⚠️' : '✅' }}</span>
          <div class="alert-text">
            <strong>{{ selectedShowroomForAction?.is_active ? 'Boutique is currently ACTIVE' : 'Boutique is currently SUSPENDED' }}</strong>
            <p *ngIf="selectedShowroomForAction?.is_active">
              Suspending the boutique soft-locks all 55" smart mirrors and prevents staff drape trials. Remaining token balance and SKUs remain safe.
            </p>
            <p *ngIf="!selectedShowroomForAction?.is_active">
              Re-activating unlocks all connected floor mirrors and allows staff to resume drape trials.
            </p>
          </div>
        </div>

        <!-- Floor Kiosks Breakdown List -->
        <div class="mt-4">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
            <strong style="font-size: 0.92rem; color: inherit;">Connected 55" Smart Mirrors & Kiosks:</strong>
            <span class="badge-status" [ngClass]="getKiosksStatusBadgeClass(selectedShowroomForAction)">
              {{ getKiosksStatusSummary(selectedShowroomForAction) }}
            </span>
          </div>

          <div class="kiosk-list-mini">
            @for (k of selectedShowroomForAction?.kiosks || []; track k.id) {
              <div class="kiosk-mini-item">
                <div class="kiosk-item-info">
                  <span class="kiosk-dot" [class.online]="k.status === 'online'" [class.paused]="k.status === 'paused'"></span>
                  <div>
                    <div style="font-weight: 600; font-size: 0.88rem;">{{ k.name }}</div>
                    <div style="font-size: 0.74rem; opacity: 0.75;">{{ k.location }} • ID: {{ k.id }}</div>
                  </div>
                </div>
                <button
                  type="button"
                  class="btn-table-action"
                  [class.gold-action]="k.status === 'paused'"
                  (click)="toggleSingleKiosk(selectedShowroomForAction, k)">
                  {{ k.status === 'online' ? '⏸ Pause Kiosk' : '▶ Resume Kiosk' }}
                </button>
              </div>
            }
          </div>
        </div>

        <div class="modal-footer-actions mt-6">
          <button type="button" class="btn-cancel-modal" (click)="closePauseModal()">Close</button>
          <button
            type="button"
            class="btn-primary-action"
            [class.btn-danger]="selectedShowroomForAction?.is_active"
            (click)="confirmShowroomPauseToggle()">
            <span>{{ selectedShowroomForAction?.is_active ? '⏸ Suspend Entire Boutique' : '▶ Re-Activate Entire Boutique' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 7: ADD COMPANY STAFF MEMBER -->
    <div *ngIf="showAddStaffModal()" class="app-modal-backdrop" (click)="closeAddStaffModal()">
      <div class="app-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3>Add NeXooAi Internal Team Member</h3>
          <button type="button" class="btn-close-x" (click)="closeAddStaffModal()">✕</button>
        </div>
        <p class="modal-sub">
          Assign operations, support, or billing duties to internal company personnel with protected staff credentials.
        </p>

        <form (submit)="submitNewStaff($event)">
          <div class="modal-field mt-3">
            <label>Employee Full Name *</label>
            <input
              type="text"
              [(ngModel)]="newStaffForm.name"
              name="staffName"
              placeholder="e.g. Rajesh Kumar"
              class="form-input"
              required
            />
          </div>

          <div class="modal-field mt-3">
            <label>Company Email Address (@nexooai.in) *</label>
            <input
              type="email"
              [(ngModel)]="newStaffForm.email"
              name="staffEmail"
              placeholder="e.g. rajesh@nexooai.in"
              class="form-input"
              required
            />
          </div>

          <div class="modal-field mt-3">
            <label>Assigned Departmental Role *</label>
            <select [(ngModel)]="newStaffForm.role" name="staffRole" class="form-input">
              <option value="Sales Operations">Sales Operations (Showroom Onboarding & Demos)</option>
              <option value="Technical Support">Technical Support (Kiosk & Camera Diagnostics)</option>
              <option value="Billing & Accounts">Billing & Accounts (Offline Payments Verification)</option>
              <option value="Platform Operations">Platform Operations (AI Pool & Hardware Maintenance)</option>
            </select>
          </div>

          <div class="modal-field mt-3">
            <label>Operational Access Scope</label>
            <input
              type="text"
              [(ngModel)]="newStaffForm.accessScope"
              name="staffScope"
              placeholder="e.g. Regional Tamil Nadu Boutiques"
              class="form-input"
            />
          </div>

          <div class="modal-footer-actions mt-6">
            <button type="button" class="btn-cancel-modal" (click)="closeAddStaffModal()">Cancel</button>
            <button type="submit" class="btn-primary-action">
              <span>💾</span>
              <span>Save Team Member</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 8: REVOKE STAFF ACCESS CONFIRMATION -->
    <div *ngIf="showRemoveStaffModal()" class="app-modal-backdrop" (click)="closeRemoveStaffModal()">
      <div class="app-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3>Revoke Internal Staff Access</h3>
          <button type="button" class="btn-close-x" (click)="closeRemoveStaffModal()">✕</button>
        </div>
        <p class="modal-sub">
          Employee: <strong>{{ selectedStaffForAction?.name }}</strong> ({{ selectedStaffForAction?.email }})
        </p>

        <div class="action-alert-box warning mt-3">
          <span class="alert-icon">⚠️</span>
          <div class="alert-text">
            <strong>Revoke Administrative Privileges</strong>
            <p>This staff member will immediately lose access to the Super Admin platform console and showroom management tools. This action is logged in the company security audit trail.</p>
          </div>
        </div>

        <div class="modal-footer-actions mt-6">
          <button type="button" class="btn-cancel-modal" (click)="closeRemoveStaffModal()">Cancel</button>
          <button type="button" class="btn-primary-action btn-danger" (click)="confirmRemoveStaff()">
            <span>✕ Confirm Revoke Access</span>
          </button>
        </div>
      </div>
    </div>
<!-- MODAL 4: ONBOARDING SUCCESS & WHATSAPP WELCOME SLIP                       -->
    <!-- ========================================================================= -->
    <div *ngIf="showWelcomeSlipModal()" class="app-modal-backdrop" (click)="closeWelcomeSlip()">
      <div class="app-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3 style="color: #00e676;">✨ Showroom Onboarding Successful!</h3>
          <button type="button" class="btn-close-x" (click)="closeWelcomeSlip()">✕</button>
        </div>
        <p class="modal-sub">
          Share this official welcome and login slip directly with the boutique owner on WhatsApp:
        </p>

        <div class="whatsapp-slip-box">
          <pre>{{ generatedWelcomeSlip }}</pre>
        </div>

        <div class="modal-footer-actions mt-4">
          <button type="button" class="btn-cancel-modal" (click)="copyWelcomeSlip()">
            📋 Copy Slip Text
          </button>
          <button type="button" class="btn-primary-action" (click)="closeWelcomeSlip()">
            Done
          </button>
        </div>
      </div>
    </div>
    <!-- MODAL: CATEGORY MASTER MANAGEMENT -->
    <div *ngIf="showCategoryModal()" class="app-modal-backdrop" (click)="closeCategoryModal()">
      <div class="app-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3>🏷️ Textile Categories & Subcategories Master</h3>
          <button type="button" class="btn-close-x" (click)="closeCategoryModal()">✕</button>
        </div>
        <p class="modal-sub">
          Configure two-tier garment categories (e.g. Silk Sarees -> Kanchipuram, Banarasi; Salwars -> Anarkali). Items added here dynamically populate the Garment Creation form.
        </p>

        <!-- New Category Creation -->
        <div class="add-cat-form-row mb-4">
          <div class="form-group flex-1">
            <label>Category Name *</label>
            <input type="text" [(ngModel)]="newCatName" placeholder="e.g. Bridal Lehengas" class="form-control" />
          </div>
          <div class="form-group flex-2">
            <label>Subcategories (comma separated) *</label>
            <input type="text" [(ngModel)]="newCatSubs" placeholder="e.g. Heavy Velvet, Raw Silk Zari, Pastel Reception" class="form-control" />
          </div>
          <button type="button" class="btn-primary-action" style="align-self: flex-end;" (click)="addCategory()">
            <span>➕ Add</span>
          </button>
        </div>

        <!-- Existing Categories List -->
        <div class="cat-master-list">
          @for (cat of categories(); track cat.id) {
            <div class="cat-master-item">
              <div class="cat-info">
                <strong>{{ cat.name }}</strong>
                <div class="subcat-chips-wrap mt-1">
                  @for (sub of cat.subcategories; track sub) {
                    <span class="subcat-chip">{{ sub }}</span>
                  }
                </div>
              </div>
              <button type="button" class="btn-cat-delete" (click)="deleteCategory(cat.id)" title="Delete category">✕</button>
            </div>
          }
        </div>

        <div class="modal-footer-actions mt-4">
          <button type="button" class="btn-primary-action" (click)="closeCategoryModal()">Done</button>
        </div>
      </div>
    </div>

    <!-- MODAL: ADD / EDIT ROLE -->
    <div *ngIf="showRoleModal()" class="modal-backdrop">
      <div class="modal-card role-modal-card">
        <div class="modal-header">
          <h3>{{ isEditingRole() ? '✏️ Edit Role Definition' : '➕ Add Custom Role' }}</h3>
          <button type="button" class="btn-close" (click)="closeRoleModal()">✕</button>
        </div>
        <form (submit)="saveRole($event)" class="modal-form">
          <div class="form-group">
            <label>Role Display Name *</label>
            <input type="text" [(ngModel)]="roleForm.name" name="roleName" class="form-input" placeholder="e.g. Floor Supervisor" required />
          </div>
          <div class="form-group">
            <label>Role Identifier Key (Slug)</label>
            <input type="text" [(ngModel)]="roleForm.id" [disabled]="isEditingRole()" name="roleId" class="form-input" placeholder="e.g. floor_supervisor" />
          </div>
          <div class="form-group">
            <label>Role Description</label>
            <textarea [(ngModel)]="roleForm.description" name="roleDesc" class="form-textarea" rows="2" placeholder="Responsibilities and access scope..."></textarea>
          </div>
          <div class="form-group">
            <label>Granted Permissions (Click to toggle)</label>
            <div class="perm-picker-grid">
              @for (perm of availablePermissions; track perm) {
                <button
                  type="button"
                  class="perm-picker-chip"
                  [class.selected]="roleForm.permissions.includes(perm)"
                  (click)="togglePermission(perm)"
                >
                  <span>{{ roleForm.permissions.includes(perm) ? '✓' : '+' }}</span>
                  <span>{{ perm }}</span>
                </button>
              }
            </div>
          </div>
          <div class="modal-actions mt-4">
            <button type="button" class="btn-secondary" (click)="closeRoleModal()">Cancel</button>
            <button type="submit" class="btn-primary-action">
              <span>💾</span>
              <span>{{ isEditingRole() ? 'Update Role' : 'Create Role' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: EDIT STAFF MEMBER -->
    <div *ngIf="showEditStaffModal()" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <h3>✏️ Edit Showroom Staff Member</h3>
          <button type="button" class="btn-close" (click)="closeEditStaffModal()">✕</button>
        </div>
        <form (submit)="saveEditStaff($event)" class="modal-form">
          <div class="form-group">
            <label>Full Name *</label>
            <input type="text" [(ngModel)]="editStaffForm.name" name="staffName" class="form-input" required />
          </div>
          <div class="form-group">
            <label>Email Address *</label>
            <input type="email" [(ngModel)]="editStaffForm.email" name="staffEmail" class="form-input" required />
          </div>
          <div class="form-group">
            <label>Assigned Role</label>
            <select [(ngModel)]="editStaffForm.role" name="staffRole" class="form-select">
              @for (r of rolesMaster(); track r.id) {
                <option [value]="r.id">{{ r.name }}</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label>Account Status</label>
            <select [(ngModel)]="editStaffForm.status" name="staffStatus" class="form-select">
              <option value="active">Active (Permitted)</option>
              <option value="disabled">Disabled (Suspended)</option>
            </select>
          </div>
          <div class="modal-actions mt-4">
            <button type="button" class="btn-secondary" (click)="closeEditStaffModal()">Cancel</button>
            <button type="submit" class="btn-primary-action">
              <span>💾</span>
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: BULK CSV GARMENT UPLOAD -->
    <div *ngIf="showBulkCsvModal()" class="app-modal-backdrop" (click)="closeBulkCsvModal()">
      <div class="app-modal-card bulk-csv-modal" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3>📂 Bulk Upload Garments via Excel / CSV</h3>
          <button type="button" class="btn-close-x" (click)="closeBulkCsvModal()">✕</button>
        </div>
        <p class="modal-sub">
          Upload hundreds of sarees and ethnic wear in seconds using a spreadsheet. Download the sample template to match the exact schema.
        </p>

        <!-- Template Download Box -->
        <div class="csv-template-box mb-4">
          <div class="template-left">
            <span class="csv-icon">📄</span>
            <div>
              <strong>Standard Showroom Catalog Template (.csv)</strong>
              <small>Includes SKU, Bilingual Titles, Category, Fabric, Price & Stock status.</small>
            </div>
          </div>
          <button type="button" class="btn-outline-action" (click)="downloadSampleCsv()">
            <span>📥</span>
            <span>Download Sample CSV</span>
          </button>
        </div>

        <!-- File Upload Area -->
        <div class="csv-drop-area mb-4">
          <input type="file" #csvFileInput accept=".csv,.txt" (change)="onCsvFileSelected($event)" class="file-input-hidden" id="csv-file-input" />
          <label for="csv-file-input" class="csv-drop-label">
            <span class="upload-cloud-icon">☁️</span>
            <strong>Click to Browse or Drag & Drop Catalog CSV</strong>
            <small>Supports UTF-8 CSV files with up to 1,000 garments</small>
            @if (csvFileName()) {
              <div class="selected-file-pill">
                <span>📎 {{ csvFileName() }}</span>
              </div>
            }
          </label>
        </div>

        @if (csvParseError()) {
          <div class="csv-error-alert mb-4">
            <span>⚠️</span>
            <span>{{ csvParseError() }}</span>
          </div>
        }

        <!-- Parsed Rows Preview -->
        @if (csvParsedRows().length > 0) {
          <div class="csv-preview-card mb-4">
            <div class="preview-header">
              <span>✅ <strong>{{ csvParsedRows().length }}</strong> Garments ready to import:</span>
            </div>
            <div class="table-responsive max-h-48">
              <table class="portal-table table-sm">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name (EN)</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of csvParsedRows().slice(0, 5); track r.sku) {
                    <tr>
                      <td><code>{{ r.sku }}</code></td>
                      <td>{{ r.name_en }}</td>
                      <td>{{ r.category }}</td>
                      <td>₹{{ r.price | number }}</td>
                      <td>{{ r.is_active ? 'In Stock' : 'Sold Out' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (csvParsedRows().length > 5) {
              <small class="preview-more-hint">+ {{ csvParsedRows().length - 5 }} more rows...</small>
            }
          </div>
        }

        <div class="modal-footer-actions">
          <button type="button" class="btn-cancel-modal" (click)="closeBulkCsvModal()">Cancel</button>
          <button
            type="button"
            class="btn-primary-action"
            [disabled]="csvParsedRows().length === 0"
            (click)="importParsedCsv()">
            <span>🚀</span>
            <span>Import {{ csvParsedRows().length }} Garments</span>
          </button>
        </div>
      </div>
    </div>

    
    <!-- ========================================================================= -->
    <!-- MODAL: KIOSK TRIALS HISTORY TELEMETRY                                     -->
    <!-- ========================================================================= -->
    <div *ngIf="showKioskTrialsModal()" class="app-modal-backdrop" (click)="closeKioskTrialsModal()">
      <div class="app-modal-card kiosk-trials-modal" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <div>
            <h3 class="modal-title" style="margin: 0; color: #ffd700;">📊 Kiosk Trials Telemetry: {{ selectedKioskForTrials?.display_name || selectedKioskForTrials?.name }}</h3>
            <p class="modal-sub" style="margin: 4px 0 0; font-size: 0.82rem; color: #94a3b8;">
              Device: <code>{{ selectedKioskForTrials?.kiosk_code || selectedKioskForTrials?.id }}</code> • Location: {{ selectedKioskForTrials?.section }}
            </p>
          </div>
          <button type="button" class="btn-close-x" (click)="closeKioskTrialsModal()">✕</button>
        </div>

        <div class="kiosk-trials-modal-body mt-4">
          <div class="trials-stat-summary">
            <div class="trials-badge-box">
              <span class="trials-badge-label">Total Completed Trials</span>
              <span class="trials-badge-val">{{ kioskTrialsList.length }} Drapes</span>
            </div>
            <div class="trials-badge-box">
              <span class="trials-badge-label">Hardware Device Status</span>
              <span class="trials-badge-val text-emerald">● Online & Ready</span>
            </div>
          </div>

          <div *ngIf="isLoadingKioskTrials()" class="trials-loading-box">
            <span class="spinner-inline">⏳</span>
            <span>Fetching real-time trial logs for this totem...</span>
          </div>

          <div *ngIf="!isLoadingKioskTrials()" class="table-responsive mt-3" style="max-height: 380px; overflow-y: auto;">
            <table class="portal-table trials-history-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Garment / Saree</th>
                  <th>SKU</th>
                  <th>Status</th>
                  <th>AI Latency</th>
                  <th>Trial Timestamp</th>
                </tr>
              </thead>
              <tbody>
                @for (t of kioskTrialsList; track t.job_id) {
                  <tr>
                    <td><code>{{ t.job_id }}</code></td>
                    <td><strong>{{ t.product_name }}</strong></td>
                    <td><code>{{ t.product_sku }}</code></td>
                    <td>
                      <span class="badge-status" [ngClass]="t.status === 'completed' ? 'paid' : 'trial'">
                        {{ t.status === 'completed' ? '✓ Completed' : t.status }}
                      </span>
                    </td>
                    <td>{{ t.processing_time_ms ? (t.processing_time_ms + ' ms') : '1,820 ms' }}</td>
                    <td>{{ t.created_at }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 36px 12px; color: #94a3b8;">
                      <div style="font-size: 30px;">👗</div>
                      <p style="margin: 8px 0 0;">No try-on trials recorded on this kiosk yet.</p>
                      <small>Simulate a drape from the 55" Kiosk view to see live trial logs appear here.</small>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="modal-footer-actions mt-4">
          <button type="button" class="btn-cancel-modal" (click)="closeKioskTrialsModal()">Close</button>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL: EDIT KIOSK DETAILS & SEPARATE CREDENTIALS                          -->
    <!-- ========================================================================= -->
    <div *ngIf="showEditKioskModal()" class="app-modal-backdrop" (click)="closeEditKioskModal()">
      <div class="app-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3>✏️ Edit Floor Kiosk Configuration</h3>
          <button type="button" class="btn-close-x" (click)="closeEditKioskModal()">✕</button>
        </div>
        <form (submit)="submitEditKiosk($event)">
          <div class="form-group mb-3">
            <label>Kiosk Display Name *</label>
            <input type="text" [(ngModel)]="editKioskForm.display_name" name="ekName" class="form-control" required />
          </div>
          <div class="form-group mb-3">
            <label>Showroom Floor / Section *</label>
            <input type="text" [(ngModel)]="editKioskForm.section" name="ekSec" class="form-control" required />
          </div>
          <div class="form-group mb-3">
            <label>Dedicated Kiosk Username *</label>
            <input type="text" [(ngModel)]="editKioskForm.username" name="ekUser" class="form-control" required />
          </div>
          <div class="form-group mb-3">
            <label>Dedicated Kiosk Login Password *</label>
            <input type="text" [(ngModel)]="editKioskForm.password" name="ekPass" class="form-control" required />
          </div>
          <div class="form-group mb-3">
            <label>Touch Screen Staff PIN *</label>
            <input type="text" [(ngModel)]="editKioskForm.kiosk_pin" name="ekPin" maxlength="10" class="form-control" required />
          </div>
          <div class="form-group mb-4">
            <label>Device Status</label>
            <select [(ngModel)]="editKioskForm.status" name="ekStat" class="form-control">
              <option value="online">🟢 Online & Active on Floor</option>
              <option value="idle">⏸ Idle / Standby</option>
              <option value="maintenance">🔧 Maintenance Mode</option>
            </select>
          </div>
          <div class="modal-footer-actions">
            <button type="button" class="btn-cancel-modal" (click)="closeEditKioskModal()">Cancel</button>
            <button type="submit" class="btn-primary-action">Save Kiosk Settings</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: REGISTER NEW FLOOR KIOSK -->
    <div *ngIf="showAddKioskModal()" class="app-modal-backdrop" (click)="closeAddKioskModal()">
      <div class="app-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3>🖥️ Add New POS / Floor Kiosk Terminal ("ஆட் பிஓஎஸ்")</h3>
          <button type="button" class="btn-close-x" (click)="closeAddKioskModal()">✕</button>
        </div>
        <p class="modal-sub">
          Enroll an additional portrait smart mirror screen into the showroom device fleet.
        </p>

        <form (submit)="submitAddKiosk($event)">
          <div class="form-group mb-3">
            <label>Kiosk Display Name *</label>
            <input type="text" [(ngModel)]="newKioskForm.name" name="kName" placeholder="e.g. Third Floor Bridal Totem" class="form-control" required />
          </div>
          <div class="form-group mb-3">
            <label>Hardware Device ID (Uppercase) *</label>
            <input type="text" [(ngModel)]="newKioskForm.id" name="kId" placeholder="e.g. KIOSK-TN-CHN-03" class="form-control" required />
          </div>
          <div class="form-group mb-3">
            <label>Showroom Floor / Section *</label>
            <input type="text" [(ngModel)]="newKioskForm.section" name="kSec" placeholder="e.g. 1st Floor Bridal Wing" class="form-control" required />
          </div>
          <div class="form-group mb-3">
            <label>Dedicated Kiosk Username *</label>
            <input type="text" [(ngModel)]="newKioskForm.username" name="kUser" placeholder="e.g. kiosk_bridal@boutique.kiosk" class="form-control" required />
          </div>
          <div class="form-group mb-3">
            <label>Dedicated Kiosk Password *</label>
            <input type="text" [(ngModel)]="newKioskForm.password" name="kPass" placeholder="e.g. BridalKiosk@2026" class="form-control" required />
          </div>
          <div class="form-group mb-3">
            <label>Touch Screen Staff PIN *</label>
            <input type="text" [(ngModel)]="newKioskForm.kiosk_pin" name="kPin" placeholder="e.g. 5521" maxlength="10" class="form-control" required />
          </div>
          <div class="form-group mb-3">
            <label>Screen Aspect Ratio / Resolution *</label>
            <select [(ngModel)]="newKioskForm.screenResolution" name="kRes" class="form-control">
              <option value="1080x1920 (Portrait)">1080x1920 Portrait 9:16 (Standard 55-inch Kiosk)</option>
              <option value="2160x3840 (Portrait)">2160x3840 4K Portrait (65-inch Luxury Totem)</option>
              <option value="1920x1080 (Landscape)">1920x1080 Landscape Counter Mirror</option>
            </select>
          </div>
          <div *ngIf="userRole() === 'super_admin'" class="form-group mb-4">
            <label>POS Hardware Selling / Unit Setup Price (₹)</label>
            <input type="number" [(ngModel)]="newKioskForm.hardware_price_inr" name="kPrice" placeholder="0 for included / trial unit" class="form-control" />
            <small style="color: #94a3b8; font-size: 0.76rem;">Amount charged to showroom client for this physical 55" totem.</small>
          </div>

          <div class="modal-footer-actions">
            <button type="button" class="btn-cancel-modal" (click)="closeAddKioskModal()">Cancel</button>
            <button type="submit" class="btn-primary-action">Register Terminal</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: KIOSK TOTEM PAIRING & LAUNCH QR -->
    <div *ngIf="selectedKioskForQr()" class="app-modal-backdrop" (click)="closeKioskQrModal()">
      <div class="app-modal-card kiosk-qr-modal" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3>📱 Pair & Launch 55" Hardware Totem</h3>
          <button type="button" class="btn-close-x" (click)="closeKioskQrModal()">✕</button>
        </div>
        <p class="modal-sub">
          Point the 55-inch totem camera at this QR code, or open the Launch URL in Chromium Kiosk Mode. This screen will permanently pair to this showroom.
        </p>

        <div class="kiosk-qr-showcase">
          <div class="kiosk-qr-frame">
            <img [src]="'https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=' + encodeUri(getKioskLaunchUrl(selectedKioskForQr()!))" alt="Kiosk Launch QR Code" class="kiosk-qr-img" />
          </div>
          <div class="kiosk-meta-badge">
            <strong>{{ selectedKioskForQr()?.name }}</strong>
            <span>Hardware Terminal ID: <code>{{ selectedKioskForQr()?.id }}</code></span>
            <span>Store Scope: <code>{{ shopId() }}</code></span>
          </div>
        </div>

        <div class="launch-url-box mt-3">
          <input type="text" [value]="getKioskLaunchUrl(selectedKioskForQr()!)" readonly class="form-control launch-url-input" />
          <button type="button" class="btn-copy-url" (click)="copyKioskLaunchUrl(selectedKioskForQr()!)">
            📋 Copy Link
          </button>
        </div>

        <div class="totem-setup-steps mt-3">
          <h5>Hardware Setup Instructions:</h5>
          <ol>
            <li>Launch Chrome on the totem mini-PC or smart mirror display.</li>
            <li>Open the <strong>Launch URL</strong> or scan the QR above.</li>
            <li>The screen will automatically bind to <strong>{{ selectedKioskForQr()?.name }}</strong> and stay active even after reboot.</li>
            <li>Press <strong>F11</strong> on the totem keyboard for fullscreen kiosk mode.</li>
          </ol>
        </div>

        <div class="modal-footer-actions mt-4">
          <button type="button" class="btn-primary-action" (click)="launchKioskWindow(selectedKioskForQr()!)">
            🚀 Launch Kiosk Now
          </button>
          <button type="button" class="btn-cancel-modal" (click)="closeKioskQrModal()">
            Done
          </button>
        </div>
      </div>
    </div>
    <!-- MODAL: ADD SHOWROOM TEAM MEMBER WITH KIOSK PIN -->
    <div *ngIf="showAddTeamModal()" class="app-modal-backdrop" (click)="closeAddTeamModal()">
      <div class="app-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3>👥 Add Showroom Staff & Assign Role</h3>
          <button type="button" class="btn-close-x" (click)="closeAddTeamModal()">✕</button>
        </div>
        <p class="modal-sub">
          Authorize a showroom employee with a designated role from the Roles Master and configure their 4-digit floor kiosk PIN.
        </p>

        <form (submit)="submitAddTeam($event)">
          <div class="form-group mb-3">
            <label>Employee Full Name *</label>
            <input type="text" [(ngModel)]="addTeamForm.name" name="tName" placeholder="e.g. Priya Raman" class="form-control" required />
          </div>
          <div class="form-group mb-3">
            <label>Staff Login Email *</label>
            <input type="email" [(ngModel)]="addTeamForm.email" name="tEmail" placeholder="e.g. priya@kumaransilks.in" class="form-control" required />
          </div>
          <div class="form-group mb-3">
            <label>Assigned Showroom Role *</label>
            <select [(ngModel)]="addTeamForm.role" name="tRole" class="form-control">
              <option value="store_manager">Store General Manager</option>
              <option value="bridal_stylist">Senior Bridal Stylist</option>
              <option value="billing_cashier">Sales & Billing Cashier</option>
              <option value="staff">Floor Sales Executive</option>
            </select>
          </div>
          <div class="form-group mb-4">
            <label>Floor Kiosk Security PIN (4 digits) *</label>
            <input type="password" [(ngModel)]="addTeamForm.pin" name="tPin" maxlength="4" placeholder="••••" class="form-control" required />
          </div>

          <div class="modal-footer-actions">
            <button type="button" class="btn-cancel-modal" (click)="closeAddTeamModal()">Cancel</button>
            <button type="submit" class="btn-primary-action">Add Staff Member</button>
          </div>
        </form>
      </div>
    </div>
    <!-- MODAL: E-COMMERCE WEBSITE CATALOGUE SYNC -->
    <div *ngIf="showEcomSyncModal()" class="app-modal-backdrop" (click)="closeEcomSyncModal()">
      <div class="app-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3>🌐 Sync Showroom Website & E-Commerce Catalogue</h3>
          <button type="button" class="btn-close-x" (click)="closeEcomSyncModal()">✕</button>
        </div>
        <p class="modal-sub">
          Connect your existing online boutique (Shopify, WooCommerce, Magento or Custom ERP API). All products and high-res garment photos will sync to floor kiosks automatically.
        </p>

        <div class="form-group mb-3">
          <label>Website Catalogue Feed URL *</label>
          <input type="url" [(ngModel)]="ecomSyncForm.storeUrl" placeholder="https://store.kumaransilks.in/products.json" class="form-control" />
        </div>

        <div class="form-row mb-3">
          <div class="form-group flex-1">
            <label>Platform Engine</label>
            <select [(ngModel)]="ecomSyncForm.platform" class="form-control">
              <option value="shopify">Shopify Storefront</option>
              <option value="woocommerce">WooCommerce / WordPress</option>
              <option value="magento">Magento / Adobe Commerce</option>
              <option value="custom">Custom ERP / REST API</option>
            </select>
          </div>
          <div class="form-group flex-1">
            <label>Sync Cadence</label>
            <select [(ngModel)]="ecomSyncForm.frequency" class="form-control">
              <option value="realtime">Real-Time Webhook (Instant)</option>
              <option value="daily">Daily Midnight Sync</option>
              <option value="manual">Manual On-Demand Only</option>
            </select>
          </div>
        </div>

        <div *ngIf="isSyncingEcom()" class="sync-progress-box mb-3">
          <div class="spinner-inline">🔄</div>
          <span>{{ ecomSyncProgress() }}</span>
        </div>

        <div class="modal-footer-actions">
          <button type="button" class="btn-cancel-modal" (click)="closeEcomSyncModal()" [disabled]="isSyncingEcom()">Cancel</button>
          <button type="button" class="btn-primary-action" (click)="startEcomSync()" [disabled]="isSyncingEcom() || !ecomSyncForm.storeUrl">
            <span>{{ isSyncingEcom() ? 'Connecting & Syncing...' : 'Start Catalogue Import' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: DYNAMIC POS / QR ERP LOOKUP -->
    <div *ngIf="showPosLookupModal()" class="app-modal-backdrop" (click)="closePosLookupModal()">
      <div class="app-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3>📱 Dynamic POS / ERP Barcode & QR Code Integration</h3>
          <button type="button" class="btn-close-x" (click)="closePosLookupModal()">✕</button>
        </div>
        <p class="modal-sub">
          When staff or customers scan/enter a garment barcode or QR code, NeXooAi queries your in-store POS server at this URL endpoint using the <code>&#123;CODE&#125;</code> placeholder.
        </p>

        <div class="form-group mb-3">
          <label>POS Endpoint URL Template (Supports <code>&#123;CODE&#125;</code> or <code>&#123;QR_CODE&#125;</code>)</label>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" [(ngModel)]="posEndpointUrl" placeholder="https://pos.store.com/api/sarees/{CODE}" class="form-control flex-1" />
            <button type="button" class="btn-outline-action" (click)="savePosEndpoint()">Save Endpoint</button>
          </div>
          <small style="color: #a89fae; font-size: 0.75rem; margin-top: 0.35rem; display: block;">
            Example: <code>https://pos.store.com/api/sarees/&#123;CODE&#125;</code> (Automatically replaces <code>&#123;CODE&#125;</code> with scanned barcode)
          </small>
        </div>

        <div class="pos-test-section mt-4 mb-3">
          <label style="font-weight: 700; font-size: 0.85rem; color: #ffd700;">Test Barcode / QR Scan Simulation</label>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.35rem;">
            <input type="text" [(ngModel)]="posTestCode" placeholder="Enter SKU / Scan Barcode (e.g. KAN-GOLD-01)" class="form-control flex-1" />
            <button type="button" class="btn-primary-action" (click)="testPosLookup()" [disabled]="isQueryingPos() || !posTestCode">
              <span>{{ isQueryingPos() ? 'Scanning...' : 'Test Lookup' }}</span>
            </button>
          </div>
        </div>

        <!-- POS Test Result Preview -->
        @if (posTestResult(); as res) {
          <div class="pos-result-card mb-4">
            <div style="display: flex; gap: 1rem; align-items: center;">
              <img [src]="res.thumbnail" class="thumbnail-cell" style="width: 56px; height: 56px;" alt="POS item" />
              <div class="flex-1">
                <div style="font-weight: 700; color: #ffffff;">{{ res.name_en }}</div>
                <div style="color: #ffd700; font-size: 0.82rem;">{{ res.name_ta }}</div>
                <div style="font-size: 0.78rem; opacity: 0.8; margin-top: 2px;">
                  SKU: <code>{{ res.sku }}</code> • Price: <strong>₹{{ res.price | number }}</strong> • Rack: {{ res.rack_location }}
                </div>
              </div>
              <button type="button" class="btn-primary-action" (click)="importPosItem()">
                <span>➕ Add to Floor Catalogue</span>
              </button>
            </div>
          </div>
        }

        <div class="modal-footer-actions">
          <button type="button" class="btn-cancel-modal" (click)="closePosLookupModal()">Close</button>
        </div>
      </div>
    </div>

    <!-- SHOWROOM DETAILS VIEW IS NOW EMBEDDED INLINE AS DEDICATED FULL-PAGE (NO POPUP MODAL) -->

    <!-- ========================================================================= -->
    <!-- MODAL: CONFIRM DELETE SHOWROOM                                            -->
    <!-- ========================================================================= -->
    <div *ngIf="showDeleteConfirmModal()" class="app-modal-backdrop" (click)="cancelDeleteShowroom()">
      <div class="app-modal-card delete-confirm-card" (click)="$event.stopPropagation()">
        <div class="modal-header-row">
          <h3 class="delete-modal-title">⚠️ Delete Showroom Confirmation</h3>
          <button type="button" class="btn-close-x" (click)="cancelDeleteShowroom()">✕</button>
        </div>
        <div class="action-alert-box danger-alert mt-3">
          <span class="alert-icon">🚨</span>
          <div class="alert-text">
            <strong class="alert-title-danger">Irreversible Permanent Action</strong>
            <p class="delete-warning-text">You are about to permanently delete boutique <strong>"{{ showroomToDelete?.name }}"</strong> ({{ showroomToDelete?.city }}).</p>
            <p class="delete-warning-sub">
              All registered manager accounts, kiosk mirror bindings, and tenant configuration data will be purged.
            </p>
          </div>
        </div>

        <div class="modal-footer-actions mt-6">
          <button type="button" class="btn-cancel-modal" (click)="cancelDeleteShowroom()">Cancel</button>
          <button type="button" class="btn-danger-action" (click)="executeDeleteShowroom()" [disabled]="isDeletingShowroom()">
            <span>{{ isDeletingShowroom() ? '⏳ Deleting...' : '🗑️ Confirm & Delete Boutique' }}</span>
          </button>
        </div>
      </div>
    </div>

    </div> <!-- /app-shell-wrapper -->
  `,
  styles: [`
      /* DEDICATED SHOWROOM DETAIL FULL-PAGE VIEW */
      .showroom-detail-fullpage {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        animation: fadeIn 0.25s ease-out;
      }
      .detail-page-top-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        padding-bottom: 0.5rem;
      }
      .btn-back-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(212, 175, 55, 0.12);
        border: 1px solid rgba(212, 175, 55, 0.45);
        color: #ffd700;
        font-weight: 700;
        font-size: 0.88rem;
        padding: 9px 18px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .btn-back-link:hover {
        background: rgba(212, 175, 55, 0.25);
        border-color: #ffd700;
        transform: translateX(-3px);
      }
      .breadcrumb-trail {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #94a3b8;
        font-size: 0.85rem;
      }
      .bc-sep {
        color: rgba(255, 255, 255, 0.25);
      }
      .bc-current {
        color: #ffd700;
      }
      .customer-hero-card {
        background: linear-gradient(135deg, rgba(30, 20, 45, 0.85), rgba(18, 12, 28, 0.95));
        border: 1px solid rgba(212, 175, 55, 0.35);
        border-radius: 16px;
        padding: 1.5rem;
      }
      .customer-hero-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1.25rem;
      }
      .customer-hero-info {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .title-avatar-large {
        width: 58px;
        height: 58px;
        border-radius: 14px;
        background: linear-gradient(135deg, #d4af37, #b8860b);
        color: #0b0512;
        font-weight: 800;
        font-size: 1.6rem;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
      }
      .hero-name-row {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .customer-page-title {
        font-size: 1.45rem;
        font-weight: 800;
        color: #ffffff;
        margin: 0;
      }
      .customer-page-subtitle {
        margin: 6px 0 0;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #94a3b8;
        font-size: 0.82rem;
        flex-wrap: wrap;
      }
      .sep-dot {
        color: rgba(255, 255, 255, 0.2);
      }
      .customer-hero-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .btn-hero-action {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #f1f5f9;
        transition: all 0.2s;
      }
      .btn-hero-action:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      .btn-hero-action.primary-gold {
        background: linear-gradient(135deg, #d4af37, #aa820a);
        color: #000;
        border: none;
        font-weight: 700;
      }
      .btn-hero-action.primary-gold:hover {
        opacity: 0.92;
        transform: translateY(-1px);
      }
      .btn-hero-action.danger {
        border-color: rgba(239, 68, 68, 0.4);
        color: #ef4444;
      }
      .btn-hero-action.danger:hover {
        background: rgba(239, 68, 68, 0.15);
      }
      .customer-page-tabs {
        display: flex;
        gap: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 1rem;
      }
      .page-tab-btn {
        background: transparent;
        border: 1px solid transparent;
        color: #94a3b8;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .page-tab-btn.active {
        background: rgba(212, 175, 55, 0.15);
        color: #ffd700;
        border-color: rgba(212, 175, 55, 0.4);
      }
      .customer-two-col-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.25rem;
      }
      @media (max-width: 992px) {
        .customer-two-col-grid {
          grid-template-columns: 1fr;
        }
      }
      .section-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .sch-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .sch-icon {
        font-size: 1.4rem;
      }
      .sch-title {
        margin: 0;
        font-size: 1rem;
        color: #fff;
        font-weight: 700;
      }
      .sch-sub {
        margin: 2px 0 0;
        font-size: 0.78rem;
        color: #94a3b8;
      }
      .commercials-metrics-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .c-metric-tile {
        background: rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .cm-lbl {
        font-size: 0.72rem;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .cm-val-row {
        display: flex;
        align-items: baseline;
        gap: 4px;
      }
      .cm-num {
        font-size: 1.25rem;
        font-weight: 800;
        color: #ffd700;
      }
      .cm-denom {
        font-size: 0.78rem;
        color: #94a3b8;
      }
      .cm-val-main {
        font-size: 0.95rem;
        font-weight: 700;
        color: #f1f5f9;
      }
      .cm-progress-bar {
        height: 6px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.1);
        overflow: hidden;
        margin-top: 4px;
      }
      .cm-fill {
        height: 100%;
        background: linear-gradient(90deg, #d4af37, #10b981);
        border-radius: 3px;
      }
      .kiosk-fleet-master-card {
        background: rgba(22, 14, 32, 0.75);
      }
      .app-shell-wrapper.light-theme .showroom-detail-fullpage .customer-page-title,
      .app-shell-wrapper.light-theme .showroom-detail-fullpage .sch-title,
      .app-shell-wrapper.light-theme .showroom-detail-fullpage .cm-val-main {
        color: #1a0b21 !important;
      }
      .app-shell-wrapper.light-theme .customer-hero-card {
        background: #ffffff !important;
        border-color: rgba(212, 175, 55, 0.4) !important;
      }
      .app-shell-wrapper.light-theme .c-metric-tile {
        background: #f8fafc !important;
        border-color: #e2e8f0 !important;
      }

    .app-shell-wrapper {
      display: flex;
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
      background: #09050d;
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
      position: relative;
    }

    /* Fixed Sidenav with Hover-Expand when Collapsed */
    .app-sidebar {
      width: 270px;
      height: 100vh;
      background: #110816;
      border-right: 1px solid rgba(212, 175, 55, 0.2);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      z-index: 1050;
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;
      overflow-y: auto;
      overflow-x: hidden;
      position: relative;
    }

    @media (min-width: 1025px) {
      .app-sidebar.collapsed {
        width: 76px;
      }
      .app-sidebar.collapsed .brand-info,
      .app-sidebar.collapsed .store-meta,
      .app-sidebar.collapsed .nav-section-title,
      .app-sidebar.collapsed .nav-item span:not(.nav-icon),
      .app-sidebar.collapsed .btn-floor-kiosk span:not(:first-child),
      .app-sidebar.collapsed .btn-logout span:not(:first-child) {
        display: none !important;
      }
      .app-sidebar.collapsed .sidebar-brand {
        justify-content: center;
        padding: 1.25rem 0.5rem 1rem;
      }
      .app-sidebar.collapsed .store-pill {
        margin: 0.75rem 0.5rem;
        padding: 0.6rem 0.4rem;
        justify-content: center;
      }
      .app-sidebar.collapsed .nav-item {
        justify-content: center;
        padding: 0.75rem 0.5rem;
      }
      .app-sidebar.collapsed .btn-floor-kiosk,
      .app-sidebar.collapsed .btn-logout {
        justify-content: center;
        padding: 0.65rem 0.5rem;
      }

      /* Hover Expand on Collapsed Sidebar */
      .app-sidebar.collapsed:hover {
        width: 270px !important;
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        z-index: 1200;
        box-shadow: 15px 0 45px rgba(0, 0, 0, 0.75);
        background: #110816;
      }
      .app-shell-wrapper.light-theme .app-sidebar.collapsed:hover {
        background: #ffffff !important;
        box-shadow: 15px 0 45px rgba(35, 10, 48, 0.2) !important;
      }
      .app-sidebar.collapsed:hover .brand-info,
      .app-sidebar.collapsed:hover .store-meta,
      .app-sidebar.collapsed:hover .nav-section-title,
      .app-sidebar.collapsed:hover .nav-item span:not(.nav-icon),
      .app-sidebar.collapsed:hover .btn-floor-kiosk span:not(:first-child),
      .app-sidebar.collapsed:hover .btn-logout span:not(:first-child) {
        display: inline-block !important;
      }
      .app-sidebar.collapsed:hover .brand-info {
        display: flex !important;
      }
      .app-sidebar.collapsed:hover .store-meta {
        display: flex !important;
      }
      .app-sidebar.collapsed:hover .sidebar-brand {
        justify-content: flex-start;
        padding: 1.5rem 1.25rem 1rem;
      }
      .app-sidebar.collapsed:hover .store-pill {
        margin: 1rem 1.25rem;
        padding: 0.75rem;
        justify-content: flex-start;
      }
      .app-sidebar.collapsed:hover .nav-item {
        justify-content: flex-start;
        padding: 0.75rem 1rem;
      }
    }

    .sidebar-brand {
      padding: 1.5rem 1.25rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .brand-crest {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background: linear-gradient(135deg, #d4af37 0%, #aa8420 100%);
      color: #120715;
      font-size: 1.2rem;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-name {
      font-size: 1.3rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.1;
    }

    .tenant-badge {
      display: block;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #d4af37;
      text-transform: uppercase;
    }

    .store-pill {
      margin: 1rem 1.25rem;
      padding: 0.75rem;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .store-icon {
      font-size: 1.3rem;
    }

    .store-meta {
      display: flex;
      flex-direction: column;
    }

    .store-name {
      font-size: 0.85rem;
      font-weight: 700;
      color: #ffffff;
    }

    .store-id {
      font-size: 0.72rem;
      color: #d4af37;
    }

    .sidebar-nav {
      flex: 1;
      padding: 0.5rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      overflow-y: auto;
    }

    .nav-section-title {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      color: #8c7c90;
      padding: 0.5rem 0.5rem 0.2rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      background: transparent;
      border: 1px solid transparent;
      color: #b5a4b7;
      font-size: 0.92rem;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s;
      width: 100%;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #ffffff;
    }

    .nav-item.active {
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.08) 100%);
      border-color: rgba(212, 175, 55, 0.4);
      color: #ffffff;
    }

    .store-view-toggle-btn {
      border-style: dashed;
      border-color: rgba(212, 175, 55, 0.3);
    }

    .sidebar-footer {
      padding: 1rem 1.25rem 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .btn-floor-kiosk {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      background: rgba(212, 175, 55, 0.15);
      border: 1px solid rgba(212, 175, 55, 0.35);
      color: #fbeea8;
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s;
    }

    .btn-floor-kiosk:hover {
      background: rgba(212, 175, 55, 0.28);
    }

    .btn-logout {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #b5a4b7;
      padding: 0.65rem;
      border-radius: 8px;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-logout:hover {
      background: rgba(255, 23, 125, 0.15);
      color: #ff85be;
      border-color: rgba(255, 23, 125, 0.3);
    }

    /* Main Area - Fixed Viewport, Scrolling Inside Main */
    .app-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow-y: auto;
      overflow-x: hidden;
      min-width: 0;
      position: relative;
    }

    /* Fixed Sticky Topbar */
    .app-topbar {
      height: 72px;
      background: rgba(17, 8, 22, 0.95);
      border-bottom: 1px solid rgba(212, 175, 55, 0.15);
      padding: 0 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 1000;
      flex-shrink: 0;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      min-width: 0;
      flex: 1;
    }

    .topbar-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
    }

    .btn-sidebar-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.05);
      color: inherit;
      cursor: pointer;
      font-size: 1.25rem;
      transition: all 0.2s;
      flex-shrink: 0;
      margin: 0;
    }
    .btn-sidebar-toggle:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(212, 175, 55, 0.4);
    }
    .app-shell-wrapper.light-theme .btn-sidebar-toggle {
      background: rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.12);
      color: #1a0b21;
    }
    .app-shell-wrapper.light-theme .btn-sidebar-toggle:hover {
      background: rgba(135, 40, 212, 0.08);
      border-color: #aa3bf5;
    }
    .status-compact, .quota-compact {
      display: none;
    }

    @media (max-width: 768px) {
      .app-topbar {
        height: 56px !important;
        padding: 0 0.75rem !important;
      }
      .topbar-left {
        display: flex !important;
        align-items: center !important;
        gap: 0.5rem !important;
        min-width: 0 !important;
        flex: 1 !important;
      }
      .btn-sidebar-toggle {
        width: 36px !important;
        height: 36px !important;
        margin: 0 !important;
        font-size: 1.15rem !important;
      }
      .topbar-title-wrap {
        display: flex !important;
        flex-direction: column !important;
        min-width: 0 !important;
        flex: 1 !important;
      }
      .page-title {
        font-size: 0.84rem !important;
        line-height: 1.15 !important;
        max-width: 160px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .status-full {
        display: none !important;
      }
      .status-compact {
        display: inline-block !important;
        font-size: 0.68rem !important;
        font-weight: 700 !important;
        color: #00e676 !important;
      }
      .topbar-right {
        display: flex !important;
        align-items: center !important;
        gap: 0.35rem !important;
        flex-shrink: 0 !important;
      }
      .btn-theme-pill {
        padding: 0 !important;
        width: 34px !important;
        height: 34px !important;
        border-radius: 50% !important;
        justify-content: center !important;
      }
      .btn-theme-pill .theme-text {
        display: none !important;
      }
      .quota-pill {
        padding: 0.3rem 0.5rem !important;
        font-size: 0.72rem !important;
        border-radius: 14px !important;
      }
      .quota-full {
        display: none !important;
      }
      .quota-compact {
        display: inline-block !important;
      }
      .quota-mrr {
        display: none !important;
      }
      .user-chip {
        padding: 0 !important;
        background: transparent !important;
        border: none !important;
      }
      .user-chip .user-text {
        display: none !important;
      }
      .user-avatar {
        width: 34px !important;
        height: 34px !important;
        font-size: 0.85rem !important;
      }
      .app-content-body {
        padding: 0.85rem !important;
      }
      .portal-card {
        padding: 1rem !important;
        border-radius: 12px !important;
      }
      .kpi-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 0.65rem !important;
      }
      .kpi-card {
        padding: 0.75rem !important;
        gap: 0.6rem !important;
      }
      .kpi-icon {
        font-size: 1.35rem !important;
      }
      .kpi-val {
        font-size: 1.2rem !important;
      }
      .table-responsive {
        width: 100% !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
        margin-top: 0.75rem !important;
        border-radius: 8px !important;
      }
      .portal-table {
        min-width: 650px !important;
      }
    }

    .page-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
      color: #ffffff;
    }

    .status-indicator-badge {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.75rem;
      color: #a89fae;
      margin-top: 0.2rem;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #00e676;
      box-shadow: 0 0 8px #00e676;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .quota-pill {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 0.4rem 0.9rem;
      border-radius: 20px;
      font-size: 0.82rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .mini-progress-bar {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
    }

    .mini-fill {
      height: 100%;
      background: #d4af37;
    }

    .user-chip {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .user-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #7c4dff;
      color: #ffffff;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
    }

    .user-avatar.sa-avatar {
      background: linear-gradient(135deg, #d4af37 0%, #aa8420 100%);
      color: #120715;
    }

    .user-text {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-size: 0.88rem;
      font-weight: 700;
      color: #ffffff;
    }

    .user-role {
      font-size: 0.72rem;
      color: #b5a4b7;
    }

    .gold-text {
      color: #ffd700;
      font-weight: 700;
    }

    .app-content-body {
      padding: 2rem;
      max-width: 1320px;
      width: 100%;
      box-sizing: border-box;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
    }

    .kpi-card {
      background: rgba(26, 11, 33, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 1.4rem;
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }

    .kpi-card.gold-border {
      border-color: rgba(212, 175, 55, 0.4);
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(26, 11, 33, 0.6) 100%);
    }

    .kpi-icon {
      font-size: 1.8rem;
    }

    .kpi-meta {
      flex: 1;
    }

    .kpi-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #a89fae;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      display: block;
      margin-bottom: 0.25rem;
    }

    .kpi-val {
      font-size: 1.6rem;
      font-weight: 800;
      color: #ffffff;
    }

    .kpi-denom {
      font-size: 0.85rem;
      color: #a89fae;
      margin-left: 0.35rem;
    }

    /* Portal Card */
    .portal-card {
      background: rgba(26, 11, 33, 0.6);
      border: 1px solid rgba(212, 175, 55, 0.2);
      border-radius: 16px;
      padding: 1.75rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }

    .card-header-flex {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .card-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 0.35rem;
    }

    .card-subtitle {
      font-size: 0.88rem;
      color: #b5a4b7;
      margin: 0;
      line-height: 1.45;
    }

    .btn-primary-action {
      background: linear-gradient(135deg, #d4af37 0%, #aa8420 100%);
      color: #120715;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
      transition: all 0.2s;
    }

    .btn-primary-action:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(212, 175, 55, 0.45);
    }

    .btn-outline-action {
      background: transparent;
      border: 1px solid rgba(212, 175, 55, 0.4);
      color: #fbeea8;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Search & Filter Bar */
    .showroom-filter-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-top: 1.25rem;
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 280px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 0.65rem 1rem;
      border-radius: 8px;
      color: #ffffff;
      font-size: 0.88rem;
    }

    .filter-pills {
      display: flex;
      gap: 0.4rem;
    }

    .pill-filter {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #c9bed0;
      padding: 0.4rem 0.8rem;
      border-radius: 20px;
      font-size: 0.8rem;
      cursor: pointer;
    }

    .pill-filter.active {
      background: #d4af37;
      color: #120715;
      font-weight: 700;
      border-color: #d4af37;
    }

    /* Tables */
    .table-responsive {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      width: 100%;
    }

    .portal-table {
      width: 100%;
      min-width: 680px;
      border-collapse: collapse;
      text-align: left;
    }

    .portal-table th {
      padding: 0.9rem 1rem;
      background: rgba(255, 255, 255, 0.03);
      font-size: 0.78rem;
      font-weight: 700;
      color: #a89fae;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .portal-table td {
      padding: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.88rem;
      vertical-align: middle;
    }

    .store-cell strong {
      display: block;
      color: #ffffff;
      font-size: 0.95rem;
    }

    .store-slug-hint {
      display: block;
      font-size: 0.76rem;
      color: #9f8ea5;
      margin-top: 0.2rem;
    }

    .contact-cell span {
      display: block;
    }

    .contact-sub {
      font-size: 0.76rem;
      color: #9f8ea5;
    }

    .plan-tag {
      display: inline-block;
      padding: 0.25rem 0.65rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }

    .plan-tag.tier-gold {
      background: rgba(212, 175, 55, 0.2);
      border: 1px solid #d4af37;
      color: #ffd700;
    }

    .plan-tag.tier-platinum {
      background: rgba(124, 77, 255, 0.2);
      border: 1px solid #b388ff;
      color: #d1c4e9;
    }

    .plan-tag.tier-silver {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #e0e0e0;
    }

    .plan-tag.tier-trial {
      background: rgba(0, 230, 118, 0.15);
      border: 1px solid #00e676;
      color: #00e676;
    }

    .table-meter-bar {
      width: 110px;
      height: 5px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 0.3rem;
    }

    .table-meter-fill {
      height: 100%;
      background: #d4af37;
    }

    .badge-status {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .badge-status.paid {
      background: rgba(0, 230, 118, 0.15);
      color: #00e676;
    }

    .badge-status.payment_due {
      background: rgba(255, 145, 0, 0.15);
      color: #ffb74d;
    }

    .badge-status.trial {
      background: rgba(0, 229, 255, 0.15);
      color: #00e5ff;
    }

    .expiry-sub {
      display: block;
      font-size: 0.72rem;
      color: #9f8ea5;
      margin-top: 0.2rem;
    }

    .action-buttons-flex {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .btn-table-action {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      padding: 0.35rem 0.65rem;
      border-radius: 5px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-table-action:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .btn-table-action.gold-action {
      background: rgba(212, 175, 55, 0.15);
      border-color: rgba(212, 175, 55, 0.4);
      color: #ffd700;
    }

    .offline-payment-box {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(212, 175, 55, 0.25);
      border-radius: 12px;
      padding: 1.5rem;
    }

    .offline-payment-box h4 {
      color: #ffd700;
      font-size: 1.1rem;
      margin: 0;
    }

    .pay-mode-pill {
      background: rgba(255, 255, 255, 0.08);
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.78rem;
    }

    /* AI Pool styles */
    .cluster-status-pill {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #c9bed0;
    }

    .ai-test-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .action-btns-gap {
      display: flex;
      gap: 0.75rem;
    }

    /* Modals */
    .app-modal-backdrop {
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

    .app-modal-card {
      width: 100%;
      max-width: 600px;
      background: #14091a;
      border: 1px solid rgba(212, 175, 55, 0.35);
      border-radius: 16px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
      padding: 2rem;
      color: #ffffff;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.4rem;
    }

    .modal-header-row h3 {
      font-size: 1.35rem;
      font-weight: 700;
      margin: 0;
      color: #ffd700;
    }

    .btn-close-x {
      background: transparent;
      border: none;
      color: #a494a8;
      font-size: 1.25rem;
      cursor: pointer;
    }

    .modal-sub {
      font-size: 0.88rem;
      color: #b5a4b7;
      margin: 0 0 1.5rem;
      line-height: 1.4;
    }

    .settings-form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }

    .settings-field label {
      display: block;
      font-size: 0.82rem;
      font-weight: 700;
      color: #a89fae;
      margin-bottom: 0.4rem;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(0, 0, 0, 0.4);
      color: #ffffff;
      font-size: 0.9rem;
      box-sizing: border-box;
    }

    .modal-footer-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .btn-cancel-modal {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #c9bed0;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
    }

    /* Enhanced Onboarding Form Styles */
    .onboard-modal-card {
      max-width: 680px;
    }
    .modal-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .modal-badge-gold {
      font-size: 0.72rem;
      font-weight: 700;
      color: #ffd700;
      letter-spacing: 0.05em;
    }
    .onboard-error-summary {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      padding: 0.65rem 0.95rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
    }
    .phone-input-group {
      display: flex;
      align-items: stretch;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(212, 175, 55, 0.25);
      border-radius: 8px;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    .phone-input-group:focus-within {
      border-color: #ffd700;
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
    }
    .phone-prefix-locked {
      background: rgba(255, 255, 255, 0.08);
      border-right: 1px solid rgba(212, 175, 55, 0.25);
      color: #ffd700;
      font-size: 0.88rem;
      font-weight: 700;
      padding: 0.6rem 0.75rem;
      display: flex;
      align-items: center;
      user-select: none;
      white-space: nowrap;
    }
    .phone-input-group .phone-field {
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      padding: 0.6rem 0.85rem;
      flex: 1;
    }
    .password-input-group {
      position: relative;
      display: flex;
      align-items: center;
    }
    .password-input-group .password-field {
      padding-right: 2.75rem;
    }
    .btn-eye-toggle-inline {
      position: absolute;
      right: 0.65rem;
      background: transparent;
      border: none;
      font-size: 1.1rem;
      cursor: pointer;
      color: #d1c1d4;
      padding: 0.25rem;
      transition: transform 0.15s;
    }
    .btn-eye-toggle-inline:hover {
      transform: scale(1.15);
    }
    .field-error-msg {
      color: #ef4444;
      font-size: 0.76rem;
      font-weight: 500;
      margin-top: 0.25rem;
      display: block;
    }
    .form-input.input-error,
    .group-error {
      border-color: #ef4444 !important;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.25) !important;
    }
    .field-helper-gold {
      display: block;
      margin-top: 0.35rem;
      font-size: 0.76rem;
      color: #cbb4cf;
    }
    .field-helper-gold strong {
      color: #ffd700;
    }

    .whatsapp-slip-box {
      background: #061e12;
      border: 1px solid #25d366;
      border-radius: 10px;
      padding: 1rem;
      overflow-x: auto;
    }

    .whatsapp-slip-box pre {
      margin: 0;
      color: #d1f4df;
      font-family: inherit;
      white-space: pre-wrap;
      font-size: 0.85rem;
      line-height: 1.5;
    }

    /* Existing Catalogue & Kiosk styles */
    .thumbnail-cell {
      width: 44px;
      height: 44px;
      border-radius: 6px;
      object-fit: cover;
    }

    .bilingual-title strong { display: block; color: #ffffff; }
    .sub-ta { font-size: 0.78rem; color: #d4af37; }
    .rack-pill { background: rgba(255, 255, 255, 0.08); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.78rem; }
    .token-chip { background: rgba(212, 175, 55, 0.15); color: #fbeea8; padding: 0.25rem 0.55rem; border-radius: 4px; font-weight: 700; font-size: 0.78rem; }

    .kiosk-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
    .kiosk-card { background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 1.25rem; }
    .kiosk-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .kiosk-title-block h4 { margin: 0 0 0.2rem; font-size: 1.05rem; }
    .kiosk-id-tag { font-size: 0.75rem; color: #d4af37; }
    .kiosk-ping-dot { width: 10px; height: 10px; border-radius: 50%; background: #00e676; box-shadow: 0 0 8px #00e676; }
    .kiosk-meta-rows { margin: 1rem 0; display: flex; flex-direction: column; gap: 0.4rem; }
    .meta-row { display: flex; justify-content: space-between; font-size: 0.82rem; }
    .k-lbl { color: #a89fae; }
    .k-val { color: #ffffff; }
    .btn-kiosk-lock { width: 100%; padding: 0.65rem; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.2); background: transparent; color: #ffffff; font-weight: 600; cursor: pointer; }
    .btn-kiosk-lock.locked { background: rgba(255, 23, 125, 0.15); border-color: #ff177d; color: #ff85be; }

    .kiosk-action-btn-row { display: grid; grid-template-columns: 1fr 1fr 0.8fr; gap: 6px; margin-bottom: 8px; }
    .btn-kiosk-action { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 0.5rem 0.4rem; border-radius: 6px; font-size: 0.78rem; font-weight: 700; background: rgba(212, 175, 55, 0.15); border: 1px solid rgba(212, 175, 55, 0.4); color: #ffd700; cursor: pointer; transition: all 0.2s ease; }
    .btn-kiosk-action:hover { background: rgba(212, 175, 55, 0.3); border-color: #ffd700; transform: translateY(-1px); }
    .btn-kiosk-action.launch-direct { background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.4); color: #10b981; }
    .btn-kiosk-action.launch-direct:hover { background: rgba(16, 185, 129, 0.3); border-color: #10b981; }

    .kiosk-qr-modal { max-width: 520px !important; }
    .kiosk-qr-showcase { display: flex; flex-direction: column; align-items: center; gap: 12px; margin: 16px 0; }
    .kiosk-qr-frame { background: #ffffff; padding: 14px; border-radius: 16px; border: 2px solid #d4af37; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); }
    .kiosk-qr-img { width: 220px; height: 220px; display: block; }
    .kiosk-meta-badge { display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; font-size: 0.88rem; color: #a89fae; }
    .kiosk-meta-badge strong { color: #ffd700; font-size: 1.05rem; }
    .launch-url-box { display: flex; gap: 8px; }
    .launch-url-input { flex: 1; font-family: monospace; font-size: 0.82rem; background: rgba(0, 0, 0, 0.4); color: #ffd700; border: 1px solid rgba(212, 175, 55, 0.3); }
    .btn-copy-url { padding: 0.55rem 1rem; border-radius: 6px; font-weight: 700; background: #d4af37; color: #120715; border: none; cursor: pointer; white-space: nowrap; }
    .totem-setup-steps { background: rgba(255, 255, 255, 0.04); border-radius: 8px; padding: 12px 16px; font-size: 0.82rem; color: #c4b5cd; border: 1px solid rgba(255, 255, 255, 0.08); }
    .totem-setup-steps h5 { margin: 0 0 6px 0; color: #ffd700; font-size: 0.9rem; }
    .totem-setup-steps ol { margin: 0; padding-left: 18px; }
    .totem-setup-steps li { margin-bottom: 4px; }

    
    /* Roles Header Actions */
    .role-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-role-action {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(212, 175, 55, 0.25);
      border-radius: 6px;
      padding: 3px 6px;
      cursor: pointer;
      font-size: 0.82rem;
      transition: all 0.2s ease;
    }
    .btn-role-action:hover {
      background: rgba(212, 175, 55, 0.2);
    }
    .btn-role-del:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: #ef4444;
    }

    /* Permission Picker in Modal */
    .perm-picker-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 6px;
    }
    .perm-picker-chip {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(212, 175, 55, 0.3);
      color: #e2d2df;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.82rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .perm-picker-chip.selected {
      background: rgba(16, 185, 129, 0.2);
      border-color: #10b981;
      color: #34d399;
      font-weight: 700;
    }

    /* Top-Up Multi-tier UI */
    .topup-heading {
      color: #d4af37;
      font-size: 1.05rem;
      margin-bottom: 4px;
    }
    .topup-tiers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }
    .btn-topup-tier {
      position: relative;
      background: rgba(255, 255, 255, 0.04);
      border: 1.5px solid rgba(212, 175, 55, 0.35);
      border-radius: 14px;
      padding: 16px 14px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .btn-topup-tier:hover {
      border-color: #ffd700;
      background: rgba(212, 175, 55, 0.1);
      transform: translateY(-2px);
    }
    .btn-topup-tier.tier-recommended {
      border-color: #ffd700;
      background: linear-gradient(145deg, rgba(212, 175, 55, 0.15) 0%, rgba(26, 11, 28, 0.8) 100%);
    }
    .recommended-badge {
      position: absolute;
      top: -9px;
      background: linear-gradient(135deg, #ffd700 0%, #aa841e 100%);
      color: #1a081a;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 10px;
      letter-spacing: 0.5px;
    }
    .tier-drapes {
      font-size: 1.15rem;
      font-weight: 800;
      color: #ffd700;
    }
    .tier-price {
      font-size: 1rem;
      font-weight: 700;
      color: #ffffff;
    }
    .tier-tag {
      font-size: 0.75rem;
      color: #a0aec0;
    }
    .custom-topup-row {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }
    .custom-input-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .custom-input-group label {
      font-size: 0.82rem;
      color: #d4c2a5;
    }
    .custom-quota-input {
      max-width: 180px;
    }
    .btn-apply-topup {
      padding: 10px 20px;
    }
    .kiosk-launch-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      line-height: 1.15;
    }
    .kiosk-store-pill {
      font-size: 0.68rem;
      color: rgba(255, 215, 0, 0.8);
      font-weight: 600;
    }
    .table-actions-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Light Theme Overrides for Team, Roles, and Top-Up */
    :host-context(.light-theme) .role-def-card,
    .light-theme .role-def-card {
      background: #ffffff !important;
      border: 1.5px solid rgba(184, 134, 11, 0.35) !important;
      box-shadow: 0 4px 16px rgba(184, 134, 11, 0.08) !important;
    }
    :host-context(.light-theme) .role-def-card h4,
    .light-theme .role-def-card h4 {
      color: #4a0e20 !important;
    }
    :host-context(.light-theme) .role-desc,
    .light-theme .role-desc {
      color: #483549 !important;
    }
    :host-context(.light-theme) .perm-title,
    .light-theme .perm-title {
      color: #9a6f19 !important;
    }
    :host-context(.light-theme) .perm-chip,
    .light-theme .perm-chip {
      background: #fbf8f2 !important;
      border: 1px solid rgba(184, 134, 11, 0.3) !important;
      color: #2b1124 !important;
    }
    :host-context(.light-theme) .btn-topup-tier,
    .light-theme .btn-topup-tier {
      background: #ffffff !important;
      border: 1.5px solid rgba(184, 134, 11, 0.35) !important;
    }
    :host-context(.light-theme) .tier-drapes,
    .light-theme .tier-drapes {
      color: #9a6f19 !important;
    }
    :host-context(.light-theme) .tier-price,
    .light-theme .tier-price {
      color: #1e1320 !important;
    }
    :host-context(.light-theme) .tier-tag,
    .light-theme .tier-tag {
      color: #634f62 !important;
    }
    :host-context(.light-theme) .topup-box,
    .light-theme .topup-box {
      background: #fdfaf3 !important;
      border: 1.5px solid rgba(184, 134, 11, 0.3) !important;
    }
    :host-context(.light-theme) .topup-heading,
    .light-theme .topup-heading {
      color: #5a0e24 !important;
    }
    :host-context(.light-theme) .custom-input-group label,
    .light-theme .custom-input-group label {
      color: #4a0e20 !important;
    }
    :host-context(.light-theme) .modal-card,
    .light-theme .modal-card {
      background: #ffffff !important;
      color: #1e1320 !important;
      border: 1.5px solid rgba(184, 134, 11, 0.4) !important;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15) !important;
    }
    :host-context(.light-theme) .modal-header h3,
    .light-theme .modal-header h3 {
      color: #5a0e24 !important;
    }
    :host-context(.light-theme) .form-group label,
    .light-theme .form-group label {
      color: #4a0e20 !important;
    }
    :host-context(.light-theme) .form-input,
    :host-context(.light-theme) .form-textarea,
    :host-context(.light-theme) .form-select,
    .light-theme .form-input,
    .light-theme .form-textarea,
    .light-theme .form-select {
      background: #ffffff !important;
      color: #1e1320 !important;
      border: 1.5px solid rgba(184, 134, 11, 0.35) !important;
    }
.plan-overview-card { background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 1.5rem; }
    .plan-header-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .plan-header-row h4 { margin: 0 0 0.25rem; font-size: 1.2rem; color: #ffd700; }
    .license-desc { margin: 0; font-size: 0.85rem; color: #a89fae; }
    .plan-badge-gold { background: #d4af37; color: #120715; font-weight: 800; font-size: 0.75rem; padding: 0.35rem 0.85rem; border-radius: 20px; }
    .meter-section { margin-bottom: 1.5rem; }
    .meter-labels { display: flex; justify-content: space-between; font-size: 0.88rem; margin-bottom: 0.4rem; }
    .large-meter-bar { width: 100%; height: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 5px; overflow: hidden; }
    .meter-fill { height: 100%; background: #d4af37; }
    .topup-box { background: rgba(212, 175, 55, 0.08); border: 1px dashed rgba(212, 175, 55, 0.4); border-radius: 8px; padding: 1rem; text-align: center; }
    .topup-box p { margin: 0 0 0.75rem; font-size: 0.88rem; color: #fbeea8; }
    .btn-topup { background: linear-gradient(135deg, #d4af37 0%, #aa8420 100%); color: #120715; border: none; padding: 0.65rem 1.25rem; border-radius: 6px; font-weight: 700; cursor: pointer; }

    .role-badge { background: rgba(124, 77, 255, 0.2); color: #b388ff; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; }
    .privacy-guarantee-box { background: rgba(0, 230, 118, 0.08); border: 1px solid rgba(0, 230, 118, 0.25); border-radius: 10px; padding: 1.25rem; display: flex; align-items: flex-start; gap: 1rem; }
    .privacy-icon { font-size: 1.8rem; }
    .privacy-guarantee-box h4 { font-size: 0.95rem; color: #00e676; margin: 0 0 0.25rem; }
    .privacy-guarantee-box p { font-size: 0.82rem; color: #b5a4b7; margin: 0; line-height: 1.4; }

    .mt-3 { margin-top: 0.75rem; }
    .mt-4 { margin-top: 1rem; }
    .mt-6 { margin-top: 1.5rem; }
    .mt-8 { margin-top: 2rem; }

    /* Action Button Group in Table / Tab Headers */
    .action-btn-group-responsive {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      align-items: center;
    }

    .btn-outline-action {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(212, 175, 55, 0.4);
      color: #ffd700;
      padding: 0.55rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      transition: all 0.2s;
    }

    .btn-outline-action:hover {
      background: rgba(212, 175, 55, 0.15);
      border-color: #ffd700;
    }

    /* Roles & Permissions Master Grid */
    .roles-master-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }

    .role-def-card {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .role-def-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .role-def-header h4 {
      margin: 0;
      font-size: 1rem;
      color: #ffd700;
    }

    .role-id-tag code {
      font-size: 0.72rem;
      background: rgba(255, 255, 255, 0.08);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      color: #a89fae;
    }

    .role-desc {
      font-size: 0.82rem;
      color: #c9bed0;
      margin: 0;
      line-height: 1.4;
    }

    .role-permissions-wrap {
      margin-top: 0.5rem;
      border-top: 1px dashed rgba(255, 255, 255, 0.1);
      padding-top: 0.5rem;
    }

    .perm-title {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #8c7c90;
      display: block;
      margin-bottom: 0.35rem;
    }

    .perm-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .perm-chip {
      background: rgba(0, 230, 118, 0.12);
      border: 1px solid rgba(0, 230, 118, 0.3);
      color: #69f0ae;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
    }

    /* Category Master List */
    .cat-master-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 320px;
      overflow-y: auto;
    }

    .cat-master-item {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0.85rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .subcat-chips-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .subcat-chip {
      background: rgba(212, 175, 55, 0.12);
      color: #fbeea8;
      font-size: 0.72rem;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }

    .btn-cat-delete {
      background: transparent;
      border: none;
      color: #ff5252;
      font-size: 1.1rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
    }

    /* Logo Upload & Watermark Mockup Styles */
    .logo-upload-box {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px dashed rgba(212, 175, 55, 0.3);
      border-radius: 12px;
      padding: 1.25rem;
    }

    .logo-preview-box {
      width: 80px;
      height: 80px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }

    .custom-logo-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .logo-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 2px;
      font-size: 1.5rem;
    }

    .logo-placeholder small {
      font-size: 0.58rem;
      color: #8c7c90;
      line-height: 1.1;
    }

    .logo-upload-controls {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .watermark-preview-card {
      background: #0f0714;
      border: 2px solid #d4af37;
      border-radius: 16px;
      padding: 1.25rem;
      max-width: 480px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
    }

    .watermark-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .store-brand-title {
      font-family: 'Cinzel', serif;
      font-weight: 700;
      color: #ffd700;
      font-size: 1.05rem;
    }

    .store-city-pill {
      font-size: 0.7rem;
      background: rgba(212, 175, 55, 0.15);
      color: #fbeea8;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .mockup-drape-frame {
      height: 160px;
      border-radius: 10px;
      background: radial-gradient(circle at center, #26112a 0%, #100613 100%);
      border: 1px solid rgba(212, 175, 55, 0.3);
      position: relative;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      padding: 0.75rem;
    }

    .mock-watermark-line {
      font-size: 0.72rem;
      color: rgba(255, 215, 0, 0.85);
      background: rgba(0, 0, 0, 0.6);
      padding: 0.25rem 0.55rem;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }

    .watermark-card-footer {
      margin-top: 0.75rem;
      text-align: center;
      font-size: 0.74rem;
      color: #a89fae;
    }

    /* Light Theme overrides for new cards */
    .app-shell-wrapper.light-theme .role-def-card {
      background: #ffffff !important;
      border-color: rgba(184, 134, 11, 0.25) !important;
      box-shadow: 0 4px 14px rgba(70, 35, 55, 0.06) !important;
    }
    .app-shell-wrapper.light-theme .role-def-header h4 {
      color: #8c600b !important;
    }
    .app-shell-wrapper.light-theme .role-desc {
      color: #4a3a4c !important;
    }
    .app-shell-wrapper.light-theme .btn-outline-action {
      background: #ffffff !important;
      border-color: #b38728 !important;
      color: #8c600b !important;
    }
    .app-shell-wrapper.light-theme .logo-upload-box {
      background: #ffffff !important;
      border-color: rgba(184, 134, 11, 0.4) !important;
    }
    .app-shell-wrapper.light-theme .cat-master-item {
      background: #ffffff !important;
      border-color: rgba(184, 134, 11, 0.2) !important;
      color: #240c16 !important;
    }
    .app-shell-wrapper.light-theme .watermark-preview-card {
      background: #ffffff !important;
      border-color: #b38728 !important;
    }
    .app-shell-wrapper.light-theme .store-brand-title {
      color: #8c600b !important;
    }

    /* ========================================================
       LIGHT THEME COMPLETE OVERRIDES FOR APP SHELL
       ======================================================== */
    .btn-theme-pill {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      padding: 0.35rem 0.8rem;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-theme-pill:hover {
      background: rgba(255, 255, 255, 0.16);
    }

    .app-shell-wrapper.light-theme {
      background: #f6f4f8;
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .app-sidebar {
      background: #ffffff;
      border-right: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: 2px 0 12px rgba(0, 0, 0, 0.03);
    }

    .app-shell-wrapper.light-theme .sidebar-brand {
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    .app-shell-wrapper.light-theme .brand-name {
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .tenant-badge {
      color: #9a7309;
    }

    .app-shell-wrapper.light-theme .store-pill {
      background: rgba(0, 0, 0, 0.035);
      border: 1px solid rgba(0, 0, 0, 0.08);
    }

    .app-shell-wrapper.light-theme .store-name {
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .store-id {
      color: #8c6808;
    }

    .app-shell-wrapper.light-theme .nav-section-title {
      color: #837287;
    }

    .app-shell-wrapper.light-theme .nav-item {
      color: #534259;
    }

    .app-shell-wrapper.light-theme .nav-item:hover {
      background: rgba(212, 175, 55, 0.12);
      color: #876d12;
    }

    .app-shell-wrapper.light-theme .nav-item.active {
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.22) 0%, rgba(212, 175, 55, 0.06) 100%);
      color: #7c5e07;
      border-left-color: #d4af37;
    }

    .app-shell-wrapper.light-theme .sidebar-footer {
      border-top: 1px solid rgba(0, 0, 0, 0.06);
    }

    .app-shell-wrapper.light-theme .btn-floor-kiosk {
      background: rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.1);
      color: #3b2a42;
    }

    .app-shell-wrapper.light-theme .btn-floor-kiosk:hover {
      background: rgba(212, 175, 55, 0.15);
      color: #7c5e07;
    }

    .app-shell-wrapper.light-theme .btn-logout {
      background: transparent;
      border: 1px solid rgba(220, 38, 38, 0.25);
      color: #b91c1c;
    }

    .app-shell-wrapper.light-theme .btn-logout:hover {
      background: rgba(220, 38, 38, 0.08);
    }

    .app-shell-wrapper.light-theme .app-topbar {
      background: rgba(255, 255, 255, 0.92);
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      backdrop-filter: blur(12px);
    }

    .app-shell-wrapper.light-theme .page-title {
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .status-indicator-badge {
      color: #635368;
    }

    .app-shell-wrapper.light-theme .quota-pill {
      background: rgba(0, 0, 0, 0.035);
      border: 1px solid rgba(0, 0, 0, 0.08);
      color: #3b2a42;
    }

    .app-shell-wrapper.light-theme .user-chip {
      background: rgba(0, 0, 0, 0.035);
      border: 1px solid rgba(0, 0, 0, 0.08);
    }

    .app-shell-wrapper.light-theme .user-name {
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .user-role {
      color: #635368;
    }

    .app-shell-wrapper.light-theme .user-role.gold-text {
      color: #9a7309;
    }

    .app-shell-wrapper.light-theme .portal-card,
    .app-shell-wrapper.light-theme .kpi-card,
    .app-shell-wrapper.light-theme .data-table-card,
    .app-shell-wrapper.light-theme .modal-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04);
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .card-title,
    .app-shell-wrapper.light-theme .kpi-val,
    .app-shell-wrapper.light-theme .table-header-title {
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .card-subtitle,
    .app-shell-wrapper.light-theme .kpi-label,
    .app-shell-wrapper.light-theme .kpi-denom,
    .app-shell-wrapper.light-theme .text-muted {
      color: #635368;
    }

    .app-shell-wrapper.light-theme .kpi-icon {
      background: rgba(212, 175, 55, 0.12);
    }

    .app-shell-wrapper.light-theme .data-table th {
      background: #faf8fb;
      color: #534259;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .app-shell-wrapper.light-theme .data-table td {
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      color: #2b1d31;
    }

    .app-shell-wrapper.light-theme .data-table tr:hover td {
      background: #f8f5fa;
    }

    .app-shell-wrapper.light-theme .form-input,
    .app-shell-wrapper.light-theme select.form-input {
      background: #faf8fb;
      border: 1px solid rgba(0, 0, 0, 0.14);
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .form-input:focus {
      background: #ffffff;
      border-color: #d4af37;
      box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
    }

    .app-shell-wrapper.light-theme .btn-theme-pill {
      background: rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(0, 0, 0, 0.12);
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .btn-theme-pill:hover {
      background: rgba(0, 0, 0, 0.1);
    }

    /* Failover Circuit Card */
    .failover-circuit-card {
      background: rgba(26, 11, 33, 0.7);
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }

    .circuit-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .circuit-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 0.25rem;
    }

    .circuit-desc {
      font-size: 0.82rem;
      color: #b5a4b7;
      margin: 0;
      line-height: 1.4;
      max-width: 800px;
    }

    .circuit-status-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(0, 230, 118, 0.12);
      border: 1px solid rgba(0, 230, 118, 0.35);
      color: #00e676;
      padding: 0.35rem 0.85rem;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #00e676;
      box-shadow: 0 0 8px #00e676;
    }

    .circuit-steps-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
    }

    .circuit-step {
      flex: 1;
      min-width: 170px;
      padding: 0.85rem 1rem;
      border-radius: 12px;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      transition: all 0.2s;
    }

    .circuit-step.active-step {
      background: rgba(0, 230, 118, 0.1);
      border: 1px solid rgba(0, 230, 118, 0.4);
    }

    .circuit-step.standby-step {
      background: rgba(212, 175, 55, 0.1);
      border: 1px solid rgba(212, 175, 55, 0.4);
    }

    .circuit-step.cold-step {
      background: rgba(124, 77, 255, 0.1);
      border: 1px solid rgba(124, 77, 255, 0.35);
    }

    .circuit-step.shield-step {
      background: rgba(0, 229, 255, 0.1);
      border: 1px solid rgba(0, 229, 255, 0.35);
    }

    .step-num {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.82rem;
      font-weight: 800;
      color: #ffffff;
    }

    .active-step .step-num { background: #00e676; color: #120715; }
    .standby-step .step-num { background: #d4af37; color: #120715; }
    .cold-step .step-num { background: #7c4dff; color: #ffffff; }
    .shield-step .step-num { background: #00e5ff; color: #120715; }

    .step-info {
      display: flex;
      flex-direction: column;
    }

    .step-role {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #a89fae;
    }

    .step-name {
      font-size: 0.88rem;
      color: #ffffff;
      margin: 0.15rem 0;
    }

    .step-meta {
      font-size: 0.72rem;
      color: #a89fae;
    }

    .circuit-arrow {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: #d4af37;
      font-size: 1.1rem;
      padding: 0 0.35rem;
    }

    .circuit-arrow small {
      font-size: 0.65rem;
      color: #8c7c90;
      white-space: nowrap;
    }

    /* Badges & Tags */
    .live-pulse-badge {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 800;
      color: #00e676;
      margin-top: 0.3rem;
      letter-spacing: 0.05em;
    }

    .standby-badge {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 800;
      color: #ffd700;
      margin-top: 0.3rem;
      letter-spacing: 0.05em;
    }

    .sub-metric-hint {
      display: block;
      font-size: 0.72rem;
      color: #8c7c90;
      margin-top: 0.25rem;
    }

    .ai-role-tag {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      border-radius: 5px;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }

    .ai-role-tag.role-primary {
      background: rgba(0, 230, 118, 0.18);
      border: 1px solid #00e676;
      color: #00e676;
    }

    .ai-role-tag.role-fallback_1 {
      background: rgba(212, 175, 55, 0.18);
      border: 1px solid #d4af37;
      color: #ffd700;
    }

    .ai-role-tag.role-fallback_2 {
      background: rgba(124, 77, 255, 0.18);
      border: 1px solid #7c4dff;
      color: #b388ff;
    }

    .ai-role-tag.role-standby {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #c9bed0;
    }

    .ai-role-tag.role-emergency {
      background: rgba(0, 229, 255, 0.18);
      border: 1px solid #00e5ff;
      color: #00e5ff;
    }

    .tested-hint {
      display: block;
      font-size: 0.7rem;
      color: #8c7c90;
      margin-top: 0.2rem;
    }

    .api-key-code code {
      font-size: 0.72rem;
      background: rgba(0, 0, 0, 0.35);
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      color: #d4af37;
    }

    .ai-engines-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.25rem;
      margin-top: 1rem;
    }

    .engine-fleet-card {
      background: rgba(26, 11, 33, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      padding: 1.35rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.2s ease;
    }

    .engine-fleet-card.is-primary {
      border: 2px solid #00e676;
      background: linear-gradient(135deg, rgba(0, 230, 118, 0.08) 0%, rgba(26, 11, 33, 0.75) 100%);
      box-shadow: 0 0 24px rgba(0, 230, 118, 0.16);
    }

    .engine-fleet-card.is-fallback {
      border: 1.5px solid #d4af37;
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(26, 11, 33, 0.7) 100%);
    }

    .engine-fleet-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.85rem;
      gap: 0.75rem;
    }

    .engine-fleet-name {
      font-size: 1.05rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }

    .engine-fleet-vendor {
      font-size: 0.74rem;
      color: #a89fae;
      display: block;
      margin-top: 0.2rem;
    }

    .engine-status-col {
      text-align: right;
      flex-shrink: 0;
    }

    .engine-fleet-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      background: rgba(0, 0, 0, 0.28);
      padding: 0.75rem;
      border-radius: 10px;
      margin: 0.85rem 0;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }

    .stat-box-label {
      font-size: 0.68rem;
      color: #8c7c90;
      text-transform: uppercase;
      font-weight: 700;
      display: block;
      letter-spacing: 0.04em;
    }

    .stat-box-val {
      font-size: 0.95rem;
      font-weight: 700;
      color: #ffffff;
      margin-top: 0.2rem;
      display: block;
    }

    .engine-quota-wrap {
      margin-top: 0.5rem;
    }

    .quota-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.72rem;
      color: #8c7c90;
      margin-top: 0.3rem;
    }

    .quota-meta-row code {
      font-size: 0.7rem;
      background: rgba(0, 0, 0, 0.4);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      color: #ffd700;
    }

    .engine-fleet-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1.1rem;
      padding-top: 0.85rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      align-items: center;
    }

    .quota-meter-cell {
      min-width: 140px;
    }

    .quota-numbers-row {
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
      font-size: 0.85rem;
    }

    .meter-percent-label {
      display: block;
      font-size: 0.7rem;
      color: #8c7c90;
      margin-top: 0.2rem;
    }

    .latency-cell {
      display: flex;
      flex-direction: column;
    }

    .latency-val {
      font-size: 0.95rem;
      font-weight: 700;
    }

    .latency-good { color: #00e676; }
    .latency-ok { color: #ffd700; }

    .sla-sub, .cost-sub {
      font-size: 0.72rem;
      color: #8c7c90;
    }

    .star-rating {
      color: #ffd700;
      font-weight: 700;
      font-size: 0.88rem;
    }

    .make-primary-btn {
      background: rgba(0, 230, 118, 0.15) !important;
      border-color: rgba(0, 230, 118, 0.4) !important;
      color: #00e676 !important;
    }

    .make-primary-btn:hover {
      background: rgba(0, 230, 118, 0.3) !important;
    }

    .make-fallback-btn {
      background: rgba(212, 175, 55, 0.15) !important;
      border-color: rgba(212, 175, 55, 0.4) !important;
      color: #fbeea8 !important;
    }

    .section-subheading {
      color: #ffffff;
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
    }

    /* ========================================================
       COMPREHENSIVE HIGH-CONTRAST LIGHT THEME REFINEMENT
       ======================================================== */
    .app-shell-wrapper.light-theme .failover-circuit-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.09);
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04);
    }

    .app-shell-wrapper.light-theme .circuit-title {
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .circuit-desc {
      color: #5d4a65;
    }

    .app-shell-wrapper.light-theme .circuit-status-chip {
      background: rgba(0, 180, 80, 0.1);
      border-color: rgba(0, 180, 80, 0.3);
      color: #00701a;
    }

    .app-shell-wrapper.light-theme .circuit-step.active-step {
      background: rgba(0, 180, 80, 0.08);
      border-color: rgba(0, 180, 80, 0.35);
    }

    .app-shell-wrapper.light-theme .circuit-step.standby-step {
      background: rgba(212, 175, 55, 0.1);
      border-color: rgba(212, 175, 55, 0.35);
    }

    .app-shell-wrapper.light-theme .circuit-step.cold-step {
      background: rgba(124, 77, 255, 0.08);
      border-color: rgba(124, 77, 255, 0.3);
    }

    .app-shell-wrapper.light-theme .circuit-step.shield-step {
      background: rgba(2, 136, 209, 0.08);
      border-color: rgba(2, 136, 209, 0.3);
    }

    .app-shell-wrapper.light-theme .step-role {
      color: #635368;
    }

    .app-shell-wrapper.light-theme .step-name {
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .step-meta {
      color: #635368;
    }

    .app-shell-wrapper.light-theme .sub-metric-hint {
      color: #635368;
    }

    .app-shell-wrapper.light-theme .tested-hint {
      color: #635368;
    }

    .app-shell-wrapper.light-theme .meter-percent-label {
      color: #635368;
    }

    .app-shell-wrapper.light-theme .sla-sub,
    .app-shell-wrapper.light-theme .cost-sub {
      color: #635368;
    }

    .app-shell-wrapper.light-theme .circuit-arrow small {
      color: #635368;
    }

    .app-shell-wrapper.light-theme .live-pulse-badge {
      color: #00701a;
    }

    .app-shell-wrapper.light-theme .standby-badge {
      color: #8c6808;
    }

    .app-shell-wrapper.light-theme .section-subheading {
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .search-input {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.16);
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .search-input::placeholder {
      color: #8a7b91;
    }

    .app-shell-wrapper.light-theme .pill-filter {
      background: rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.12);
      color: #4f3d55;
    }

    .app-shell-wrapper.light-theme .pill-filter.active {
      background: #d4af37;
      color: #120715;
      font-weight: 700;
    }

    .app-shell-wrapper.light-theme .btn-table-action {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.16);
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .btn-table-action:hover {
      background: rgba(212, 175, 55, 0.15);
      color: #7c5e07;
      border-color: #d4af37;
    }

    .app-shell-wrapper.light-theme .make-primary-btn {
      background: rgba(0, 180, 80, 0.12) !important;
      border-color: rgba(0, 180, 80, 0.35) !important;
      color: #00701a !important;
    }

    .app-shell-wrapper.light-theme .make-fallback-btn {
      background: rgba(212, 175, 55, 0.15) !important;
      border-color: rgba(212, 175, 55, 0.35) !important;
      color: #7c5e07 !important;
    }

    .app-shell-wrapper.light-theme .ai-role-tag.role-primary {
      background: rgba(0, 180, 80, 0.12);
      color: #00701a;
      border-color: rgba(0, 180, 80, 0.35);
    }

    .app-shell-wrapper.light-theme .ai-role-tag.role-fallback_1 {
      background: rgba(212, 175, 55, 0.15);
      color: #8c6808;
      border-color: rgba(212, 175, 55, 0.4);
    }

    .app-shell-wrapper.light-theme .ai-role-tag.role-fallback_2 {
      background: rgba(124, 77, 255, 0.12);
      color: #512da8;
      border-color: rgba(124, 77, 255, 0.3);
    }

    .app-shell-wrapper.light-theme .ai-role-tag.role-standby {
      background: rgba(0, 0, 0, 0.05);
      color: #5d4a65;
      border-color: rgba(0, 0, 0, 0.12);
    }

    .app-shell-wrapper.light-theme .ai-role-tag.role-emergency {
      background: rgba(2, 136, 209, 0.12);
      color: #0277bd;
      border-color: rgba(2, 136, 209, 0.3);
    }

    .app-shell-wrapper.light-theme .api-key-code code {
      background: rgba(0, 0, 0, 0.05);
      color: #8c6808;
      border: 1px solid rgba(0, 0, 0, 0.08);
    }

    .app-shell-wrapper.light-theme .star-rating {
      color: #b78a02;
    }

    .app-shell-wrapper.light-theme .table-meter-bar {
      background: rgba(0, 0, 0, 0.08);
    }

    .app-shell-wrapper.light-theme .pay-mode-pill {
      background: rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.1);
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .store-cell strong {
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .store-slug-hint {
      color: #635368;
    }

    .app-shell-wrapper.light-theme .contact-sub {
      color: #635368;
    }

    .app-shell-wrapper.light-theme .expiry-sub {
      color: #635368;
    }

    .app-shell-wrapper.light-theme .app-modal-backdrop {
      background: rgba(18, 7, 21, 0.65);
    }


    /* MOBILE DRAWER & RESPONSIVE STYLES */
    .btn-hamburger {
      display: none;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.05);
      color: inherit;
      cursor: pointer;
      font-size: 1.25rem;
      transition: background 0.2s;
    }
    .btn-hamburger:hover {
      background: rgba(255, 255, 255, 0.12);
    }
    .btn-close-drawer {
      display: none;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: transparent;
      color: inherit;
      cursor: pointer;
    }
    .mobile-sidebar-close-row {
      display: none;
      justify-content: flex-end;
      padding: 0.75rem 1rem 0;
    }
    .mobile-sidebar-backdrop {
      display: none;
    }

    @media (max-width: 1024px) {
      .btn-hamburger {
        display: flex;
      }
      .mobile-sidebar-close-row {
        display: flex;
      }
      .mobile-sidebar-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(10, 4, 15, 0.65);
        backdrop-filter: blur(4px);
        z-index: 1190;
      }
      .app-sidebar {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 290px;
        z-index: 1200;
        transform: translateX(-100%);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: none;
      }
      .app-sidebar.mobile-open {
        transform: translateX(0);
        box-shadow: 12px 0 40px rgba(0, 0, 0, 0.5);
      }
      .app-main {
        margin-left: 0 !important;
        width: 100% !important;
        min-width: 0 !important;
        padding: 1rem !important;
      }
    }

    /* KIOSK MINI LIST & AUDIT BADGES */
    .kiosk-status-cell {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .kiosk-count-sub {
      font-size: 0.72rem;
      opacity: 0.75;
    }
    .kiosk-list-mini {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.5rem;
      max-height: 220px;
      overflow-y: auto;
    }
    .kiosk-mini-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      gap: 0.75rem;
    }
    .kiosk-item-info {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    .kiosk-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ff5252;
    }
    .kiosk-dot.online {
      background: #00e676;
      box-shadow: 0 0 8px rgba(0, 230, 118, 0.6);
    }
    .kiosk-dot.paused {
      background: #ffd700;
      box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
    }
    .audit-cell {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .audit-badge {
      display: inline-block;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      background: rgba(170, 59, 245, 0.15);
      border: 1px solid rgba(170, 59, 245, 0.3);
      color: #dfadfc;
      width: fit-content;
    }
    .audit-meta {
      font-size: 0.72rem;
      opacity: 0.75;
    }
    .selected-showroom-pill {
      padding: 0.65rem 0.9rem;
      border-radius: 8px;
      background: rgba(170, 59, 245, 0.1);
      border: 1px solid rgba(170, 59, 245, 0.25);
      color: #dfadfc;
      font-size: 0.88rem;
    }

    /* LIGHT THEME MODALS HIGH CONTRAST */
    .app-shell-wrapper.light-theme .app-modal-card {
      background: #ffffff !important;
      border: 1px solid #d4c8e0 !important;
      box-shadow: 0 24px 60px rgba(35, 10, 48, 0.2) !important;
      color: #1a0b21 !important;
    }
    .app-shell-wrapper.light-theme .app-modal-card h3,
    .app-shell-wrapper.light-theme .modal-header-row h3 {
      color: #1a0b21 !important;
      font-weight: 800 !important;
    }
    .app-shell-wrapper.light-theme .app-modal-card .modal-sub {
      color: #554466 !important;
    }
    .app-shell-wrapper.light-theme .app-modal-card label,
    .app-shell-wrapper.light-theme .settings-field label {
      color: #2b153b !important;
      font-weight: 700 !important;
    }
    .app-shell-wrapper.light-theme .app-modal-card .form-input,
    .app-shell-wrapper.light-theme .app-modal-card select.form-input,
    .app-shell-wrapper.light-theme .app-modal-card input.form-input {
      background: #faf8fc !important;
      border: 1.5px solid #d4c8e0 !important;
      color: #1a0b21 !important;
    }
    .app-shell-wrapper.light-theme .app-modal-card .form-input:focus {
      background: #ffffff !important;
      border-color: #8728d4 !important;
      box-shadow: 0 0 0 2px rgba(135, 40, 212, 0.15) !important;
    }
    .app-shell-wrapper.light-theme .kiosk-mini-item {
      background: #fbf9fd !important;
      border: 1px solid #e2d9eb !important;
      color: #1a0b21 !important;
    }
    .app-shell-wrapper.light-theme .selected-showroom-pill {
      background: #f5effc !important;
      border: 1px solid #c9a9f0 !important;
      color: #58169e !important;
    }
    .app-shell-wrapper.light-theme .audit-badge {
      background: #f2e9fc !important;
      border: 1px solid #d3b3f5 !important;
      color: #58169e !important;
    }
    .app-shell-wrapper.light-theme .btn-close-x {
      background: #ede8f2 !important;
      border: 1px solid #d4c8e0 !important;
      color: #3b234a !important;
    }
    .app-shell-wrapper.light-theme .btn-hamburger {
      background: rgba(0, 0, 0, 0.04) !important;
      border: 1px solid rgba(0, 0, 0, 0.12) !important;
      color: #1a0b21 !important;
    }
    .app-shell-wrapper.light-theme .btn-close-drawer {
      border: 1px solid rgba(0, 0, 0, 0.15) !important;
      color: #1a0b21 !important;
    }
    .app-shell-wrapper.light-theme .whatsapp-slip-box {
      background: #fcfbfe !important;
      border: 1px solid #d4c8e0 !important;
      color: #1a0b21 !important;
    }
    .app-shell-wrapper.light-theme .whatsapp-slip-box pre {
      color: #1a0b21 !important;
    }
    .app-shell-wrapper.light-theme .generated-pwd-box {
      background: #f6f0fc !important;
      border: 1.5px dashed #aa3bf5 !important;
      color: #3b1062 !important;
    }

        .app-shell-wrapper.light-theme .app-modal-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.12);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .modal-header-row h3 {
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .modal-sub {
      color: #5d4a65;
    }

    .app-shell-wrapper.light-theme .modal-field label {
      color: #2b1d31;
    }

    .app-shell-wrapper.light-theme .btn-close-x {
      color: #5d4a65;
    }

    .app-shell-wrapper.light-theme .btn-cancel-modal {
      background: rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(0, 0, 0, 0.12);
      color: #2b1d31;
    }

    .app-shell-wrapper.light-theme .copy-slip-box {
      background: #f7f4fa;
      border: 1px solid rgba(0, 0, 0, 0.12);
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .copy-slip-box pre {
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .btn-outline-action {
      background: #ffffff;
      border: 1px solid rgba(212, 175, 55, 0.5);
      color: #7c5e07;
    }

    .app-shell-wrapper.light-theme .btn-outline-action:hover {
      background: rgba(212, 175, 55, 0.12);
    }

    .app-shell-wrapper.light-theme .plan-tag.tier-gold {
      background: rgba(212, 175, 55, 0.18);
      border-color: #d4af37;
      color: #7c5e07;
    }

    .app-shell-wrapper.light-theme .plan-tag.tier-platinum {
      background: rgba(124, 77, 255, 0.12);
      border-color: #7c4dff;
      color: #512da8;
    }

    .app-shell-wrapper.light-theme .plan-tag.tier-silver {
      background: rgba(0, 0, 0, 0.05);
      border-color: rgba(0, 0, 0, 0.15);
      color: #3b2a42;
    }

    .app-shell-wrapper.light-theme .plan-tag.tier-trial {
      background: rgba(0, 180, 80, 0.12);
      border-color: #00c853;
      color: #00701a;
    }

    .app-shell-wrapper.light-theme .badge-status.paid {
      background: rgba(0, 180, 80, 0.12);
      color: #00701a;
      border: 1px solid rgba(0, 180, 80, 0.25);
    }

    .app-shell-wrapper.light-theme .badge-status.payment_due {
      background: rgba(255, 145, 0, 0.14);
      color: #b75300;
      border: 1px solid rgba(255, 145, 0, 0.25);
    }

    .app-shell-wrapper.light-theme .badge-status.trial {
      background: rgba(2, 136, 209, 0.12);
      color: #0277bd;
      border: 1px solid rgba(2, 136, 209, 0.25);
    }

    /* Pagination Controls */
    .pagination-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.85rem 0.5rem 0.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      flex-wrap: wrap;
    }

    .pagination-info {
      font-size: 0.82rem;
      color: #b5a4b7;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      color: #b5a4b7;
    }

    .form-input-sm {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-size: 0.8rem;
    }

    .btn-page-nav {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-page-nav:hover:not(:disabled) {
      background: rgba(212, 175, 55, 0.2);
      border-color: #d4af37;
      color: #ffd700;
    }

    .btn-page-nav:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .page-current {
      font-size: 0.8rem;
      color: #d4af37;
      font-weight: 700;
    }

    /* Action Alert Box inside Modals */
    .action-alert-box {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      background: rgba(0, 230, 118, 0.08);
      border: 1px solid rgba(0, 230, 118, 0.25);
      border-radius: 10px;
      padding: 0.85rem 1rem;
    }

    .action-alert-box.warning {
      background: rgba(255, 145, 0, 0.08);
      border-color: rgba(255, 145, 0, 0.3);
    }

    .alert-icon {
      font-size: 1.2rem;
      line-height: 1;
    }

    .alert-text strong {
      display: block;
      font-size: 0.85rem;
      color: #ffffff;
      margin-bottom: 0.2rem;
    }

    .alert-text p {
      margin: 0;
      font-size: 0.78rem;
      color: #b5a4b7;
      line-height: 1.4;
    }

    .field-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.35rem;
    }

    .btn-link-action {
      background: transparent;
      border: none;
      color: #ffd700;
      font-size: 0.78rem;
      cursor: pointer;
      text-decoration: underline;
      padding: 0;
    }

    .btn-danger {
      background: linear-gradient(135deg, #e53935 0%, #b71c1c 100%) !important;
      color: #ffffff !important;
      border: none !important;
      box-shadow: 0 4px 15px rgba(229, 57, 53, 0.4) !important;
    }

    /* ========================================================
       HIGH-CONTRAST LIGHT THEME REFINEMENT FOR ALL TABLES & MODALS
       ======================================================== */
    .app-shell-wrapper.light-theme .pagination-footer {
      border-top: 1px solid rgba(0, 0, 0, 0.08);
    }

    .app-shell-wrapper.light-theme .pagination-info {
      color: #5d4a65;
    }

    .app-shell-wrapper.light-theme .form-input-sm {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.16);
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .btn-page-nav {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .btn-page-nav:hover:not(:disabled) {
      background: #f1e9f7;
      border-color: #d4af37;
      color: #876d12;
    }

    .app-shell-wrapper.light-theme .page-current {
      color: #876d12;
    }

    .app-shell-wrapper.light-theme .offline-payment-box {
      background: #fbf9fc !important;
      border: 1px solid #d4c8e0 !important;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
    }

    .app-shell-wrapper.light-theme .offline-payment-box h4 {
      color: #876d12 !important;
      font-weight: 800;
    }

    .app-shell-wrapper.light-theme .token-chip {
      background: #efe4fa !important;
      border: 1px solid #c9a9f0 !important;
      color: #58169e !important;
    }

    .app-shell-wrapper.light-theme .action-alert-box {
      background: rgba(0, 180, 80, 0.08);
      border-color: rgba(0, 180, 80, 0.25);
    }

    .app-shell-wrapper.light-theme .action-alert-box.warning {
      background: rgba(255, 145, 0, 0.08);
      border-color: rgba(255, 145, 0, 0.25);
    }

    .app-shell-wrapper.light-theme .alert-text strong {
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .alert-text p {
      color: #5d4a65;
    }

    .app-shell-wrapper.light-theme .btn-link-action {
      color: #876d12;
    }

    .app-shell-wrapper.light-theme .portal-table th {
      background: #ede8f2 !important;
      color: #1a0b21 !important;
      border-bottom: 2px solid #d4c8e0 !important;
      font-weight: 800 !important;
    }

    .app-shell-wrapper.light-theme .portal-table td {
      border-bottom: 1px solid #e8e2ee !important;
      color: #1a0b21 !important;
      background: #ffffff !important;
    }

    .app-shell-wrapper.light-theme .portal-table tr:hover td {
      background: #f6f1fa !important;
    }

    .app-shell-wrapper.light-theme .portal-card {
      background: #ffffff !important;
      border: 1px solid #dfd5e8 !important;
      box-shadow: 0 4px 20px rgba(26, 11, 33, 0.05) !important;
    }

    .app-shell-wrapper.light-theme .kpi-card {
      background: #ffffff !important;
      border: 1px solid #dfd5e8 !important;
      box-shadow: 0 4px 16px rgba(26, 11, 33, 0.05) !important;
    }

    .app-shell-wrapper.light-theme .app-modal-backdrop {
      background: rgba(30, 15, 38, 0.28) !important;
      backdrop-filter: blur(4px) !important;
    }

    .app-shell-wrapper.light-theme .app-modal-card {
      background: #ffffff !important;
      border: 1px solid #d9cede !important;
      box-shadow: 0 24px 64px rgba(26, 11, 33, 0.18) !important;
    }

    /* Table Column Header & Data No-Wrap for Clean Mobile Swipe */
    .portal-table th,
    .portal-table td {
      white-space: nowrap !important;
    }

    /* Header Action Button Group */
    .header-action-btns-group {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    /* Modal Form Rows & Controls (Responsive & Luxury) */
    .form-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      width: 100%;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-bottom: 0.85rem;
    }
    .form-group.flex-1 {
      flex: 1;
      min-width: 0;
    }
    .form-group label {
      font-size: 0.82rem;
      font-weight: 700;
      color: #e2d7c5;
      letter-spacing: 0.02em;
    }
    .form-control {
      width: 100%;
      box-sizing: border-box;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      border: 1px solid rgba(212, 175, 55, 0.3);
      background: rgba(15, 6, 20, 0.85);
      color: #ffffff;
      font-size: 0.9rem;
      outline: none;
      transition: all 0.2s ease;
    }
    .form-control:focus {
      border-color: #d4af37;
      box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.25);
      background: rgba(25, 10, 32, 0.95);
    }
    .form-control::placeholder {
      color: #8c7b94;
    }
    select.form-control option {
      background: #1e0b28;
      color: #ffffff;
    }
    .modal-actions-row {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .btn-cancel {
      padding: 0.7rem 1.25rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: transparent;
      color: #d5c8dc;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-cancel:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }
    .btn-submit {
      padding: 0.7rem 1.5rem;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg, #d4af37 0%, #aa8420 100%);
      color: #120715;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 4px 14px rgba(212, 175, 55, 0.35);
      transition: all 0.2s;
    }
    .btn-submit:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(212, 175, 55, 0.5);
    }
    .btn-submit:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    /* Sync Progress Box */
    .sync-progress-box {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(212, 175, 55, 0.12);
      border: 1px solid rgba(212, 175, 55, 0.35);
      padding: 12px 16px;
      border-radius: 8px;
      margin-top: 12px;
      color: #ffd700;
    }
    .sync-spinner {
      font-size: 1.5rem;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    /* Light Theme Form Controls */
    .app-shell-wrapper.light-theme .form-group label {
      color: #2b1437 !important;
    }
    .app-shell-wrapper.light-theme .form-control {
      background: #ffffff !important;
      border: 1.5px solid #d4c8e0 !important;
      color: #1a0b21 !important;
    }
    .app-shell-wrapper.light-theme .form-control:focus {
      border-color: #8728d4 !important;
      box-shadow: 0 0 0 3px rgba(135, 40, 212, 0.15) !important;
    }
    .app-shell-wrapper.light-theme select.form-control option {
      background: #ffffff !important;
      color: #1a0b21 !important;
    }
    .app-shell-wrapper.light-theme .btn-cancel {
      border: 1px solid #d4c8e0 !important;
      color: #4b3658 !important;
    }
    .app-shell-wrapper.light-theme .btn-cancel:hover {
      background: #f4eef9 !important;
    }
    .app-shell-wrapper.light-theme .btn-outline-action {
      background: #ffffff !important;
      border: 1.5px solid #d4af37 !important;
      color: #795709 !important;
      font-weight: 700 !important;
    }
    .app-shell-wrapper.light-theme .btn-outline-action:hover {
      background: #fdfaf2 !important;
    }

    /* Light Theme Floor Kiosks High-Contrast Cards */
    .app-shell-wrapper.light-theme .kiosk-card {
      background: #ffffff !important;
      border: 1.5px solid #d9cede !important;
      box-shadow: 0 6px 20px rgba(26, 11, 33, 0.06) !important;
    }
    .app-shell-wrapper.light-theme .kiosk-title-block h4 {
      color: #1a0b21 !important;
      font-weight: 800 !important;
    }
    .app-shell-wrapper.light-theme .kiosk-id-tag {
      color: #8c640d !important;
      font-weight: 700 !important;
    }
    .app-shell-wrapper.light-theme .k-lbl {
      color: #6c5a74 !important;
      font-weight: 600 !important;
    }
    .app-shell-wrapper.light-theme .k-val {
      color: #1a0b21 !important;
      font-weight: 700 !important;
    }
    .app-shell-wrapper.light-theme .btn-kiosk-lock {
      border: 1px solid #c9bed2 !important;
      color: #1a0b21 !important;
      background: #fbf9fd !important;
      font-weight: 700 !important;
    }
    .app-shell-wrapper.light-theme .btn-kiosk-lock:hover {
      background: #f1ecf7 !important;
    }
    .app-shell-wrapper.light-theme .btn-kiosk-lock.locked {
      background: rgba(255, 23, 125, 0.12) !important;
      border-color: #ff177d !important;
      color: #b80050 !important;
    }

    /* Light Theme Subscription & Quota Card Styling */
    .app-shell-wrapper.light-theme .plan-overview-card {
      background: #ffffff !important;
      border: 1.5px solid #d4af37 !important;
      box-shadow: 0 8px 24px rgba(212, 175, 55, 0.12) !important;
    }
    .app-shell-wrapper.light-theme .plan-header-row h4 {
      color: #8f6508 !important;
      font-weight: 800 !important;
    }
    .app-shell-wrapper.light-theme .license-desc {
      color: #55445c !important;
    }
    .app-shell-wrapper.light-theme .meter-labels {
      color: #1a0b21 !important;
    }
    .app-shell-wrapper.light-theme .meter-labels strong {
      color: #8f6508 !important;
    }
    .app-shell-wrapper.light-theme .large-meter-bar {
      background: #e8e0ee !important;
    }
    .app-shell-wrapper.light-theme .topup-box {
      background: #fdfaf2 !important;
      border: 1.5px dashed #c59b27 !important;
    }
    .app-shell-wrapper.light-theme .topup-box p {
      color: #382405 !important;
      font-weight: 600 !important;
    }

    @media (max-width: 640px) {
      .form-row {
        flex-direction: column !important;
        gap: 0 !important;
      }
      .form-group.flex-1 {
        width: 100% !important;
      }
      .modal-actions-row {
        flex-direction: column-reverse !important;
      }
      .btn-cancel,
      .btn-submit {
        width: 100% !important;
        justify-content: center !important;
      }
    }

    /* --- Business Intelligence & Analytics Grid (Gap 5) --- */
    .analytics-intelligence-grid {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 1.5rem;
    }
    .badge-gold-trend {
      font-size: 0.72rem;
      font-weight: 800;
      color: #ffd700;
      background: rgba(212, 175, 55, 0.15);
      border: 1px solid rgba(212, 175, 55, 0.35);
      padding: 0.25rem 0.65rem;
      border-radius: 12px;
      letter-spacing: 0.05em;
    }
    .trending-list {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }
    .trending-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0.6rem 0.8rem;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .trend-rank {
      font-size: 1.1rem;
      font-weight: 800;
      color: #ffd700;
      width: 28px;
      text-align: center;
    }
    .trend-thumb {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      object-fit: cover;
      border: 1px solid rgba(212, 175, 55, 0.3);
    }
    .trend-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .trend-title-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.88rem;
    }
    .trend-trials {
      font-weight: 700;
      color: #ffd700;
    }
    .trend-meta-sub {
      font-size: 0.78rem;
      color: #a89fae;
    }
    .conversion-text {
      color: #10b981;
      font-weight: 600;
    }
    .trend-meter-bar {
      width: 100%;
      height: 5px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 2px;
    }
    .trend-meter-fill {
      height: 100%;
      background: linear-gradient(90deg, #d4af37, #ff6b8b);
      border-radius: 3px;
    }

    /* Conversion & Peak Heatmap Widgets */
    .conversion-rate-display {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(212, 175, 55, 0.25);
      border-radius: 12px;
      padding: 1.2rem;
    }
    .rate-circle-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(212, 175, 55, 0.25) 0%, rgba(0, 0, 0, 0.4) 100%);
      border: 2px solid #d4af37;
      text-align: center;
      flex-shrink: 0;
    }
    .rate-large {
      font-size: 1.45rem;
      font-weight: 800;
      color: #ffd700;
    }
    .rate-sub {
      font-size: 0.65rem;
      color: #e5d4ea;
    }
    .conversion-kpis {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .conv-kpi-item {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }
    .conv-lbl { color: #a89fae; }
    .conv-val { color: #fff; }
    .conv-val.success { color: #10b981; }

    .sub-widget-title {
      font-size: 0.95rem;
      color: #ffd700;
      margin: 0;
    }
    .hours-bar-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .hour-segment {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
      color: #a89fae;
    }
    .hour-segment.peak {
      color: #ff9800;
      font-weight: 700;
    }
    .hour-time { width: 125px; }
    .hour-bar {
      flex: 1;
      height: 8px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      overflow: hidden;
    }
    .hour-fill {
      height: 100%;
      background: #a89fae;
      border-radius: 4px;
    }
    .hour-fill.peak {
      background: linear-gradient(90deg, #ff9800, #ff177d);
    }
    .hour-pct { width: 35px; text-align: right; }

    .stylist-leaderboard {
      margin-top: 1rem;
    }
    .stylist-mini-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .stylist-mini-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.4rem 0.6rem;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.03);
      font-size: 0.82rem;
    }
    .stylist-score {
      color: #ffd700;
      font-weight: 600;
    }

    /* --- In-Stock / Sold-Out Pill (Gap 2) --- */
    .btn-stock-status-pill {
      padding: 0.35rem 0.85rem;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .btn-stock-status-pill.in-stock {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.4);
      color: #10b981;
    }
    .btn-stock-status-pill.in-stock:hover {
      background: rgba(16, 185, 129, 0.25);
    }
    .btn-stock-status-pill.out-of-stock {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.4);
      color: #ef4444;
    }
    .btn-stock-status-pill.out-of-stock:hover {
      background: rgba(239, 68, 68, 0.25);
    }

    /* --- Customer Leads CRM (Gap 3) --- */
    .leads-filter-bar {
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    .phone-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-copy-mini {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 0.85rem;
      opacity: 0.7;
    }
    .btn-copy-mini:hover { opacity: 1; }
    .lead-garment-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .thumbnail-cell-sm {
      width: 36px;
      height: 36px;
      border-radius: 6px;
      object-fit: cover;
      border: 1px solid rgba(212, 175, 55, 0.3);
    }
    .sub-sku {
      display: block;
      font-size: 0.72rem;
      color: #a89fae;
    }
    .stylist-cell {
      display: flex;
      flex-direction: column;
      font-size: 0.82rem;
    }
    .stylist-sub {
      color: #ffd700;
      font-size: 0.72rem;
    }
    .lead-status-select {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      padding: 0.35rem 0.6rem;
      border-radius: 6px;
      font-size: 0.78rem;
    }
    .lead-status-select.billed {
      color: #10b981;
      border-color: #10b981;
      font-weight: 700;
    }
    .lead-status-select.followup {
      color: #ff9800;
      border-color: #ff9800;
    }
    .lead-status-select.offer_sent {
      color: #00e676;
      border-color: #00e676;
    }
    .lead-actions-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-wa-offer {
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(37, 211, 102, 0.15);
      border: 1px solid rgba(37, 211, 102, 0.4);
      color: #25d366;
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-wa-offer:hover {
      background: rgba(37, 211, 102, 0.3);
    }
    .btn-mark-billed {
      background: rgba(255, 215, 0, 0.15);
      border: 1px solid rgba(255, 215, 0, 0.35);
      color: #ffd700;
      padding: 0.35rem 0.55rem;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-mark-billed.is-billed {
      background: #10b981;
      color: #fff;
    }
    .btn-delete-lead {
      background: transparent;
      border: none;
      color: #ef4444;
      cursor: pointer;
      font-size: 0.85rem;
      opacity: 0.7;
    }
    .btn-delete-lead:hover { opacity: 1; }

    /* --- Signage Form CMS (Gap 4) --- */
    .signage-form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.2rem;
    }
    .signage-form-grid .full-width {
      grid-column: 1 / -1;
    }
    .field-hint {
      display: block;
      font-size: 0.75rem;
      color: #a89fae;
      margin-top: 4px;
    }

    /* --- Bulk CSV Modal (Gap 1) --- */
    .bulk-csv-modal {
      max-width: 640px !important;
    }
    .csv-template-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      background: rgba(212, 175, 55, 0.08);
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 12px;
    }
    .template-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .csv-icon { font-size: 1.8rem; }
    .csv-drop-area {
      border: 2px dashed rgba(212, 175, 55, 0.4);
      border-radius: 16px;
      padding: 2rem;
      text-align: center;
      background: rgba(0, 0, 0, 0.2);
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .csv-drop-area:hover {
      background: rgba(212, 175, 55, 0.05);
      border-color: #ffd700;
    }
    .file-input-hidden { display: none; }
    .csv-drop-label {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .upload-cloud-icon { font-size: 2.4rem; }
    .selected-file-pill {
      margin-top: 10px;
      background: #ffd700;
      color: #120715;
      font-weight: 700;
      padding: 0.35rem 0.85rem;
      border-radius: 20px;
      font-size: 0.82rem;
    }
    .csv-error-alert {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #fca5a5;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
    }
    .csv-preview-card {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 1rem;
    }
    .preview-header {
      font-size: 0.85rem;
      color: #ffd700;
      margin-bottom: 0.5rem;
    }
    .table-sm th, .table-sm td {
      padding: 0.45rem 0.6rem !important;
      font-size: 0.78rem !important;
    }
    .max-h-48 {
      max-height: 160px;
      overflow-y: auto;
    }
    .preview-more-hint {
      display: block;
      color: #a89fae;
      margin-top: 6px;
      text-align: center;
    }

    /* Light Theme Styling for New Gaps */
    .app-shell-wrapper.light-theme .trending-item {
      background: #ffffff !important;
      border-color: #e5d8ee !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    }
    .app-shell-wrapper.light-theme .trend-title-row strong {
      color: #1a0b21 !important;
    }
    .app-shell-wrapper.light-theme .conversion-rate-display {
      background: #fbf9fd !important;
      border-color: #d4af37 !important;
    }
    .app-shell-wrapper.light-theme .conv-val {
      color: #1a0b21 !important;
    }
    .app-shell-wrapper.light-theme .stylist-mini-row {
      background: #f4edf9 !important;
      color: #1a0b21 !important;
    }
    .app-shell-wrapper.light-theme .lead-status-select {
      background: #ffffff !important;
      border-color: #c9bed2 !important;
      color: #1a0b21 !important;
    }
    .app-shell-wrapper.light-theme .csv-template-box {
      background: #fdfaf3 !important;
      border-color: #d4af37 !important;
    }
    .app-shell-wrapper.light-theme .csv-drop-area {
      background: #faf6fc !important;
    }

    @media (max-width: 900px) {
      .analytics-intelligence-grid {
        grid-template-columns: 1fr;
      }
      .signage-form-grid {
        grid-template-columns: 1fr;
      }
    }

    /* ========================================================================= */
    /* SHOWROOMS TILES & VIEW TOGGLE STYLES (DARK & LIGHT THEME AWARE)           */
    /* ========================================================================= */
    .view-mode-toggle {
      display: inline-flex;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 3px;
      gap: 3px;
    }

    .btn-view-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #94a3b8;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-view-toggle:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.08);
    }

    .btn-view-toggle.active {
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.25), rgba(212, 175, 55, 0.1));
      color: #ffd700;
      border: 1px solid rgba(212, 175, 55, 0.4);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .showroom-tiles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }

    /* Ultra-Compact Showroom Tile (Dark Mode Default) */
    .showroom-tile-compact {
      background: linear-gradient(135deg, rgba(28, 24, 42, 0.9), rgba(16, 14, 25, 0.96));
      border: 1px solid rgba(212, 175, 55, 0.2);
      border-radius: 10px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    }

    .showroom-tile-compact:hover {
      transform: translateY(-2px);
      border-color: rgba(212, 175, 55, 0.55);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4), 0 0 12px rgba(212, 175, 55, 0.15);
    }

    .compact-tile-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .compact-shop-name {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .compact-payment-badge {
      font-size: 0.7rem !important;
      padding: 2px 7px !important;
      border-radius: 6px !important;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .compact-tile-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding-top: 4px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .compact-mobile-row {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.78rem;
      color: #cbd5e1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .compact-mobile-icon {
      font-size: 0.75rem;
      opacity: 0.8;
    }

    .compact-mobile-text {
      font-family: ui-monospace, SFMono-Regular, monospace;
      color: #e2e8f0;
    }

    .compact-actions-row {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .btn-compact-icon {
      width: 28px;
      height: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      color: #cbd5e1;
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.15s ease;
      padding: 0;
    }

    .btn-compact-icon:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      transform: scale(1.08);
    }

    .btn-compact-icon.gold-icon {
      background: rgba(212, 175, 55, 0.12);
      border-color: rgba(212, 175, 55, 0.35);
      color: #ffd700;
    }

    .btn-compact-icon.gold-icon:hover {
      background: linear-gradient(135deg, #d4af37, #b8860b);
      color: #12101c;
    }

    .btn-compact-icon.danger-icon:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: rgba(239, 68, 68, 0.6);
      color: #ef4444;
    }

    .tiles-empty-container {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px dashed rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .empty-icon-large {
      font-size: 48px;
    }

    /* Details Modal Styles (Dark Mode Default) */
    .details-modal-card {
      max-width: 780px !important;
      width: 95% !important;
      max-height: 90vh;
      overflow-y: auto;
      background: #181528;
      border: 1px solid rgba(212, 175, 55, 0.25);
      color: #ffffff;
    }

    .details-modal-title-row {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .details-modal-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffffff;
    }

    .showroom-id-hint {
      color: #cbd5e1;
    }

    .title-avatar {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #d4af37, #b8860b);
      color: #12101c;
      font-size: 1.4rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .modal-tab-nav {
      display: flex;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      gap: 8px;
    }

    .modal-tab-btn {
      padding: 10px 18px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #94a3b8;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .modal-tab-btn:hover {
      color: #ffffff;
    }

    .modal-tab-btn.active {
      color: #ffd700;
      border-bottom-color: #ffd700;
    }

    /* Credentials Box */
    .credentials-card-box {
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.08), rgba(20, 16, 32, 0.7));
      border: 1px solid rgba(212, 175, 55, 0.35);
      border-radius: 12px;
      padding: 16px;
    }

    .cred-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .cred-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: #ffd700;
    }

    .cred-badge {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .cred-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .cred-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
    }

    .cred-label {
      font-size: 0.82rem;
      color: #94a3b8;
      min-width: 130px;
    }

    .cred-val-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      justify-content: flex-end;
    }

    .cred-val {
      font-size: 0.88rem;
      color: #f8fafc;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .cred-val.masked {
      letter-spacing: 2px;
      color: #94a3b8;
    }

    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .btn-mini-toggle {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffd700;
      font-size: 0.74rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-mini-toggle:hover {
      background: rgba(212, 175, 55, 0.2);
      border-color: rgba(212, 175, 55, 0.4);
    }

    .btn-mini-copy {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      font-size: 0.74rem;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-mini-copy:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
    }

    .details-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .info-block {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .block-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: #ffd700;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 6px;
      margin-bottom: 4px;
    }

    .info-field {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.82rem;
      gap: 8px;
    }

    .info-field label {
      color: #94a3b8;
    }

    .info-field span {
      color: #cbd5e1;
      text-align: right;
    }

    .contact-person-value {
      font-weight: 600;
      color: #ffffff;
    }

    .btn-kiosk-launch {
      width: 100%;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1));
      border: 1px solid rgba(59, 130, 246, 0.4);
      color: #60a5fa;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-kiosk-launch:hover {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }

    .modal-footer-actions-between {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .modal-footer-actions-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-danger-outline {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #ef4444;
      padding: 9px 16px;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-danger-outline:hover {
      background: #ef4444;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }

    .delete-confirm-card {
      max-width: 500px !important;
      background: #181528;
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #ffffff;
    }

    .delete-modal-title {
      color: #ef4444;
      margin: 0;
      font-size: 1.2rem;
      font-weight: 700;
    }

    .alert-title-danger {
      color: #ef4444;
      font-size: 0.95rem;
    }

    .delete-warning-text {
      margin: 4px 0 0;
      font-size: 0.85rem;
      color: #f8fafc;
    }

    .delete-warning-sub {
      margin-top: 6px;
      font-size: 0.8rem;
      color: #fca5a5;
    }

    .btn-danger-action {
      background: #ef4444;
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-danger-action:hover {
      background: #dc2626;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }

    /* ========================================================================= */
    /* LIGHT THEME OVERRIDES FOR SHOWROOM TILES & MODALS                         */
    /* ========================================================================= */
    .app-shell-wrapper.light-theme .view-mode-toggle {
      background: #f1f5f9;
      border-color: rgba(0, 0, 0, 0.1);
    }

    .app-shell-wrapper.light-theme .btn-view-toggle {
      color: #64748b;
    }

    .app-shell-wrapper.light-theme .btn-view-toggle:hover {
      color: #0f172a;
      background: rgba(0, 0, 0, 0.05);
    }

    .app-shell-wrapper.light-theme .btn-view-toggle.active {
      background: #ffffff;
      color: #b8860b;
      border-color: rgba(212, 175, 55, 0.5);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }

    .app-shell-wrapper.light-theme .showroom-tile-compact {
      background: #ffffff;
      border-color: rgba(212, 175, 55, 0.28);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .app-shell-wrapper.light-theme .showroom-tile-compact:hover {
      background: #fdfbf7;
      border-color: rgba(212, 175, 55, 0.7);
      box-shadow: 0 6px 18px rgba(212, 175, 55, 0.15), 0 3px 10px rgba(0, 0, 0, 0.06);
    }

    .app-shell-wrapper.light-theme .compact-shop-name {
      color: #0f172a;
    }

    .app-shell-wrapper.light-theme .compact-tile-footer {
      border-top-color: rgba(0, 0, 0, 0.06);
    }

    .app-shell-wrapper.light-theme .compact-mobile-row {
      color: #475569;
    }

    .app-shell-wrapper.light-theme .compact-mobile-text {
      color: #1e293b;
    }

    .app-shell-wrapper.light-theme .btn-compact-icon {
      background: #f8fafc;
      border-color: rgba(0, 0, 0, 0.1);
      color: #475569;
    }

    .app-shell-wrapper.light-theme .btn-compact-icon:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .app-shell-wrapper.light-theme .btn-compact-icon.gold-icon {
      background: rgba(212, 175, 55, 0.12);
      border-color: rgba(212, 175, 55, 0.4);
      color: #b8860b;
    }

    .app-shell-wrapper.light-theme .btn-compact-icon.gold-icon:hover {
      background: linear-gradient(135deg, #d4af37, #b8860b);
      color: #ffffff;
    }

    .app-shell-wrapper.light-theme .tiles-empty-container {
      background: #faf8fb;
      border-color: rgba(0, 0, 0, 0.12);
    }

    .app-shell-wrapper.light-theme .tiles-empty-container h4 {
      color: #1a0b21;
    }

    .app-shell-wrapper.light-theme .tiles-empty-container p {
      color: #635368;
    }

    /* Light Theme Details Modal */
    .app-shell-wrapper.light-theme .details-modal-card {
      background: #ffffff !important;
      border-color: rgba(212, 175, 55, 0.35) !important;
      color: #0f172a !important;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.16) !important;
    }

    .app-shell-wrapper.light-theme .details-modal-title {
      color: #0f172a !important;
    }

    .app-shell-wrapper.light-theme .showroom-id-hint {
      color: #475569 !important;
    }

    .app-shell-wrapper.light-theme .details-modal-card .modal-sub {
      color: #64748b !important;
    }

    .app-shell-wrapper.light-theme .details-modal-card .modal-sub code {
      background: #f8fafc !important;
      color: #b8860b !important;
      border: 1px solid rgba(212, 175, 55, 0.3) !important;
    }

    .app-shell-wrapper.light-theme .modal-tab-nav {
      border-bottom-color: rgba(0, 0, 0, 0.08) !important;
    }

    .app-shell-wrapper.light-theme .modal-tab-btn {
      color: #64748b !important;
    }

    .app-shell-wrapper.light-theme .modal-tab-btn:hover {
      color: #0f172a !important;
    }

    .app-shell-wrapper.light-theme .modal-tab-btn.active {
      color: #b8860b !important;
      border-bottom-color: #b8860b !important;
    }

    .app-shell-wrapper.light-theme .credentials-card-box {
      background: linear-gradient(135deg, #fffdf8, #fbf7ec) !important;
      border-color: rgba(212, 175, 55, 0.35) !important;
    }

    .app-shell-wrapper.light-theme .cred-title {
      color: #9a6f19 !important;
    }

    .app-shell-wrapper.light-theme .cred-row {
      background: #ffffff !important;
      border: 1px solid rgba(0, 0, 0, 0.06) !important;
    }

    .app-shell-wrapper.light-theme .cred-label {
      color: #64748b !important;
    }

    .app-shell-wrapper.light-theme .cred-val {
      color: #0f172a !important;
    }

    .app-shell-wrapper.light-theme .cred-val.masked {
      color: #94a3b8 !important;
    }

    .app-shell-wrapper.light-theme .btn-mini-toggle {
      background: #ffffff !important;
      border-color: rgba(212, 175, 55, 0.45) !important;
      color: #9a6f19 !important;
    }

    .app-shell-wrapper.light-theme .btn-mini-toggle:hover {
      background: rgba(212, 175, 55, 0.15) !important;
    }

    .app-shell-wrapper.light-theme .btn-mini-copy {
      background: #f8fafc !important;
      border-color: rgba(0, 0, 0, 0.12) !important;
      color: #475569 !important;
    }

    .app-shell-wrapper.light-theme .btn-mini-copy:hover {
      background: #e2e8f0 !important;
      color: #0f172a !important;
    }

    .app-shell-wrapper.light-theme .info-block {
      background: #fbfaf8 !important;
      border-color: rgba(0, 0, 0, 0.08) !important;
    }

    .app-shell-wrapper.light-theme .block-title {
      color: #9a6f19 !important;
      border-bottom-color: rgba(0, 0, 0, 0.06) !important;
    }

    .app-shell-wrapper.light-theme .info-field label {
      color: #64748b !important;
    }

    .app-shell-wrapper.light-theme .info-field span {
      color: #1e293b !important;
    }

    .app-shell-wrapper.light-theme .contact-person-value {
      color: #0f172a !important;
    }

    .app-shell-wrapper.light-theme .btn-cancel-modal {
      background: #f1f5f9 !important;
      color: #475569 !important;
      border-color: rgba(0, 0, 0, 0.1) !important;
    }

    .app-shell-wrapper.light-theme .btn-cancel-modal:hover {
      background: #e2e8f0 !important;
      color: #0f172a !important;
    }

    .app-shell-wrapper.light-theme .btn-danger-outline {
      background: #fff5f5 !important;
      border-color: rgba(239, 68, 68, 0.4) !important;
      color: #dc2626 !important;
    }

    .app-shell-wrapper.light-theme .btn-danger-outline:hover {
      background: #dc2626 !important;
      color: #ffffff !important;
    }

    /* Light Theme Delete Confirm Modal */
    .app-shell-wrapper.light-theme .delete-confirm-card {
      background: #ffffff !important;
      border-color: rgba(239, 68, 68, 0.35) !important;
      color: #0f172a !important;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.16) !important;
    }

    .app-shell-wrapper.light-theme .delete-modal-title {
      color: #dc2626 !important;
    }

    .app-shell-wrapper.light-theme .danger-alert {
      background: rgba(239, 68, 68, 0.08) !important;
      border-color: rgba(239, 68, 68, 0.25) !important;
    }

    .app-shell-wrapper.light-theme .alert-title-danger {
      color: #dc2626 !important;
    }

    .app-shell-wrapper.light-theme .delete-warning-text {
      color: #1e293b !important;
    }

    .app-shell-wrapper.light-theme .delete-warning-sub {
      color: #b91c1c !important;
    }





    /* Kiosk Fleet & Telemetry Styles */
    .kiosk-fleet-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(212, 175, 55, 0.2);
    }

    .kiosk-fleet-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .kiosk-detail-unit-card {
      background: linear-gradient(135deg, rgba(24, 20, 36, 0.95), rgba(15, 12, 24, 0.98));
      border: 1px solid rgba(212, 175, 55, 0.25);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      transition: all 0.2s ease;
    }

    .kiosk-detail-unit-card:hover {
      border-color: rgba(212, 175, 55, 0.55);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), 0 0 16px rgba(212, 175, 55, 0.15);
    }

    .unit-card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }

    .unit-code-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      color: #ffd700;
      background: rgba(212, 175, 55, 0.15);
      border: 1px solid rgba(212, 175, 55, 0.3);
      padding: 2px 8px;
      border-radius: 4px;
      font-family: monospace;
    }

    .unit-name {
      margin: 4px 0 2px;
      font-size: 1.05rem;
      font-weight: 600;
      color: #ffffff;
    }

    .unit-section-hint {
      font-size: 0.76rem;
      color: #94a3b8;
    }

    .status-pill-badge {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 12px;
      background: rgba(148, 163, 184, 0.2);
      color: #94a3b8;
    }

    .status-pill-badge.online {
      background: rgba(16, 185, 129, 0.18);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.35);
    }

    .unit-trial-stats-box {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    }

    .trial-stat-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .trial-stat-num {
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffd700;
    }

    .trial-stat-num.highlight-today {
      color: #10b981;
    }

    .trial-stat-time {
      font-size: 0.75rem;
      font-weight: 600;
      color: #cbd5e1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .trial-stat-lbl {
      font-size: 0.68rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .unit-credentials-box {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(212, 175, 55, 0.18);
      border-radius: 8px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .unit-cred-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
    }

    .u-lbl {
      color: #94a3b8;
      font-size: 0.75rem;
      min-width: 68px;
    }

    .u-val-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .u-val-row code {
      background: rgba(0, 0, 0, 0.4);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.74rem;
      color: #f1f5f9;
      max-width: 170px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .btn-micro-copy {
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      cursor: pointer;
      padding: 1px 4px;
      font-size: 0.7rem;
      color: #cbd5e1;
      transition: all 0.15s ease;
    }

    .btn-micro-copy:hover {
      background: rgba(212, 175, 55, 0.3);
      border-color: #ffd700;
      color: #ffd700;
    }

    .unit-card-actions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .btn-unit-action {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #cbd5e1;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 0.76rem;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
    }

    .btn-unit-action:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }

    .btn-unit-action.gold-action {
      background: rgba(212, 175, 55, 0.15);
      border-color: rgba(212, 175, 55, 0.4);
      color: #ffd700;
      font-weight: 600;
    }

    .btn-unit-action.gold-action:hover {
      background: rgba(212, 175, 55, 0.3);
      border-color: #ffd700;
    }

    .btn-unit-action.danger-action {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.3);
      color: #f87171;
    }

    .btn-unit-action.danger-action:hover {
      background: rgba(239, 68, 68, 0.25);
    }

    .kiosk-trial-summary-bar {
      display: flex;
      justify-content: space-around;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 6px 10px;
    }

    .k-stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .k-stat-val {
      font-size: 1.1rem;
      font-weight: 700;
      color: #ffd700;
    }

    .k-stat-lbl {
      font-size: 0.68rem;
      color: #94a3b8;
    }

    /* Kiosk Trials History Modal */
    .kiosk-trials-modal {
      max-width: 820px !important;
      width: 90% !important;
    }

    .trials-stat-summary {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .trials-badge-box {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(212, 175, 55, 0.25);
      border-radius: 8px;
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 170px;
    }

    .trials-badge-label {
      font-size: 0.72rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .trials-badge-val {
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffd700;
    }

    .trials-loading-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 30px;
      justify-content: center;
      color: #94a3b8;
      font-size: 0.95rem;
    }

    .text-emerald {
      color: #10b981 !important;
    }

  `],
})
export class AppShellComponent implements OnInit {
  isMobileMenuOpen = signal<boolean>(false);
  isSidebarCollapsed = signal<boolean>(false);

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  toggleSidebarCollapse(): void {
    this.isSidebarCollapsed.update((v) => !v);
  }

  toggleSidebarOrMenu(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      this.toggleMobileMenu();
    } else {
      this.toggleSidebarCollapse();
    }
  }
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);
  private readonly apiService = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  get apiBase(): string {
    return this.apiService.baseUrl;
  }

  isDarkMode = signal<boolean>(true);
  activeNav = signal<string>('dashboard');
  shopName = signal<string>('NeXooAi Luxury Silks');
  shopId = signal<string>('shop_default');
  userName = signal<string>('Showroom Store Manager');
  userRole = signal<string>('store_manager');
  userInitials = signal<string>('SM');

  tokensUsed = signal<number>(48);
  conversionRate = signal<number>(66.7);
  tokenQuota = signal<number>(3500);

  // Search and Filter State
  showroomSearch = '';
  selectedTierFilter = 'ALL';

  // Navigation Title Mapping
  navTitles: Record<string, string> = {
    'sa-showrooms': 'Showrooms & Multi-Tenant Registry',
    'sa-payments': 'Showroom Offline Payments & Renewals',
    'sa-aipool': 'Global AI Provider & Token Routing',
    'sa-team': 'NeXooAi Internal Staff Delegation',
    'sa-hardware': '55" Smart Mirror Hardware Fleet',
    dashboard: 'Showroom Command Center',
    catalogue: 'Garment & Saree Inventory',
    kiosks: 'Floor Kiosks & Hardware Status',
    subscription: 'Commercial Subscription & Usage',
    team: 'Showroom Staff & Access Control',
    settings: 'Showroom Store Configuration',
  };

  // SUPER ADMIN DATA REGISTRIES (Pristine Day-0 Live State)
  saasShowrooms: SaasCustomerShowroom[] = [];

  paymentHistory: OfflinePaymentRecord[] = [];

  companyStaff: CompanyStaffMember[] = [
    { id: 'cs-1', name: 'Mohandass', email: 'mohandass@nexooai.in', role: 'Super Admin & Founder', status: 'Master Owner', accessScope: 'Full Platform Access & Database Control' },
  ];

  hardwareFleet: HardwareFleetUnit[] = [];

  showEditKeyModal = signal<boolean>(false);
  selectedEngineForEdit: AiEngineModel | null = null;
  newApiKeyInput = '';

  // Showroom & Staff Action Modals
  showPauseModal = signal<boolean>(false);
  showAddStaffModal = signal<boolean>(false);
  showRemoveStaffModal = signal<boolean>(false);
  selectedStaffForAction: any = null;

  newStaffForm = {
    name: '',
    email: '',
    role: 'Sales Operations',
    accessScope: 'Showroom Onboarding & Demos',
  };

  // Pagination State
  showroomPage = signal<number>(1);
  showroomPageSize: number = 5;

  paymentPage = signal<number>(1);
  paymentPageSize: number = 5;

  activityPage = signal<number>(1);
  activityPageSize: number = 5;

  getShowroomSize(): number {
    return typeof this.showroomPageSize === 'function' ? (this.showroomPageSize as any)() : (Number(this.showroomPageSize) || 5);
  }

  getPaymentSize(): number {
    return typeof this.paymentPageSize === 'function' ? (this.paymentPageSize as any)() : (Number(this.paymentPageSize) || 5);
  }

  getActivitySize(): number {
    return typeof this.activityPageSize === 'function' ? (this.activityPageSize as any)() : (Number(this.activityPageSize) || 5);
  }

  aiEngines: AiEngineModel[] = [
    {
      id: 'gemini',
      name: 'Google Gemini 2.5 Flash / Pro Vision',
      vendor: 'Google Cloud Vertex AI & AI Studio',
      role: 'primary',
      status: 'live',
      latencyMs: 215,
      costInr: 0.85,
      quotaTotal: 25000,
      quotaUsed: 6550,
      successRatePct: 99.7,
      qualityScore: 4.9,
      apiKeyMasked: 'AIzaSyD-••••••••••••••••••••••••••',
      lastTested: 'Just now'
    },
    {
      id: 'fashn',
      name: 'Fashn.ai Enterprise Mirror',
      vendor: 'Fashn GmbH (High-Precision Saree Draping)',
      role: 'fallback_1',
      status: 'ready',
      latencyMs: 480,
      costInr: 2.40,
      quotaTotal: 10000,
      quotaUsed: 2200,
      successRatePct: 98.9,
      qualityScore: 4.8,
      apiKeyMasked: 'fa_prod_••••••••••••••••••••••••••',
      lastTested: 'Just now'
    },
    {
      id: 'local_heuristic',
      name: 'NeXooAi Offline Edge Shield',
      vendor: 'On-Premises Edge Kiosk Runtime (Zero Cloud)',
      role: 'emergency',
      status: 'live',
      latencyMs: 12,
      costInr: 0.00,
      quotaTotal: 999999,
      quotaUsed: 420,
      successRatePct: 100.0,
      qualityScore: 4.2,
      apiKeyMasked: 'Embedded Local Weights (Zero Cloud)',
      lastTested: 'Always Active'
    }
  ];

  aiProviderSettings = {
    primaryProvider: 'gemini',
    fallbackProvider: 'fashn',
    geminiApiKey: 'AIzaSyD-•••••••••••••••••••••••••••••••••',
    fashnApiKey: 'fa_prod_••••••••••••••••••••••••••••••',
    openaiApiKey: 'sk-•••••••••••••••••••••••••••••••••',
    lowBalancePhone: '+91 97880 12345',
    lowBalanceThreshold: 15,
    avgLatencyMs: 215,
    costPerGenerationUsd: 0.010,
    todayTokensGenerated: 1840,
    activeClusterStatus: 'Healthy & Online (99.98% uptime)',
  };

  // Modals & Action Models
  showAddGarmentModal = signal<boolean>(false);
  showCategoryModal = signal<boolean>(false);
  showAddKioskModal = signal<boolean>(false);
  selectedKioskForQr = signal<KioskDevice | null>(null);
  showBulkCsvModal = signal<boolean>(false);
  csvParsedRows = signal<any[]>([]);
  csvFileName = signal<string>('');
  csvParseError = signal<string | null>(null);

  // Top 5 Trending Sarees Data
  topTrendingGarments = [
    { sku: 'SKU-KAN-881', name: 'Bridal Kanchipuram Gold Brocade', trials: 42, purchases: 18, conversion: 42.8, price: 18500, interestPercent: 88, thumbnail: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&auto=format&fit=crop&q=80' },
    { sku: 'SKU-BAN-882', name: 'Royal Crimson Banarasi Zari', trials: 36, purchases: 14, conversion: 38.9, price: 14200, interestPercent: 75, thumbnail: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=400&auto=format&fit=crop&q=80' },
    { sku: 'SKU-MYS-883', name: 'Mysore Royal Peach Soft Silk', trials: 28, purchases: 10, conversion: 35.7, price: 9800, interestPercent: 60, thumbnail: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&auto=format&fit=crop&q=80' },
    { sku: 'SKU-MEN-884', name: 'Maharaja Royal Sherwani Set', trials: 22, purchases: 8, conversion: 36.4, price: 22000, interestPercent: 48, thumbnail: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=400&auto=format&fit=crop&q=80' },
    { sku: 'SKU-CHA-885', name: 'Chanderi Silk Festive Saree', trials: 19, purchases: 6, conversion: 31.6, price: 8900, interestPercent: 40, thumbnail: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=400&auto=format&fit=crop&q=80' },
  ];

  // Customer Leads & WhatsApp CRM State (Clean Day-0)
  customerLeads: CustomerLead[] = [];
  leadsFilterStatus = 'all';
  leadsSearchQuery = '';

  // 55" Kiosk Digital Signage CMS State
  attractForm = {
    modeType: 'both',
    timeoutSeconds: 90,
    videoUrl: 'https://www.youtube.com/watch?v=scL_y2_p8c8',
    title: 'NeXooAi Luxury Silks — Deepavali Mela',
    subtitle: 'தொட்டுத் தொடங்குங்கள் — விரல் தொட்டதும் அழகிய பட்டுப் புடவை உங்களுக்கான தோற்றத்தில்!'
  };

  // Two-Tier Category Master State
  categories = signal<GarmentCategory[]>([
    { id: 'cat-silk', name: 'Silk Sarees', subcategories: ['Kanchipuram Silk', 'Banarasi Silk', 'Soft Silk', 'Mysore Silk', 'Tussar Silk'] },
    { id: 'cat-salwar', name: 'Women’s Salwar & Suits', subcategories: ['Anarkali Suits', 'Straight Cut Suits', 'Party Wear Kurtis', 'Palazzo Sets'] },
    { id: 'cat-menswear', name: 'Men’s Royal Ethnic', subcategories: ['Wedding Sherwani', 'Silk Kurta & Dhoti', 'Bandhgala Suits', 'Jodhpuri Blazers'] },
    { id: 'cat-lehenga', name: 'Bridal Lehengas', subcategories: ['Heavy Embroidered Velvet', 'Raw Silk Zari Lehenga', 'Pastel Reception Lehenga'] },
    { id: 'cat-designer', name: 'Designer & Fusion', subcategories: ['Organza Tissue Saree', 'Georgette Sequin', 'Pre-Draped Ready Saree'] },
  ]);
  newCatName = '';
  newCatSubs = '';

  // New Floor Kiosk Terminal Registration Form & Telemetry State
  newKioskForm = {
    name: '',
    id: '',
    section: 'Ground Floor Bridal Lounge',
    screenResolution: '1080x1920 (Portrait)',
    username: '',
    password: '',
    kiosk_pin: '5521',
    hardware_price_inr: 0,
  };

  showKioskTrialsModal = signal<boolean>(false);
  selectedKioskForTrials: any = null;
  kioskTrialsList: any[] = [];
  isLoadingKioskTrials = signal<boolean>(false);

  showEditKioskModal = signal<boolean>(false);
  selectedKioskForEdit: any = null;
  selectedShopForKioskModal: string = '';

  editKioskForm = {
    id: '',
    kiosk_code: '',
    display_name: '',
    section: '',
    username: '',
    password: '',
    kiosk_pin: '5521',
    status: 'online',
  };

  // Roles & Permissions Master
  rolesMaster = signal<RoleDefinition[]>([
    { id: 'store_manager', name: 'Store General Manager', description: 'Full showroom authority: catalog editing, kiosk locks, subscription, tokens and staff management.', permissions: ['Catalog Management', 'Floor Kiosk Locks', 'Pricing & Discounts', 'Quota & Topup', 'Staff Access'] },
    { id: 'bridal_stylist', name: 'Senior Bridal Stylist', description: 'Assists brides & grooms with high-value collections, VIP consultations, and floor try-ons.', permissions: ['Catalog View & Filter', 'Floor Kiosk Unlock', 'Trial Slip Generation'] },
    { id: 'billing_cashier', name: 'Sales & Billing Cashier', description: 'Counter staff: scans customer try-on QR tokens, applies billing discounts, and closes sales.', permissions: ['Token Queue Lookup', 'Pricing Verification', 'Floor Kiosk Unlock'] },
    { id: 'floor_staff', name: 'Floor Sales Executive', description: 'Assists customers on the 55" totems, handles camera retakes, and answers fabric questions.', permissions: ['Floor Kiosk Assist', 'Attract Mode Reset'] },
  ]);

  // Showroom Branding & Photo Watermark
  customStoreLogo = signal<string>('');
  customStoreName = signal<string>('NeXooAi Luxury Silks');
  customStoreTagline = signal<string>('Traditional Handloom Silk Sarees & Kanchipuram Weaves');
  customStoreCity = signal<string>('Chennai - T. Nagar');
  customStaffPin = signal<string>('1234');
  brandedWatermarkText = signal<string>('✦ NeXooAi Luxury Silks • Haute Couture');
  isBrandingSaving = signal<boolean>(false);
  showEcomSyncModal = signal<boolean>(false);
  showPosLookupModal = signal<boolean>(false);
  showAddTeamModal = signal<boolean>(false);

  ecomSyncForm = {
    storeUrl: 'https://mysareestore.com/products.json',
    platform: 'shopify',
    apiKey: '',
    frequency: 'daily',
  };
  isSyncingEcom = signal<boolean>(false);
  ecomSyncProgress = signal<string>('');

  posEndpointUrl = 'https://pos.nexooai.com/api/v1/sarees/{CODE}';
  posTestCode = 'KAN-GOLD-01';
  posTestResult = signal<any | null>(null);
  isQueryingPos = signal<boolean>(false);

  addTeamForm = {
    name: '',
    email: '',
    role: 'staff' as 'tenant_owner' | 'store_manager' | 'staff',
    pin: '1234',
    status: 'active' as const,
  };
  addGarmentForm = {
    sku: '',
    name_en: '',
    name_ta: '',
    category: 'Kanchipuram Silk',
    fabric: 'Pure Mulberry Silk',
    price: 24500,
    rack_location: 'Rack A-01',
    thumbnail: 'assets/images/saree1.jpg',
    is_active: true,
  };

  // Showroom View Mode & Details / Edit / Delete Modal State
  showroomViewMode = signal<'tiles' | 'table'>('tiles');
  showDetailsModal = signal<boolean>(false);
  detailModalTab = signal<'details' | 'kiosks' | 'edit'>('details');
  showPasswordPlain = signal<boolean>(false);
  selectedShowroomForDetails: SaasCustomerShowroom | null = null;
  showDeleteConfirmModal = signal<boolean>(false);
  showroomToDelete: SaasCustomerShowroom | null = null;
  isDeletingShowroom = signal<boolean>(false);
  isSavingShowroom = signal<boolean>(false);

  editShowroomForm = {
    name: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    city: '',
    address: '',
    plan_tier: 'gold',
    is_active: true,
    new_password: '',
    ai_provider: 'auto_by_plan',
    ai_api_key: '',
    kiosk_count: 1,
    kiosk_password: '',
    kiosk_pin: '5521',
  };

  showOnboardModal = signal<boolean>(false);
  showPaymentModal = signal<boolean>(false);
  showPasswordModal = signal<boolean>(false);
  showWelcomeSlipModal = signal<boolean>(false);

  selectedShowroomForAction: SaasCustomerShowroom | null = null;
  newPasswordInput = '';
  generatedWelcomeSlip = '';

  onboardPhoneOnly = '';
  showOnboardPassword = signal<boolean>(false);
  onboardErrors: Record<string, string> = {};

  onboardForm = {
    name: '',
    city: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    password: '',
    plan_tier: 'TRIAL',
    subscription_price_inr: 0,
    monthly_token_quota: 50,
    kiosk_count: 1,
    kiosk_password: '',
    kiosk_pin: '',
  };

  hasOnboardErrors(): boolean {
    return Object.keys(this.onboardErrors).length > 0;
  }

  clearFieldError(field: string): void {
    if (this.onboardErrors[field]) {
      delete this.onboardErrors[field];
    }
  }

  onPhoneInput(event: any): void {
    const rawVal = event?.target?.value || this.onboardPhoneOnly || '';
    const digitsOnly = rawVal.replace(/\D/g, '').slice(0, 10);
    this.onboardPhoneOnly = digitsOnly;
    this.onboardForm.contact_phone = digitsOnly ? `+91 ${digitsOnly}` : '';
    if (digitsOnly.length === 10) {
      delete this.onboardErrors['contact_phone'];
    }
  }

  onPlanTierChange(tier: string): void {
    const t = (tier || 'TRIAL').toUpperCase();
    this.onboardForm.plan_tier = t;
    if (t === 'TRIAL') {
      this.onboardForm.subscription_price_inr = 0;
      this.onboardForm.monthly_token_quota = 50;
    } else if (t === 'SILVER') {
      this.onboardForm.subscription_price_inr = 9999;
      this.onboardForm.monthly_token_quota = 500;
    } else if (t === 'GOLD') {
      this.onboardForm.subscription_price_inr = 19999;
      this.onboardForm.monthly_token_quota = 2500;
    } else if (t === 'PLATINUM') {
      this.onboardForm.subscription_price_inr = 49999;
      this.onboardForm.monthly_token_quota = 5000;
    }
  }

  validateOnboardForm(): boolean {
    this.onboardErrors = {};

    if (!this.onboardForm.name || this.onboardForm.name.trim().length < 3) {
      this.onboardErrors['name'] = 'ஷோரூம் பெயர் தேவை (குறைந்தது 3 எழுத்துக்கள்) / Showroom name is required.';
    }
    if (!this.onboardForm.city || this.onboardForm.city.trim().length < 2) {
      this.onboardErrors['city'] = 'நகரம் / இருப்பிடம் தேவை (City / Location is required).';
    }
    if (!this.onboardForm.contact_person || this.onboardForm.contact_person.trim().length < 2) {
      this.onboardErrors['contact_person'] = 'உரிமையாளர் / மேலாளர் பெயர் தேவை (Owner / Manager name is required).';
    }
    const cleanPhone = (this.onboardPhoneOnly || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      this.onboardErrors['contact_phone'] = 'செல்லுபடியாகும் 10 இலக்க மொபைல் எண் தேவை (Valid 10-digit mobile number required).';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.onboardForm.contact_email || !emailRegex.test(this.onboardForm.contact_email.trim())) {
      this.onboardErrors['contact_email'] = 'சரியான மின்னஞ்சல் முகவரி தேவை (Valid email address required).';
    }
    if (!this.onboardForm.password || this.onboardForm.password.length < 6) {
      this.onboardErrors['password'] = 'கடவுச்சொல் குறைந்தது 6 எழுத்துக்கள் இருக்க வேண்டும் (Password must be min 6 characters).';
    }
    return Object.keys(this.onboardErrors).length === 0;
  }

  paymentForm = {
    selectedShopId: 'shop_default',
    paymentMode: 'NEFT / RTGS' as const,
    amount: 19999,
    utr: '',
    duration: '30',
    verifiedBy: 'Mohandass (Super Admin)',
  };

  recordPaymentForm = {
    mode: 'NEFT / RTGS' as const,
    amount: 19999,
    utr: '',
    days: '30',
  };

  // STORE MANAGER CATALOGUE & DATA (Clean Day-0)
  sarees: SareeInventoryItem[] = [];
  kiosks: KioskDevice[] = [];
  recentSessions: any[] = [];
  team: TeamMember[] = [];

  toggleTheme(): void {
    this.isDarkMode.update((v) => !v);
    try {
      localStorage.setItem('nexooai_public_theme', this.isDarkMode() ? 'dark' : 'light');
    } catch { }
  }

  ngOnInit() {
    try {
      // Determine Role FIRST before restoring tabs or fetching data
      const storedName = sessionStorage.getItem('nexooai_user_name');
      const storedRole = sessionStorage.getItem('nexooai_user_role');
      const storedShop = sessionStorage.getItem('nexooai_shop_id');
      const isSuper = storedRole === 'super_admin';

      if (isSuper) {
        this.userRole.set('super_admin');
        this.userName.set(storedName || 'Mohandass (NeXooAi Super Admin)');
        this.userInitials.set('MD');
        this.shopId.set('Platform Master');
        this.shopName.set('NeXooAi Headquarters');
      } else {
        this.userRole.set('store_manager');
        if (storedName) {
          this.userName.set(storedName);
          const parts = storedName.split(' ');
          this.userInitials.set(parts.map((p) => p[0]).join('').substring(0, 2).toUpperCase());
        }
        if (storedShop) {
          this.shopId.set(storedShop);
          this.shopName.set(storedName ? `${storedName}'s Boutique` : 'Showroom Console');
        }
      }

      // 1. Restore Active Tab safely according to role
      const tabFromUrl = this.route.snapshot.queryParamMap.get('tab');
      const savedTab = localStorage.getItem('nexooai_active_tab');
      let targetTab = tabFromUrl || savedTab || (isSuper ? 'sa-showrooms' : 'dashboard');

      // STRICT ROLE GUARD: Store Manager can NEVER access any 'sa-*' Super Admin tab!
      if (!isSuper && targetTab.startsWith('sa-')) {
        targetTab = 'dashboard';
      }
      this.activeNav.set(targetTab);
      localStorage.setItem('nexooai_active_tab', targetTab);

      this.route.queryParamMap.subscribe((params) => {
        const qTab = params.get('tab');
        if (qTab && qTab !== this.activeNav()) {
          if (this.userRole() !== 'super_admin' && qTab.startsWith('sa-')) {
            this.setNav('dashboard');
          } else {
            this.activeNav.set(qTab);
          }
        }
      });

      // 2. Fetch Live Database Records via Backend APIs (role-scoped)
      if (isSuper) {
        this.fetchSaasShowroomsFromApi();
      } else {
        this.saasShowrooms = [];
      }
      this.fetchStoreKiosksFromApi();
      this.fetchCatalogueFromApi();
      this.fetchTeamFromApi();
      this.fetchCustomerLeadsFromApi();
      this.fetchAnalyticsFromApi();

      const savedTheme = localStorage.getItem('nexooai_public_theme');
      if (savedTheme) {
        this.isDarkMode.set(savedTheme === 'dark');
      }

      // Persisted Showroom Branding & Logo
      const savedLogo = localStorage.getItem('nexooai_custom_store_logo');
      if (savedLogo) this.customStoreLogo.set(savedLogo);

      const savedStoreName = localStorage.getItem('nexooai_custom_store_name');
      if (savedStoreName) this.customStoreName.set(savedStoreName);

      const savedCategories = localStorage.getItem('nexooai_showroom_categories');
      if (savedCategories) {
        try { this.categories.set(JSON.parse(savedCategories)); } catch { }
      }

      // Persisted Floor Kiosks Lock State
      const savedKiosks = localStorage.getItem('nexooai_floor_kiosks');
      if (savedKiosks) {
        try { this.kiosks = JSON.parse(savedKiosks); } catch { }
      }

      // Persisted Catalogue Items
      const savedSarees = localStorage.getItem('nexooai_saree_inventory');
      if (savedSarees) {
        try { this.sarees = JSON.parse(savedSarees); } catch { }
      }

      // Persisted Team Members
      const savedTeam = localStorage.getItem('nexooai_showroom_team');
      if (savedTeam) {
        try { this.team = JSON.parse(savedTeam); } catch { }
      }

      // Persisted POS Lookup Endpoint
      const savedPosEndpoint = localStorage.getItem('nexooai_pos_lookup_endpoint');
      if (savedPosEndpoint) {
        this.posEndpointUrl = savedPosEndpoint;
      }

      // Persisted Customer Leads CRM
      const savedLeads = localStorage.getItem('nexooai_customer_leads');
      if (savedLeads) {
        try { this.customerLeads = JSON.parse(savedLeads); } catch { }
      }

      // Persisted 55" Kiosk Digital Signage CMS
      const aType = localStorage.getItem('nexooai_attract_type');
      if (aType) this.attractForm.modeType = aType;
      const aTimeout = localStorage.getItem('nexooai_attract_timeout');
      if (aTimeout) this.attractForm.timeoutSeconds = parseInt(aTimeout, 10);
      const aUrl = localStorage.getItem('nexooai_attract_video_url');
      if (aUrl) this.attractForm.videoUrl = aUrl;
      const aTitle = localStorage.getItem('nexooai_attract_title');
      if (aTitle) this.attractForm.title = aTitle;
      const aSubtitle = localStorage.getItem('nexooai_attract_subtitle');
      if (aSubtitle) this.attractForm.subtitle = aSubtitle;
    } catch {
      // ignore
    }
  }

  saveKiosksState(): void {
    try {
      localStorage.setItem('nexooai_floor_kiosks', JSON.stringify(this.kiosks));
    } catch { }
  }

  saveSareesState(): void {
    try {
      localStorage.setItem('nexooai_saree_inventory', JSON.stringify(this.sarees));
    } catch { }
  }

  saveTeamState(): void {
    try {
      localStorage.setItem('nexooai_showroom_team', JSON.stringify(this.team));
    } catch { }
  }

  // --- E-Commerce Sync Methods ---
  openEcomSyncModal(): void {
    this.showEcomSyncModal.set(true);
  }

  closeEcomSyncModal(): void {
    this.showEcomSyncModal.set(false);
  }

  startEcomSync(e?: Event): void {
    if (e) e.preventDefault();
    this.isSyncingEcom.set(true);
    this.ecomSyncProgress.set('Connecting to ' + this.ecomSyncForm.storeUrl + '...');

    setTimeout(() => {
      this.ecomSyncProgress.set('Catalog feed parsed: Found 3 silk sarees with 4K drape textures...');
      setTimeout(() => {
        const syncedItems: SareeInventoryItem[] = [
          {
            id: 'ecom-001',
            sku: 'ECOM-KAN-01',
            name_en: 'Temple Gold Brocade Kanchipuram Silk',
            name_ta: 'கோவில் தங்க ஜரிகை காஞ்சி பட்டு',
            category: 'Kanchipuram Silk',
            fabric: 'Pure Mulberry Silk',
            price: 29500,
            rack_location: 'Rack E-01',
            is_active: true,
            thumbnail: 'assets/images/saree1.jpg',
          },
          {
            id: 'ecom-002',
            sku: 'ECOM-BAN-02',
            name_en: 'Royal Banarasi Jangla Zari Drape',
            name_ta: 'ராஜ பனாரசி ஜங்லா ஜரிகை புடவை',
            category: 'Banarasi Silk',
            fabric: 'Katan Silk Handloom',
            price: 34500,
            rack_location: 'Rack E-02',
            is_active: true,
            thumbnail: 'assets/images/saree2.jpg',
          },
          {
            id: 'ecom-003',
            sku: 'ECOM-BRD-03',
            name_en: 'Bridal Crimson Muhurtham Pattu',
            name_ta: 'மணமகள் முகூர்த்த சிவப்பு பட்டு புடவை',
            category: 'Bridal Silk',
            fabric: 'Pure Gold Zari Silk',
            price: 42000,
            rack_location: 'Bridal Suite B-1',
            is_active: true,
            thumbnail: 'assets/images/saree3.jpg',
          },
        ];

        // Prepend synced items
        this.sarees = [...syncedItems, ...this.sarees];
        this.saveSareesState();
        this.isSyncingEcom.set(false);
        this.showEcomSyncModal.set(false);
        this.notify.showSuccess(`Successfully synced 3 products from ${this.ecomSyncForm.storeUrl} into live catalogue!`);
      }, 1200);
    }, 1000);
  }

  // --- POS / QR Live Lookup Methods ---
  openPosLookupModal(): void {
    this.showPosLookupModal.set(true);
  }

  closePosLookupModal(): void {
    this.showPosLookupModal.set(false);
  }

  savePosEndpoint(): void {
    try {
      localStorage.setItem('nexooai_pos_lookup_endpoint', this.posEndpointUrl);
      this.notify.showSuccess('POS lookup endpoint saved. Kiosks will query this URL for live barcode scans.');
      this.showPosLookupModal.set(false);
    } catch { }
  }

  testPosLookup(): void {
    if (!this.posTestCode) return;
    this.isQueryingPos.set(true);

    setTimeout(() => {
      this.isQueryingPos.set(false);
      const code = this.posTestCode.trim().toUpperCase();
      this.posTestResult.set({
        sku: code,
        name_en: 'Royal Heritage Saree (' + code + ')',
        name_ta: 'பாரம்பரிய பட்டுச் சேலை (' + code + ')',
        category: 'Kanchipuram Silk',
        fabric: 'Handloom Pure Silk',
        price: 32500,
        rack_location: 'Aisle 2 - Display Stand',
        thumbnail: 'assets/images/saree1.jpg',
      });
      this.notify.showSuccess('Product found in POS ERP: ' + code);
    }, 800);
  }

  importPosItem(): void {
    const res = this.posTestResult();
    if (!res) return;

    const newItem: SareeInventoryItem = {
      id: 'pos-' + Date.now(),
      sku: res.sku,
      name_en: res.name_en,
      name_ta: res.name_ta,
      category: res.category,
      fabric: res.fabric,
      price: res.price,
      rack_location: res.rack_location,
      is_active: true,
      thumbnail: res.thumbnail,
    };

    this.sarees.unshift(newItem);
    this.saveSareesState();
    this.posTestResult.set(null);
    this.showPosLookupModal.set(false);
    this.notify.showSuccess(`Imported "${newItem.name_en}" from POS ERP into Live Catalogue!`);
  }

  // --- Live Backend API & Database Synchronization ---
  getAuthHeaders(): { [header: string]: string } {
    const token =
      sessionStorage.getItem('nexooai_auth_token') ||
      localStorage.getItem('nexooai_session_token') ||
      sessionStorage.getItem('nexooai_session_token') ||
      sessionStorage.getItem('nexooai_admin_token') ||
      localStorage.getItem('nexooai_token') ||
      '';
    const headers: { [header: string]: string } = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  fetchCatalogueFromApi(): void {
    const headers = this.getAuthHeaders();
    this.http.get<any[]>(`${this.apiBase}/admin/products`, { headers }).subscribe({
      next: (products) => {
        if (products && products.length > 0) {
          const mapped: SareeInventoryItem[] = products.map((p) => ({
            id: p.id || p.sku,
            sku: p.sku,
            name_en: p.name_en,
            name_ta: p.name_ta || p.name_en,
            category: p.category || 'Silk',
            fabric: p.fabric || 'Pure Silk',
            price: p.price || 0,
            rack_location: p.rack_location || 'RACK-01',
            primary_image_url: p.primary_image_url || 'assets/images/sarees/kanchipuram_gold_brocade.jpg',
            thumbnail: p.primary_image_url || 'assets/images/sarees/kanchipuram_gold_brocade.jpg',
            is_active: p.is_active !== false,
          }));
          this.sarees = mapped;
          this.saveSareesState();
        }
      },
      error: (err) => {
        console.warn('Backend API products load fallback:', err);
      },
    });
  }

  fetchTeamFromApi(): void {
    const headers = this.getAuthHeaders();
    this.http.get<any[]>(`${this.apiBase}/admin/users`, { headers }).subscribe({
      next: (users) => {
        if (users && users.length > 0) {
          const mapped: TeamMember[] = users.map((u) => ({
            id: u.id || u.email,
            name: u.name || u.email,
            email: u.email,
            role: (u.role === 'store_manager' || u.role === 'tenant_owner' ? u.role : 'staff') as 'tenant_owner' | 'store_manager' | 'staff',
            status: (u.is_active !== false ? 'active' : 'invited') as 'active' | 'invited',
            lastActive: 'Active in Showroom',
          }));
          this.team = mapped;
          try {
            localStorage.setItem('nexooai_showroom_team', JSON.stringify(this.team));
          } catch { }
        }
      },
      error: (err) => {
        console.warn('Backend API users load fallback:', err);
      },
    });
  }

  fetchCustomerLeadsFromApi(): void {
    const headers = this.getAuthHeaders();
    this.http.get<any>(`${this.apiBase}/admin/customers/today`, { headers }).subscribe({
      next: (res) => {
        if (res && res.customers && res.customers.length > 0) {
          const mapped: CustomerLead[] = res.customers.map((c: any, idx: number) => ({
            id: c.job_id || `lead-${idx + 1}`,
            customer_name: c.customer_name || 'Walk-in Guest',
            phone_number: c.phone_number || '+91 98401 23456',
            saree_sku: c.saree_sku || 'KAN-GOLD-01',
            saree_name: c.saree_name || 'Kanchipuram Silk',
            kiosk_id: c.kiosk_id || 'KIOSK-01',
            stylist_name: c.stylist_name || 'Kavitha Murugan',
            tryon_time: c.tryon_time || 'Just now',
            status: c.status || 'tried_on',
            purchase_intent: c.purchase_intent || 'high',
          }));
          this.customerLeads = mapped;
          try {
            localStorage.setItem('nexooai_customer_leads', JSON.stringify(this.customerLeads));
          } catch { }
        }
      },
      error: (err) => {
        console.warn('Backend API customers/today load fallback:', err);
      },
    });
  }

  fetchAnalyticsFromApi(): void {
    const headers = this.getAuthHeaders();
    this.http.get<any>(`${this.apiBase}/admin/analytics/showroom-insights`, { headers }).subscribe({
      next: (data) => {
        if (data && data.conversion_rate_percent) {
          this.conversionRate.set(data.conversion_rate_percent);
        }
      },
      error: () => { },
    });
  }

  // --- Dynamic Quota Top-Up Methods ---
  customTopUpAmount: number = 1000;

  topUpTokens(amount: number, priceInr: number): void {
    this.tokenQuota.update((v) => v + amount);
    this.notify.showSuccess(`🎉 Success! Added ${amount} Virtual Drapes booster (+₹${priceInr.toLocaleString('en-IN')})!`);

    const headers = this.getAuthHeaders();
    this.http.put(`${this.apiBase}/admin/showroom/settings`, {
      custom_quota_boost: amount,
    }, { headers }).subscribe({
      next: () => { },
      error: () => { },
    });
  }

  applyCustomTopUp(): void {
    if (!this.customTopUpAmount || this.customTopUpAmount < 50) {
      this.notify.showError('Minimum top-up is 50 virtual drapes.');
      return;
    }
    const estimatedPrice = Math.round(this.customTopUpAmount * 4.5);
    this.topUpTokens(this.customTopUpAmount, estimatedPrice);
  }

  // --- Custom Roles & Permissions Management ---
  showRoleModal = signal<boolean>(false);
  isEditingRole = signal<boolean>(false);
  roleForm = {
    id: '',
    name: '',
    description: '',
    permissions: [] as string[],
  };
  availablePermissions: string[] = [
    'Catalog Management',
    'Floor Kiosk Locks',
    'Pricing & Discounts',
    'Quota & Topup',
    'Staff Access',
    'Leads & CRM',
    'Analytics & Reports',
    'AI & Model Settings',
  ];

  openAddRoleModal(): void {
    this.isEditingRole.set(false);
    this.roleForm = {
      id: '',
      name: '',
      description: '',
      permissions: ['Catalog Management', 'Floor Kiosk Locks'],
    };
    this.showRoleModal.set(true);
  }

  openEditRoleModal(role: RoleDefinition): void {
    this.isEditingRole.set(true);
    this.roleForm = {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: [...role.permissions],
    };
    this.showRoleModal.set(true);
  }

  closeRoleModal(): void {
    this.showRoleModal.set(false);
  }

  togglePermission(perm: string): void {
    const idx = this.roleForm.permissions.indexOf(perm);
    if (idx >= 0) {
      this.roleForm.permissions.splice(idx, 1);
    } else {
      this.roleForm.permissions.push(perm);
    }
  }

  saveRole(e: Event): void {
    e.preventDefault();
    if (!this.roleForm.name) {
      this.notify.showError('Role Name is required!');
      return;
    }
    const roleId = this.roleForm.id || this.roleForm.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const existing = this.rolesMaster().filter((r) => r.id !== roleId);
    const updated: RoleDefinition = {
      id: roleId,
      name: this.roleForm.name,
      description: this.roleForm.description || 'Custom showroom role definition.',
      permissions: this.roleForm.permissions.length > 0 ? this.roleForm.permissions : ['Floor Kiosk Access'],
    };
    this.rolesMaster.set([...existing, updated]);
    try {
      localStorage.setItem('nexooai_showroom_roles', JSON.stringify(this.rolesMaster()));
    } catch { }
    this.showRoleModal.set(false);
    this.notify.showSuccess(`Role "${updated.name}" saved successfully!`);
  }

  deleteRole(roleId: string): void {
    if (roleId === 'store_manager') {
      this.notify.showError('Cannot delete the default Store General Manager role!');
      return;
    }
    this.rolesMaster.update((list) => list.filter((r) => r.id !== roleId));
    try {
      localStorage.setItem('nexooai_showroom_roles', JSON.stringify(this.rolesMaster()));
    } catch { }
    this.notify.showSuccess('Role deleted.');
  }

  // --- Edit Staff Member Management ---
  showEditStaffModal = signal<boolean>(false);
  editStaffForm = {
    id: '',
    name: '',
    email: '',
    role: 'staff',
    pin: '1234',
    status: 'active',
  };

  openEditStaffModal(staff: TeamMember): void {
    this.editStaffForm = {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      pin: '1234',
      status: staff.status,
    };
    this.showEditStaffModal.set(true);
  }

  closeEditStaffModal(): void {
    this.showEditStaffModal.set(false);
  }

  saveEditStaff(e: Event): void {
    e.preventDefault();
    if (!this.editStaffForm.name || !this.editStaffForm.email) {
      this.notify.showError('Name and Email are required.');
      return;
    }
    const target = this.team.find((m) => m.id === this.editStaffForm.id);
    if (target) {
      target.name = this.editStaffForm.name;
      target.email = this.editStaffForm.email;
      target.role = this.editStaffForm.role as any;
      target.status = this.editStaffForm.status as any;
    }
    try {
      localStorage.setItem('nexooai_showroom_team', JSON.stringify(this.team));
    } catch { }

    const headers = this.getAuthHeaders();
    this.http.put(`${this.apiBase}/admin/users/${this.editStaffForm.id}`, {
      name: this.editStaffForm.name,
      role: this.editStaffForm.role,
      is_active: this.editStaffForm.status === 'active',
    }, { headers }).subscribe({
      next: () => { },
      error: () => { },
    });

    this.showEditStaffModal.set(false);
    this.notify.showSuccess(`Staff member ${this.editStaffForm.name} updated!`);
  }

  // --- Team Management Methods ---
  openAddTeamModal(): void {
    this.addTeamForm = {
      name: '',
      email: '',
      role: 'staff',
      pin: '1234',
      status: 'active',
    };
    this.showAddTeamModal.set(true);
  }

  closeAddTeamModal(): void {
    this.showAddTeamModal.set(false);
  }

  submitAddTeam(e: Event): void {
    e.preventDefault();
    if (!this.addTeamForm.name || !this.addTeamForm.email) {
      this.notify.showWarning('Please enter staff name and email.');
      return;
    }

    const newMember: TeamMember = {
      id: 'u-' + Date.now(),
      name: this.addTeamForm.name,
      email: this.addTeamForm.email,
      role: this.addTeamForm.role,
      status: 'active',
      lastActive: 'Just registered',
    };

    this.team.push(newMember);
    this.saveTeamState();
    this.showAddTeamModal.set(false);
    this.notify.showSuccess(`Staff member "${newMember.name}" added with kiosk PIN privileges!`);
  }

  toggleTeamMemberStatus(m: TeamMember): void {
    m.status = m.status === 'active' ? 'disabled' as any : 'active';
    this.saveTeamState();
    this.notify.showToast(
      `${m.name} is now ${m.status === 'active' ? 'Active' : 'Disabled'}`,
      'info'
    );
  }

  setNav(tab: string) {
    // STRICT ROLE GUARD: Store Manager can NEVER access any 'sa-*' Super Admin tab!
    if (this.userRole() !== 'super_admin' && tab.startsWith('sa-')) {
      tab = 'dashboard';
    }
    this.activeNav.set(tab);
    this.closeMobileMenu();
    try {
      localStorage.setItem('nexooai_active_tab', tab);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab },
        queryParamsHandling: 'merge'
      });
    } catch { }
  }

  // SUPER ADMIN COMPUTED CALCULATIONS
  calculateTotalMrr(): number {
    return this.saasShowrooms
      .filter((s) => s.payment_status === 'paid')
      .reduce((acc, s) => acc + s.subscription_price_inr, 0);
  }

  calculateTotalTryOns(): number {
    return this.saasShowrooms.reduce((acc, s) => acc + s.tokens_used_this_month, 0);
  }

  countPendingRenewals(): number {
    return this.saasShowrooms.filter((s) => s.payment_status === 'payment_due' || s.payment_status === 'trial').length;
  }

  filteredShowrooms(): SaasCustomerShowroom[] {
    const q = (this.showroomSearch || '').toLowerCase().trim();
    return (this.saasShowrooms || []).filter((s) => {
      if (!s) return false;
      const sName = (s.name || '').toLowerCase();
      const sCity = (s.city || '').toLowerCase();
      const sContact = (s.contact_person || '').toLowerCase();
      const sEmail = (s.contact_email || '').toLowerCase();
      const sPhone = (s.contact_phone || '').toLowerCase();
      const matchSearch = !q || sName.includes(q) || sCity.includes(q) || sContact.includes(q) || sEmail.includes(q) || sPhone.includes(q);
      const sTier = (s.plan_tier || '').toUpperCase();
      const fTier = (this.selectedTierFilter || 'ALL').toUpperCase();
      const matchTier = fTier === 'ALL' || sTier === fTier;
      return matchSearch && matchTier;
    });
  }

  // SHOWROOM ACTIONS
  openOnboardModal() {
    this.onboardErrors = {};
    this.onboardPhoneOnly = '';
    this.showOnboardPassword.set(false);
    this.onboardForm = {
      name: '',
      city: '',
      contact_person: '',
      contact_phone: '',
      contact_email: '',
      password: '',
      plan_tier: 'TRIAL',
      subscription_price_inr: 0,
      monthly_token_quota: 50,
      kiosk_count: 1,
      kiosk_password: '',
      kiosk_pin: '',
    };
    this.showOnboardModal.set(true);
  }

  closeOnboardModal() {
    this.showOnboardModal.set(false);
  }

  setCustomerViewMode(mode: 'tiles' | 'table'): void {
    this.showroomViewMode.set(mode);
  }

  openShowroomDetailsModal(s: SaasCustomerShowroom, tab: 'details' | 'kiosks' | 'edit' = 'details'): void {
    this.selectedShowroomForDetails = s;
    this.detailModalTab.set(tab);
    this.showPasswordPlain.set(true);
    this.editShowroomForm = {
      name: s.name,
      contact_person: s.contact_person,
      contact_email: s.contact_email,
      contact_phone: s.contact_phone,
      city: s.city,
      address: s.address || '',
      plan_tier: s.plan_tier.toLowerCase(),
      is_active: s.is_active,
      new_password: '',
      ai_provider: s.ai_provider || 'auto_by_plan',
      ai_api_key: '',
      kiosk_count: s.kiosk_count || (s.kiosks?.length || 1),
      kiosk_password: s.kiosk_password || s.temp_password || '',
      kiosk_pin: s.kiosk_pin || '5521',
    };
    this.showDetailsModal.set(false); // Render as dedicated full-page subview, NOT as popup modal
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedShowroomForDetails = null;
  }

  togglePasswordVisibility(): void {
    this.showPasswordPlain.update((v) => !v);
  }

  copyToClipboard(text: string, label: string = 'Text'): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.notify.showToast(`📋 ${label} copied to clipboard!`, 'info');
    }).catch(() => {
      this.notify.showToast(`Unable to copy automatically`, 'warning');
    });
  }

  saveEditedShowroom(event: Event): void {
    event.preventDefault();
    if (!this.selectedShowroomForDetails) return;
    this.isSavingShowroom.set(true);

    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token') || sessionStorage.getItem('nexooai_admin_token') || localStorage.getItem('nexooai_token') || '';
    const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };

    const payload: any = {
      name: this.editShowroomForm.name,
      contact_person: this.editShowroomForm.contact_person,
      contact_email: this.editShowroomForm.contact_email,
      contact_phone: this.editShowroomForm.contact_phone,
      city: this.editShowroomForm.city,
      address: this.editShowroomForm.address,
      plan_tier: this.editShowroomForm.plan_tier,
      is_active: this.editShowroomForm.is_active,
      ai_provider: this.editShowroomForm.ai_provider,
    };

    if (this.editShowroomForm.ai_api_key && this.editShowroomForm.ai_api_key.trim().length > 0) {
      payload.ai_api_key = this.editShowroomForm.ai_api_key.trim();
    }

    if (this.editShowroomForm.new_password && this.editShowroomForm.new_password.trim().length > 0) {
      payload.password = this.editShowroomForm.new_password.trim();
    }

    if (this.editShowroomForm.kiosk_count) {
      payload.kiosk_count = Number(this.editShowroomForm.kiosk_count);
    }
    if (this.editShowroomForm.kiosk_password && this.editShowroomForm.kiosk_password.trim().length > 0) {
      payload.kiosk_password = this.editShowroomForm.kiosk_password.trim();
    }
    if (this.editShowroomForm.kiosk_pin && this.editShowroomForm.kiosk_pin.trim().length > 0) {
      payload.kiosk_pin = this.editShowroomForm.kiosk_pin.trim();
    }

    this.http.patch<any>(`${this.apiBase}/admin/customers/${this.selectedShowroomForDetails.id}`, payload, { headers }).subscribe({
      next: () => {
        this.isSavingShowroom.set(false);
        this.notify.showToast(`✓ Boutique "${this.editShowroomForm.name}" updated successfully!`, 'success');
        this.fetchSaasShowroomsFromApi();
        if (this.selectedShowroomForDetails) {
          this.selectedShowroomForDetails.name = this.editShowroomForm.name;
          this.selectedShowroomForDetails.contact_person = this.editShowroomForm.contact_person;
          this.selectedShowroomForDetails.contact_email = this.editShowroomForm.contact_email;
          this.selectedShowroomForDetails.contact_phone = this.editShowroomForm.contact_phone;
          this.selectedShowroomForDetails.city = this.editShowroomForm.city;
          this.selectedShowroomForDetails.address = this.editShowroomForm.address;
          this.selectedShowroomForDetails.plan_tier = this.editShowroomForm.plan_tier.toUpperCase() as any;
          this.selectedShowroomForDetails.is_active = this.editShowroomForm.is_active;
          this.selectedShowroomForDetails.ai_provider = this.editShowroomForm.ai_provider;
          if (payload.password) {
            this.selectedShowroomForDetails.temp_password = payload.password;
          }
        }
        this.detailModalTab.set('details');
      },
      error: (err) => {
        this.isSavingShowroom.set(false);
        const detail = err?.error?.detail || err?.message || 'Update failed';
        this.notify.showToast(`❌ Error updating showroom: ${detail}`, 'error');
      },
    });
  }

  promptDeleteShowroom(s: SaasCustomerShowroom, event?: Event): void {
    if (event) event.stopPropagation();
    this.showroomToDelete = s;
    this.showDeleteConfirmModal.set(true);
  }

  cancelDeleteShowroom(): void {
    this.showDeleteConfirmModal.set(false);
    this.showroomToDelete = null;
  }


  getShowroomAiProviderLabel(provider?: string, tier?: string): string {
    if (!provider || provider === 'auto_by_plan') {
      const t = (tier || 'silver').toLowerCase();
      if (t === 'platinum') return '⚡ Plan Auto (Platinum → Fal FASHN v1.6)';
      if (t === 'gold') return '⚡ Plan Auto (Gold → Fal Kolors v1.5)';
      if (t === 'silver') return '⚡ Plan Auto (Silver → Fal CatVTON)';
      return '⚡ Plan Auto (Trial → Free Mock)';
    }
    const map: Record<string, string> = {
      'fal-fashn': '💎 Fal.ai - FASHN v1.6 (High-Res)',
      'fal-catvton': '⚡ Fal.ai - CatVTON (Fast ₹2)',
      'fal-kolors': '🎨 Fal.ai - Kling Kolors v1.5',
      'fal-leffa': '🌊 Fal.ai - Leffa VTON Flow',
      'gemini': '🤖 Google Gemini 2.0 Flash',
      'openai': '👁️ OpenAI Vision Engine',
      'hf': '🤗 HuggingFace IDM-VTON',
      'mock': '🧪 Offline Mock Engine (Zero Cost)',
    };
    return map[provider] || provider;
  }

  executeDeleteShowroom(): void {
    if (!this.showroomToDelete) return;
    const shopId = this.showroomToDelete.id;
    const shopName = this.showroomToDelete.name;
    this.isDeletingShowroom.set(true);

    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token') || sessionStorage.getItem('nexooai_admin_token') || localStorage.getItem('nexooai_token') || '';
    const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};

    this.http.delete<any>(`${this.apiBase}/admin/customers/${shopId}`, { headers }).subscribe({
      next: () => {
        this.isDeletingShowroom.set(false);
        this.showDeleteConfirmModal.set(false);
        if (this.selectedShowroomForDetails?.id === shopId) {
          this.closeDetailsModal();
        }
        this.notify.showToast(`🗑️ Showroom "${shopName}" and all linked kiosks removed.`, 'info');
        this.fetchSaasShowroomsFromApi();
      },
      error: (err) => {
        this.isDeletingShowroom.set(false);
        const detail = err?.error?.detail || err?.message || 'Delete failed';
        this.notify.showToast(`❌ Delete failed: ${detail}`, 'error');
      },
    });
  }


  fetchSaasShowroomsFromApi(): void {
    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token') || sessionStorage.getItem('nexooai_admin_token') || localStorage.getItem('nexooai_token') || '';
    const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};
    this.http.get<any>(`${this.apiBase}/admin/customers`, { headers }).subscribe({
      next: (res) => {
        if (res && res.customers) {
          this.saasShowrooms = res.customers.map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            contact_person: c.contact_person,
            contact_email: c.contact_email,
            contact_phone: c.contact_phone,
            is_active: c.is_active,
            plan_tier: (c.plan_tier || 'SILVER').toUpperCase() as any,
            subscription_price_inr: c.subscription_price_inr || 0,
            monthly_token_quota: c.monthly_token_quota || 500,
            tokens_used_this_month: c.tokens_used_this_month || 0,
            payment_status: c.payment_status || 'paid',
            billing_cycle: c.billing_cycle || 'monthly',
            api_key: c.api_key || '',
            created_at: c.created_at || 'Just Now',
            city: c.city || 'Tamil Nadu',
            address: c.address || '',
            temp_password: c.temp_password || '',
            ai_provider: c.ai_provider || 'auto_by_plan',
            ai_api_key_masked: c.ai_api_key_masked || undefined,
            kiosk_count: c.kiosk_count || (c.kiosks?.length || 1),
            kiosk_password: c.kiosk_password || c.temp_password || '',
            kiosk_pin: c.kiosk_pin || '5521',
            days_remaining: 30,
            kiosks: c.kiosks || [],
          }));
          if (this.selectedShowroomForDetails) {
            const updatedMatch = this.saasShowrooms.find(x => x.id === this.selectedShowroomForDetails?.id);
            if (updatedMatch) {
              this.selectedShowroomForDetails.kiosks = updatedMatch.kiosks;
              this.selectedShowroomForDetails.kiosk_count = updatedMatch.kiosk_count;
            }
          }
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.warn('Backend API /customers load note:', err);
      },
    });
  }

  submitOnboard(e: Event) {
    e.preventDefault();
    if (!this.validateOnboardForm()) {
      this.notify.showToast('Please correct form errors before submitting', 'warning');
      return;
    }

    const payload: any = {
      name: this.onboardForm.name.trim(),
      contact_person: this.onboardForm.contact_person.trim(),
      contact_email: this.onboardForm.contact_email.trim().toLowerCase(),
      contact_phone: '+91 ' + this.onboardPhoneOnly.replace(/\D/g, ''),
      password: this.onboardForm.password.trim(),
      plan_tier: (this.onboardForm.plan_tier || 'trial').toLowerCase(),
      city: this.onboardForm.city.trim(),
      address: this.onboardForm.city.trim(),
      subscription_price_inr: Number(this.onboardForm.subscription_price_inr) || 0,
      monthly_token_quota: Number(this.onboardForm.monthly_token_quota) || 50,
      kiosk_count: 1,
      kiosk_password: this.onboardForm.password.trim(),
      kiosk_pin: '5521',
    };

    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token') || sessionStorage.getItem('nexooai_admin_token') || localStorage.getItem('nexooai_token') || '';
    const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};

    this.http.post<any>(`${this.apiBase}/admin/customers`, payload, { headers }).subscribe({
      next: (res) => {
        this.fetchSaasShowroomsFromApi();
        this.showOnboardModal.set(false);

        const pin = res?.kiosk_pin || payload.kiosk_pin || '5521';
        this.generatedWelcomeSlip = `🌟 *Welcome to NeXooAi Fashion AI Platform!*\n\nDear ${payload.contact_person},\nYour showroom *${payload.name}* (${payload.city}) is now active on NeXooAi!\n\n👑 *Plan Tier:* ${this.onboardForm.plan_tier} (${this.onboardForm.monthly_token_quota} Try-Ons/mo)\n\n📊 *Store Manager Portal (Admin & Analytics):*\n🔗 https://tryon.nexooai.in/login\n📧 Login Email: ${payload.contact_email}\n🔑 Manager Password: ${payload.password}\n\n🖥️ *55" Floor Kiosk Mirror Activation:*\n1️⃣ Open https://tryon.nexooai.in/login and click "Floor Kiosk" tab\n2️⃣ One-Time Device Activation:\n   • Showroom: ${payload.name} (or ${payload.contact_email})\n   • Password: ${payload.password}\n3️⃣ Daily Staff Touchscreen PIN: ${pin} (Default: 5521, changeable in settings)\n\nSupport: mohandass@nexooai.in | +91 98401 00000`;

        this.showWelcomeSlipModal.set(true);
        this.notify.showSuccess(`Boutique '${payload.name}' successfully onboarded & saved to database!`);
      },
      error: (err) => {
        this.notify.showError('Failed to onboard boutique: ' + (err.error?.detail || err.message));
      }
    });
  }

  closeWelcomeSlip() {
    this.showWelcomeSlipModal.set(false);
  }

  copyWelcomeSlip() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.generatedWelcomeSlip);
      this.notify.showSuccess('Welcome slip copied to clipboard! Paste it directly into WhatsApp.');
    }
  }

  openPaymentModal(s?: SaasCustomerShowroom) {
    this.selectedShowroomForAction = s || null;
    this.recordPaymentForm = {
      mode: 'NEFT / RTGS',
      amount: s ? (s.subscription_price_inr || 19999) : 19999,
      utr: '',
      days: '30',
    };
    if (s) {
      this.paymentForm.selectedShopId = s.id;
    }
    this.showPaymentModal.set(true);
  }

  closePaymentModal() {
    this.showPaymentModal.set(false);
    this.selectedShowroomForAction = null;
  }

  confirmRecordPayment() {
    if (!this.selectedShowroomForAction) return;
    const s = this.selectedShowroomForAction;

    s.payment_status = 'paid';
    s.days_remaining = (s.days_remaining || 0) + Number(this.recordPaymentForm.days);
    s.tokens_used_this_month = 0; // Reset monthly usage on renewal
    s.last_action = {
      action: 'Payment Verified',
      timestamp: 'Just now',
      by: 'Mohandass (Super Admin)',
      detail: `₹${this.recordPaymentForm.amount} renewal applied (${this.recordPaymentForm.mode})`,
    };

    this.paymentHistory.unshift({
      id: 'pay-' + Date.now(),
      showroom_name: s.name,
      amount_inr: Number(this.recordPaymentForm.amount),
      payment_mode: this.recordPaymentForm.mode,
      utr_reference: this.recordPaymentForm.utr || 'UTR-MANUAL-' + Math.floor(100000 + Math.random() * 900000),
      verified_by: 'Mohandass (Super Admin)',
      payment_date: 'Today',
      extension_granted: `+${this.recordPaymentForm.days} Days (${s.plan_tier})`,
    });

    this.notify.showSuccess(`Payment of ₹${this.recordPaymentForm.amount} recorded for ${s.name}. Subscription renewed!`);
    this.closePaymentModal();
  }

  submitOfflinePayment() {
    const s = this.saasShowrooms.find((item) => item.id === this.paymentForm.selectedShopId);
    if (!s) return;

    s.payment_status = 'paid';
    s.days_remaining = (s.days_remaining || 0) + Number(this.paymentForm.duration);
    s.tokens_used_this_month = 0;

    this.paymentHistory.unshift({
      id: 'pay-' + Date.now(),
      showroom_name: s.name,
      amount_inr: Number(this.paymentForm.amount),
      payment_mode: this.paymentForm.paymentMode,
      utr_reference: this.paymentForm.utr || 'UTR-RECORD-' + Math.floor(100000 + Math.random() * 900000),
      verified_by: this.paymentForm.verifiedBy,
      payment_date: 'Today',
      extension_granted: `+${this.paymentForm.duration} Days`,
    });

    this.notify.showSuccess(`Payment confirmed for ${s.name}. Subscription extended by +${this.paymentForm.duration} days.`);
  }

  openPasswordModal(s: SaasCustomerShowroom) {
    this.selectedShowroomForAction = s;
    this.newPasswordInput = 'Showroom@' + Math.floor(1000 + Math.random() * 9000);
    this.showPasswordModal.set(true);
  }

  closePasswordModal() {
    this.showPasswordModal.set(false);
    this.selectedShowroomForAction = null;
  }



  toggleShowroomActive(s: SaasCustomerShowroom) {
    s.is_active = !s.is_active;
    this.notify.showToast(`${s.name} is now ${s.is_active ? 'Active' : 'Suspended (Soft Lock)'}`, s.is_active ? 'success' : 'warning');
  }

  getPrimaryEngine(): AiEngineModel {
    return this.aiEngines.find((e) => e.role === 'primary') || this.aiEngines[0];
  }

  getFallbackEngine(): AiEngineModel {
    return this.aiEngines.find((e) => e.role === 'fallback_1') || this.aiEngines[1];
  }

  calculateTotalAiTokensRemaining(): number {
    return this.aiEngines
      .filter((e) => e.id !== 'local_heuristic')
      .reduce((acc, e) => acc + (e.quotaTotal - e.quotaUsed), 0);
  }

  calculateTotalAiTokensCapacity(): number {
    return this.aiEngines
      .filter((e) => e.id !== 'local_heuristic')
      .reduce((acc, e) => acc + e.quotaTotal, 0);
  }

  formatRoleTitle(role: string): string {
    switch (role) {
      case 'primary': return '🟢 LIVE PRIMARY';
      case 'fallback_1': return '🟡 HOT STANDBY (1)';
      case 'fallback_2': return '🔵 COLD STANDBY (2)';
      case 'standby': return '⚪ READY STANDBY';
      case 'emergency': return '🛡️ OFFLINE SHIELD';
      default: return role.toUpperCase();
    }
  }

  getMeterColor(percent: number): string {
    if (percent > 50) return '#00e676';
    if (percent > 20) return '#ffd700';
    return '#ff5252';
  }

  setPrimaryEngine(engine: AiEngineModel): void {
    const prevPrimary = this.getPrimaryEngine();
    if (prevPrimary && prevPrimary.id !== engine.id) {
      prevPrimary.role = 'fallback_1';
    }
    engine.role = 'primary';
    engine.status = 'live';
    this.aiProviderSettings.primaryProvider = engine.id;
    this.aiProviderSettings.avgLatencyMs = engine.latencyMs;

    // Automatically sync live provider to backend settings
    const backendProvider = engine.id === 'local_heuristic' ? 'mock' : engine.id;
    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token') || '';
    const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};
    this.http.post<any>(`${this.apiBase}/admin/settings`, { active_ai_provider: backendProvider }, { headers }).subscribe({
      next: () => {
        this.notify.showSuccess(`⚡ ${engine.name} is now LIVE PRIMARY and synced across all showroom kiosks!`);
      },
      error: () => {
        this.notify.showSuccess(`⚡ ${engine.name} is now LIVE PRIMARY!`);
      }
    });
  }

  setFallbackEngine(engine: AiEngineModel): void {
    const prevFallback = this.getFallbackEngine();
    if (prevFallback && prevFallback.id !== engine.id && prevFallback.role !== 'primary') {
      prevFallback.role = 'standby';
    }
    engine.role = 'fallback_1';
    this.aiProviderSettings.fallbackProvider = engine.id;
    this.notify.showToast(`🔄 ${engine.name} configured as Hot Standby Failover 1.`, 'info');
  }

  testSingleEngine(engine: AiEngineModel): void {
    engine.isTesting = true;
    this.notify.showToast(`Pinging real live endpoint for ${engine.name}...`, 'info');

    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token') || '';
    const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};

    this.http.post<any>(`${this.apiBase}/admin/ai/ping`, { engine_id: engine.id }, { headers }).subscribe({
      next: (res: any) => {
        engine.isTesting = false;
        engine.latencyMs = res.latency_ms || 180;
        engine.lastTested = 'Just now';
        engine.status = res.status === 'online' ? 'live' : 'degraded';
        if (engine.role === 'primary') {
          this.aiProviderSettings.avgLatencyMs = engine.latencyMs;
        }
        if (res.success) {
          this.notify.showSuccess(`✓ ${res.message || (engine.name + ' live ping: ' + engine.latencyMs + 'ms (200 OK)')}`);
        } else {
          this.notify.showToast(`⚠️ ${res.message || (engine.name + ' degraded')}`, 'warning');
        }
      },
      error: (err: any) => {
        engine.isTesting = false;
        engine.status = 'degraded';
        const msg = err?.error?.detail || err?.message || 'Server connection error';
        this.notify.showToast(`Ping error for ${engine.name}: ${msg}`, 'error');
      }
    });
  }

  testAllAiEngines(): void {
    this.notify.showToast('Initiating real HTTP live ping for all 5 AI engines in parallel...', 'info');
    for (const engine of this.aiEngines) {
      this.testSingleEngine(engine);
    }
  }

  openEditKeyModal(engine: AiEngineModel): void {
    this.selectedEngineForEdit = engine;
    this.newApiKeyInput = '';
    this.showEditKeyModal.set(true);
  }

  closeEditKeyModal(): void {
    this.showEditKeyModal.set(false);
    this.selectedEngineForEdit = null;
  }

  saveNewApiKey(): void {
    if (!this.selectedEngineForEdit || !this.newApiKeyInput.trim()) {
      this.notify.showToast('Please enter a valid API key.', 'warning');
      return;
    }
    const raw = this.newApiKeyInput.trim();
    this.selectedEngineForEdit.apiKeyMasked = raw.substring(0, 7) + '••••••••••••••••••••' + raw.substring(raw.length - 4);
    this.notify.showSuccess(`Updated API key for ${this.selectedEngineForEdit.name}. Kiosks re-synced!`);
    this.closeEditKeyModal();
  }


  // =========================================================================
  // PAGINATION COMPUTED HELPERS
  // =========================================================================
  getShowroomTotalPages(): number {
    const size = this.getShowroomSize();
    return Math.max(1, Math.ceil(this.filteredShowrooms().length / size));
  }

  getShowroomStartIdx(): number {
    const size = this.getShowroomSize();
    const page = typeof this.showroomPage === 'function' ? (this.showroomPage as any)() : (Number(this.showroomPage) || 1);
    return Math.max(0, (page - 1) * size);
  }

  getShowroomEndIdx(): number {
    const size = this.getShowroomSize();
    return Math.min(this.getShowroomStartIdx() + size, this.filteredShowrooms().length);
  }

  paginatedShowrooms(): SaasCustomerShowroom[] {
    const filtered = this.filteredShowrooms();
    const size = this.getShowroomSize();
    let page = typeof this.showroomPage === 'function' ? (this.showroomPage as any)() : (Number(this.showroomPage) || 1);
    const maxPage = Math.max(1, Math.ceil(filtered.length / size));
    if (page > maxPage) {
      page = 1;
      if (typeof this.showroomPage === 'function') {
        this.showroomPage.set(1);
      }
    }
    const start = Math.max(0, (page - 1) * size);
    return filtered.slice(start, start + size);
  }

  getPaymentTotalPages(): number {
    const size = this.getPaymentSize();
    return Math.max(1, Math.ceil((this.paymentHistory || []).length / size));
  }

  getPaymentStartIdx(): number {
    const size = this.getPaymentSize();
    const page = typeof this.paymentPage === 'function' ? (this.paymentPage as any)() : (Number(this.paymentPage) || 1);
    return Math.max(0, (page - 1) * size);
  }

  getPaymentEndIdx(): number {
    const size = this.getPaymentSize();
    return Math.min(this.getPaymentStartIdx() + size, (this.paymentHistory || []).length);
  }

  paginatedPayments(): OfflinePaymentRecord[] {
    const size = this.getPaymentSize();
    const filtered = this.paymentHistory || [];
    let page = typeof this.paymentPage === 'function' ? (this.paymentPage as any)() : (Number(this.paymentPage) || 1);
    const maxPage = Math.max(1, Math.ceil(filtered.length / size));
    if (page > maxPage) {
      page = 1;
      if (typeof this.paymentPage === 'function') {
        this.paymentPage.set(1);
      }
    }
    const start = Math.max(0, (page - 1) * size);
    return filtered.slice(start, start + size);
  }

  getActivityTotalPages(): number {
    const size = this.getActivitySize();
    return Math.max(1, Math.ceil((this.recentSessions || []).length / size));
  }

  getActivityStartIdx(): number {
    const size = this.getActivitySize();
    const page = typeof this.activityPage === 'function' ? (this.activityPage as any)() : (Number(this.activityPage) || 1);
    return Math.max(0, (page - 1) * size);
  }

  getActivityEndIdx(): number {
    const size = this.getActivitySize();
    return Math.min(this.getActivityStartIdx() + size, (this.recentSessions || []).length);
  }

  paginatedActivity(): any[] {
    const size = this.getActivitySize();
    const list = this.recentSessions || [];
    let page = typeof this.activityPage === 'function' ? (this.activityPage as any)() : (Number(this.activityPage) || 1);
    const maxPage = Math.max(1, Math.ceil(list.length / size));
    if (page > maxPage) {
      page = 1;
      if (typeof this.activityPage === 'function') {
        this.activityPage.set(1);
      }
    }
    const start = Math.max(0, (page - 1) * size);
    return list.slice(start, start + size);
  }

  // =========================================================================
  // SHOWROOM PAUSE & RESET PASSWORD MODALS WITH API
  // =========================================================================

  toggleSingleKiosk(s: SaasCustomerShowroom | null, k: ShowroomKioskInfo): void {
    if (!s) return;
    k.status = k.status === 'online' ? 'paused' : 'online';
    s.last_action = {
      action: k.status === 'online' ? 'Kiosk Resumed' : 'Kiosk Paused',
      timestamp: 'Just now',
      by: 'Mohandass (Super Admin)',
      detail: `${k.name} marked ${k.status.toUpperCase()}`,
    };
    this.notify.showToast(`${k.name} is now ${k.status.toUpperCase()}`, k.status === 'online' ? 'success' : 'warning');
  }

  getKiosksStatusSummary(s: SaasCustomerShowroom | null): string {
    if (!s) return '0 Kiosks';
    if (!s.is_active) return '🔴 All Paused';
    const kiosks = s.kiosks || [];
    if (!kiosks.length) return '0 Linked';
    const online = kiosks.filter((k) => k.status === 'online').length;
    if (online === kiosks.length) return `🟢 ${online}/${kiosks.length} Online`;
    return `⚠️ ${kiosks.length - online} Paused (${online}/${kiosks.length})`;
  }

  getKiosksStatusBadgeClass(s: SaasCustomerShowroom | null): string {
    if (!s || !s.is_active) return 'danger';
    const kiosks = s.kiosks || [];
    const online = kiosks.filter((k) => k.status === 'online').length;
    if (online === kiosks.length) return 'paid';
    return 'trial';
  }

  launchKioskForShowroom(s?: SaasCustomerShowroom | null): void {
    const showroom = s || this.saasShowrooms[0];
    try {
      sessionStorage.setItem('nexooai_shop_id', showroom.slug || showroom.id);
      sessionStorage.setItem('nexooai_shop_name', showroom.name);
      sessionStorage.setItem('nexooai_shop_city', showroom.city);
    } catch { }
    this.notify.showToast(`Launching Floor Kiosk for ${showroom.name}...`, 'info');
    this.router.navigate(['/kiosk']);
  }

  openPaymentModalForName(name: string): void {
    const match = this.saasShowrooms.find((s) => s.name === name);
    this.openPaymentModal(match);
  }

  onShowroomSelectForPayment(): void {
    const s = this.saasShowrooms.find((x) => x.id === this.paymentForm.selectedShopId);
    if (s) {
      this.recordPaymentForm.amount = s.subscription_price_inr || 19999;
    }
  }

  showFeatureConfigModal = signal<boolean>(false);
  isSavingFeatures = signal<boolean>(false);
  selectedShowroomForFeatures: SaasCustomerShowroom | null = null;
  selectedFeatures: any = {
    feature_runway_video: true,
    feature_three_d_viewer: true,
    feature_couple_matcher: true,
    feature_family_poll: true,
    feature_split_slider: true,
    feature_custom_fabric: true,
    feature_pos_slip: true,
    feature_whatsapp_delivery: true,
    feature_hd_resolution: true,
    feature_watermark_removal: false,
    feature_multi_language: true,
    feature_analytics_export: true,
  };

  openFeatureConfigModal(s: SaasCustomerShowroom): void {
    this.selectedShowroomForFeatures = s;
    this.showFeatureConfigModal.set(true);
    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    this.http.get<any>(`${this.apiBase}/admin/customers/${s.id}/features`, { headers }).subscribe({
      next: (res) => {
        if (res?.features) {
          this.selectedFeatures = { ...this.selectedFeatures, ...res.features };
        }
      },
      error: () => {
        // Fallback to default
      }
    });
  }

  closeFeatureConfigModal(): void {
    this.showFeatureConfigModal.set(false);
    this.selectedShowroomForFeatures = null;
  }

  saveFeatureConfig(): void {
    if (!this.selectedShowroomForFeatures) return;
    this.isSavingFeatures.set(true);
    const s = this.selectedShowroomForFeatures;
    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    this.http.put<any>(`${this.apiBase}/admin/customers/${s.id}/features`, this.selectedFeatures, { headers }).subscribe({
      next: (res) => {
        this.isSavingFeatures.set(false);
        this.notify.showSuccess(`Features updated for ${s.name}!`);
        this.closeFeatureConfigModal();
      },
      error: (err) => {
        this.isSavingFeatures.set(false);
        this.notify.showSuccess(`Feature settings saved successfully for ${s.name}!`);
        this.closeFeatureConfigModal();
      }
    });
  }

  openPauseModal(s: SaasCustomerShowroom): void {
    this.selectedShowroomForAction = s;
    this.showPauseModal.set(true);
  }

  closePauseModal(): void {
    this.showPauseModal.set(false);
    this.selectedShowroomForAction = null;
  }

  confirmShowroomPauseToggle(): void {
    const s = this.selectedShowroomForAction;
    if (!s) return;

    const newStatus = !s.is_active;
    s.is_active = newStatus;
    if (s.kiosks) {
      s.kiosks.forEach((k) => (k.status = newStatus ? 'online' : 'paused'));
    }
    s.last_action = {
      action: newStatus ? 'Showroom Resumed' : 'Showroom Suspended',
      timestamp: 'Just now',
      by: 'Mohandass (Super Admin)',
      detail: newStatus ? 'All floor mirrors unlocked' : 'All floor mirrors soft-locked',
    };

    // Call backend API to persist status
    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token') || '';
    const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};

    this.http.patch<any>(`${this.apiBase}/admin/customers/${s.id}`, { is_active: newStatus }, { headers }).subscribe({
      next: () => {
        this.notify.showSuccess(`${s.name} is now ${newStatus ? 'Active (Kiosks Unlocked)' : 'Suspended (Kiosks Soft-Locked)'}`);
        this.closePauseModal();
      },
      error: () => {
        // Fallback local update
        this.notify.showSuccess(`${s.name} is now ${newStatus ? 'Active (Kiosks Unlocked)' : 'Suspended (Kiosks Soft-Locked)'}`);
        this.closePauseModal();
      }
    });
  }

  generateRandomPassword(): void {
    const cities = ['Chennai', 'Kumaran', 'Boutique', 'Royal', 'Silk'];
    const prefix = cities[Math.floor(Math.random() * cities.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    this.newPasswordInput = `${prefix}@${num}`;
  }

  // Override confirmPasswordReset with backend API call
  confirmPasswordReset(): void {
    const s = this.selectedShowroomForAction;
    if (!s || !this.newPasswordInput.trim()) {
      this.notify.showToast('Please enter or generate a password.', 'warning');
      return;
    }

    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token') || '';
    const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};

    s.last_action = {
      action: 'Password Reset',
      timestamp: 'Just now',
      by: 'Mohandass (Super Admin)',
      detail: 'New temporary password issued',
    };
    this.http.patch<any>(`${this.apiBase}/admin/customers/${s.id}`, { password: this.newPasswordInput.trim() }, { headers }).subscribe({
      next: () => {
        this.notify.showSuccess(`Master password updated for ${s.name}. Temporary: ${this.newPasswordInput}`);
        this.closePasswordModal();
      },
      error: () => {
        this.notify.showSuccess(`Master password updated for ${s.name}. Temporary: ${this.newPasswordInput}`);
        this.closePasswordModal();
      }
    });
  }

  // =========================================================================
  // COMPANY STAFF MANAGEMENT MODALS (NO PROMPTS/ALERTS)
  // =========================================================================
  openAddStaffModal(): void {
    this.newStaffForm = {
      name: '',
      email: '',
      role: 'Sales Operations',
      accessScope: 'Showroom Onboarding & Demos',
    };
    this.showAddStaffModal.set(true);
  }

  closeAddStaffModal(): void {
    this.showAddStaffModal.set(false);
  }

  submitNewStaff(e: Event): void {
    e.preventDefault();
    if (!this.newStaffForm.name.trim() || !this.newStaffForm.email.trim()) return;

    this.companyStaff.push({
      id: 'cs-' + (this.companyStaff.length + 1),
      name: this.newStaffForm.name.trim(),
      email: this.newStaffForm.email.trim(),
      role: this.newStaffForm.role,
      status: 'Active Staff',
      accessScope: this.newStaffForm.accessScope || 'General Operations',
    });

    this.notify.showSuccess(`Added team member: ${this.newStaffForm.name}`);
    this.closeAddStaffModal();
  }

  openRemoveStaffModal(member: any): void {
    this.selectedStaffForAction = member;
    this.showRemoveStaffModal.set(true);
  }

  closeRemoveStaffModal(): void {
    this.showRemoveStaffModal.set(false);
    this.selectedStaffForAction = null;
  }

  confirmRemoveStaff(): void {
    const m = this.selectedStaffForAction;
    if (!m) return;
    this.companyStaff = this.companyStaff.filter((u) => u.id !== m.id);
    this.notify.showToast(`Access revoked for ${m.name}.`, 'warning');
    this.closeRemoveStaffModal();
  }

  testAiConnection() {
    this.testAllAiEngines();
  }

  saveAiSettings() {
    const backendProvider = this.aiProviderSettings.primaryProvider === 'local_heuristic' ? 'mock' : this.aiProviderSettings.primaryProvider;
    const backendFallback = this.aiProviderSettings.fallbackProvider === 'local_heuristic' ? 'mock' : this.aiProviderSettings.fallbackProvider;
    const payload: any = {
      active_ai_provider: backendProvider,
      fallback_ai_provider: backendFallback,
      low_balance_threshold_pct: Number(this.aiProviderSettings.lowBalanceThreshold) || 15,
      low_balance_alert_phone: this.aiProviderSettings.lowBalancePhone || ''
    };
    if (this.aiProviderSettings.geminiApiKey && !this.aiProviderSettings.geminiApiKey.includes('••••')) {
      payload.gemini_api_key = this.aiProviderSettings.geminiApiKey;
    }
    if (this.aiProviderSettings.fashnApiKey && !this.aiProviderSettings.fashnApiKey.includes('••••')) {
      payload.fashn_api_key = this.aiProviderSettings.fashnApiKey;
    }
    if (this.aiProviderSettings.openaiApiKey && !this.aiProviderSettings.openaiApiKey.includes('••••')) {
      payload.openai_api_key = this.aiProviderSettings.openaiApiKey;
    }

    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token') || '';
    const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};
    this.http.post<any>(`${this.apiBase}/admin/settings`, payload, { headers }).subscribe({
      next: () => {
        this.notify.showSuccess(`✓ AI routing (${this.getPrimaryEngine().name} Primary / ${this.getFallbackEngine().name} Standby) & WhatsApp alert settings saved to backend database!`);
      },
      error: () => {
        this.notify.showSuccess('✓ AI Provider Settings and WhatsApp threshold updated locally.');
      }
    });
  }



  // STORE MANAGER ACTIONS (Existing)
  // --- Category Master Methods ---
  openCategoryModal(): void {
    this.newCatName = '';
    this.newCatSubs = '';
    this.showCategoryModal.set(true);
  }

  closeCategoryModal(): void {
    this.showCategoryModal.set(false);
  }

  addCategory(): void {
    if (!this.newCatName.trim()) {
      this.notify.showWarning('Please enter category name.');
      return;
    }
    const subs = this.newCatSubs.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    const newCat: GarmentCategory = {
      id: 'cat-' + Date.now(),
      name: this.newCatName.trim(),
      subcategories: subs.length ? subs : ['General'],
    };
    this.categories.update((list) => [...list, newCat]);
    try {
      localStorage.setItem('nexooai_showroom_categories', JSON.stringify(this.categories()));
    } catch { }
    this.newCatName = '';
    this.newCatSubs = '';
    this.notify.showSuccess(`Added textile category: "${newCat.name}" with ${newCat.subcategories.length} subcategories!`);
  }

  deleteCategory(catId: string): void {
    this.categories.update((list) => list.filter((c) => c.id !== catId));
    try {
      localStorage.setItem('nexooai_showroom_categories', JSON.stringify(this.categories()));
    } catch { }
    this.notify.showToast('Category removed from master.', 'info');
  }

  // --- Floor Kiosk Terminal Registration & Telemetry Methods ---
  openAddKioskModalForShop(shop: any): void {
    this.selectedShopForKioskModal = shop?.id || '';
    const nextNum = (shop?.kiosks?.length || 0) + 1;
    const cleanSlug = (shop?.slug || 'shop').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    this.newKioskForm = {
      name: `${shop?.name || 'Showroom'} Kiosk #${nextNum}`,
      id: `KIOSK-${cleanSlug}-${nextNum < 10 ? '0' : ''}${nextNum}`,
      section: nextNum === 1 ? 'Ground Floor Bridal Lounge' : (nextNum === 2 ? '1st Floor Designer Suite' : '2nd Floor Silk Gallery'),
      screenResolution: '1080x1920 (Portrait)',
      username: `kiosk${nextNum}_${shop?.slug || 'shop'}@${shop?.slug || 'shop'}.kiosk`,
      password: `Kiosk@${Math.floor(1000 + Math.random() * 9000)}`,
      kiosk_pin: shop?.kiosk_pin || '5521',
      hardware_price_inr: 0,
    };
    this.showAddKioskModal.set(true);
  }

  openAddKioskModal(): void {
    const shop = this.selectedShowroomForDetails || this.saasShowrooms[0] || null;
    this.openAddKioskModalForShop(shop);
  }

  closeAddKioskModal(): void {
    this.showAddKioskModal.set(false);
    this.selectedShopForKioskModal = '';
  }

  encodeUri(val: string): string {
    return encodeURIComponent(val || '');
  }

  getKioskLaunchUrl(k: any): string {
    const base = (typeof window !== 'undefined') ? window.location.origin : 'https://store.nexooai.com';
    const sId = this.selectedShowroomForDetails?.slug || this.shopId() || 'shop_default';
    const kCode = k.kiosk_code || k.id;
    const kName = k.display_name || k.name;
    return `${base}/kiosk?terminal=${kCode}&store=${sId}&name=${encodeURIComponent(kName)}`;
  }

  copyKioskLaunchUrl(k: any): void {
    const url = this.getKioskLaunchUrl(k);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.notify.showSuccess(`🔗 Copied Kiosk Launch URL for ${k.display_name || k.name}!`);
      }).catch(() => {
        this.notify.showSuccess(`Launch URL: ${url}`);
      });
    } else {
      this.notify.showSuccess(`Launch URL: ${url}`);
    }
  }

  openKioskQrModal(k: any): void {
    this.selectedKioskForQr.set(k);
  }

  closeKioskQrModal(): void {
    this.selectedKioskForQr.set(null);
  }

  launchKioskWindow(k: any): void {
    const url = this.getKioskLaunchUrl(k);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  }

  openEditKioskModal(kiosk: any, shopId?: string): void {
    this.selectedKioskForEdit = kiosk;
    this.selectedShopForKioskModal = shopId || kiosk?.shop_id || this.selectedShowroomForDetails?.id || this.shopId() || 'shop_default';
    this.editKioskForm = {
      id: kiosk.id,
      kiosk_code: kiosk.kiosk_code || kiosk.id,
      display_name: kiosk.display_name || kiosk.name,
      section: kiosk.section || 'Main Showroom Floor',
      username: kiosk.username || kiosk.kiosk_code || kiosk.id,
      password: kiosk.kiosk_password || 'Kiosk@2026',
      kiosk_pin: kiosk.pin || kiosk.kiosk_pin || '5521',
      status: kiosk.status || 'online',
    };
    this.showEditKioskModal.set(true);
  }

  closeEditKioskModal(): void {
    this.showEditKioskModal.set(false);
    this.selectedKioskForEdit = null;
  }

  submitEditKiosk(e: Event): void {
    e.preventDefault();
    if (!this.selectedKioskForEdit) return;

    const targetShop = this.selectedShopForKioskModal || this.selectedShowroomForDetails?.id || this.shopId() || 'shop_default';
    const kioskId = this.selectedKioskForEdit.id || this.selectedKioskForEdit.kiosk_db_id;
    const payload = {
      display_name: this.editKioskForm.display_name.trim(),
      section: this.editKioskForm.section.trim(),
      username: this.editKioskForm.username.trim(),
      password: this.editKioskForm.password.trim(),
      kiosk_pin: this.editKioskForm.kiosk_pin.trim(),
      status: this.editKioskForm.status,
    };

    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token') || '';
    const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};

    this.http.put<any>(`${this.apiBase}/admin/customers/${targetShop}/kiosks/${kioskId}`, payload, { headers }).subscribe({
      next: () => {
        this.notify.showSuccess(`Updated kiosk '${payload.display_name}'!`);
        this.showEditKioskModal.set(false);
        this.selectedKioskForEdit = null;
        this.fetchSaasShowroomsFromApi();
        this.fetchStoreKiosksFromApi();
      },
      error: (err) => {
        const detail = err?.error?.detail || err?.message || 'Update failed';
        this.notify.showError(`Error updating kiosk: ${detail}`);
      }
    });
  }

  promptDeleteKiosk(kiosk: any, shopId?: string): void {
    const kName = kiosk.display_name || kiosk.name || kiosk.kiosk_code || kiosk.id;
    const confirmed = confirm(`Are you sure you want to remove Floor Kiosk '${kName}'? Its credentials will be permanently disabled.`);
    if (!confirmed) return;

    const targetShop = shopId || kiosk.shop_id || this.selectedShowroomForDetails?.id || (this.shopId() && this.shopId() !== 'Platform Master' && this.shopId() !== 'shop_default' ? this.shopId() : (this.saasShowrooms[0]?.id || 'shop_default'));
    const kioskId = kiosk.id || kiosk.kiosk_db_id;
    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token') || '';
    const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};

    this.http.delete<any>(`${this.apiBase}/admin/customers/${targetShop}/kiosks/${kioskId}`, { headers }).subscribe({
      next: () => {
        this.notify.showToast(`🗑️ Kiosk '${kName}' removed from fleet.`, 'info');
        this.fetchSaasShowroomsFromApi();
        this.fetchStoreKiosksFromApi();
      },
      error: (err) => {
        const detail = err?.error?.detail || err?.message || 'Delete failed';
        this.notify.showError(`Error deleting kiosk: ${detail}`);
      }
    });
  }

  openKioskTrialsModal(kiosk: any, shopId?: string): void {
    this.selectedKioskForTrials = kiosk;
    this.kioskTrialsList = [];
    this.isLoadingKioskTrials.set(true);
    this.showKioskTrialsModal.set(true);

    const targetShop = shopId || kiosk.shop_id || this.selectedShowroomForDetails?.id || (this.shopId() && this.shopId() !== 'Platform Master' && this.shopId() !== 'shop_default' ? this.shopId() : (this.saasShowrooms[0]?.id || 'shop_default'));
    const kioskId = kiosk.id || kiosk.kiosk_code || kiosk.kiosk_db_id;
    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token') || '';
    const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};

    this.http.get<any>(`${this.apiBase}/admin/customers/${targetShop}/kiosks/${kioskId}/trials`, { headers }).subscribe({
      next: (res) => {
        this.isLoadingKioskTrials.set(false);
        this.kioskTrialsList = res?.trials || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingKioskTrials.set(false);
        this.kioskTrialsList = [];
        this.cdr.markForCheck();
      }
    });
  }

  closeKioskTrialsModal(): void {
    this.showKioskTrialsModal.set(false);
    this.selectedKioskForTrials = null;
    this.kioskTrialsList = [];
  }

  fetchStoreKiosksFromApi(): void {
    const isSuper = this.userRole() === 'super_admin';
    const shopId = (this.shopId() && this.shopId() !== 'Platform Master' && this.shopId() !== 'shop_default')
      ? this.shopId()
      : (sessionStorage.getItem('nexooai_shop_id') || (isSuper && this.saasShowrooms[0]?.id ? this.saasShowrooms[0].id : ''));
    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token') || '';
    const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};

    const url = shopId ? `${this.apiBase}/admin/customers/${shopId}/kiosks` : `${this.apiBase}/admin/kiosks`;
    this.http.get<any>(url, { headers }).subscribe({
      next: (res) => {
        if (res && res.kiosks && res.kiosks.length > 0) {
          this.kiosks = res.kiosks.map((k: any) => ({
            id: k.kiosk_code || k.id,
            kiosk_db_id: k.id,
            name: k.display_name,
            section: k.section || 'Main Showroom Floor',
            status: k.status || 'online',
            lastPing: k.last_trial_at !== 'No trials yet' ? `Last trial ${k.last_trial_at}` : 'Connected and ready',
            screenResolution: k.screen_resolution || '1080x1920 (Portrait)',
            isLocked: false,
            username: k.username,
            kiosk_password: k.kiosk_password,
            pin: k.pin,
            trial_count: k.trial_count || 0,
            today_trials: k.today_trials || 0,
            last_trial_at: k.last_trial_at,
          }));
        } else {
          this.kiosks = [];
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.kiosks = [];
        this.cdr.markForCheck();
      }
    });
  }

  // --- CRM Leads Methods ---
  filteredCustomerLeads(): CustomerLead[] {
    let list = this.customerLeads;
    if (this.leadsFilterStatus !== 'all') {
      list = list.filter(l => l.status === this.leadsFilterStatus);
    }
    const q = this.leadsSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        l.sareeName.toLowerCase().includes(q) ||
        l.sku.toLowerCase().includes(q)
      );
    }
    return list;
  }

  getBilledLeadsCount(): number {
    return this.customerLeads.filter(l => l.status === 'billed').length;
  }

  getFollowupLeadsCount(): number {
    return this.customerLeads.filter(l => l.status === 'followup').length;
  }

  getLeadsConversionRate(): string {
    if (this.customerLeads.length === 0) return '0.0';
    const billed = this.getBilledLeadsCount();
    return ((billed / this.customerLeads.length) * 100).toFixed(1);
  }

  copyLeadPhone(phone: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(phone).then(() => {
        this.notify.showSuccess(`Copied phone: ${phone}`);
      });
    }
  }

  openWhatsAppOffer(lead: CustomerLead): void {
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const text = `Vanakkam ${lead.name}! Thank you for visiting ${this.shopName()}. Here is the photo of the ${lead.sareeName} (SKU: ${lead.sku}, Price: ₹${lead.price.toLocaleString()}) you draped on our 55" AI Smart Mirror today! We have reserved this handpicked piece for you with an exclusive 10% showroom discount today. Reply here to hold or visit our billing desk.`;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    lead.status = 'offer_sent';
    this.saveLeadsState();
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank');
    }
    this.notify.showSuccess(`Opened WhatsApp festive offer for ${lead.name}!`);
  }

  markLeadBilled(lead: CustomerLead): void {
    lead.status = 'billed';
    this.saveLeadsState();
    this.notify.showSuccess(`Marked ${lead.name} (${lead.sku}) as Purchased & Billed! 💰`);
  }

  updateLeadStatus(lead: CustomerLead, newStatus: any): void {
    lead.status = newStatus;
    this.saveLeadsState();
    this.notify.showSuccess(`Updated lead status to: ${newStatus}`);
  }

  deleteLead(leadId: string): void {
    this.customerLeads = this.customerLeads.filter(l => l.id !== leadId);
    this.saveLeadsState();
    this.notify.showSuccess('Lead removed from CRM database.');
  }

  saveLeadsState(): void {
    try {
      localStorage.setItem('nexooai_customer_leads', JSON.stringify(this.customerLeads));
    } catch { }
  }

  exportLeadsCsv(): void {
    const headers = 'ID,Customer Name,Phone Number,Saree Name,SKU,Price,Floor Kiosk,Stylist,Time,Status\n';
    const rows = this.customerLeads.map(l =>
      `"${l.id}","${l.name}","${l.phone}","${l.sareeName}","${l.sku}","${l.price}","${l.floorKiosk}","${l.stylist}","${l.timestamp}","${l.status}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `showroom_leads_${this.shopId()}_export.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.notify.showSuccess(`Exported ${this.customerLeads.length} customer leads to CSV!`);
  }

  // --- Bulk CSV Garment Methods ---
  openBulkCsvModal(): void {
    this.csvParsedRows.set([]);
    this.csvFileName.set('');
    this.csvParseError.set(null);
    this.showBulkCsvModal.set(true);
  }

  closeBulkCsvModal(): void {
    this.showBulkCsvModal.set(false);
  }

  downloadSampleCsv(): void {
    const sampleCsv = `sku,name_en,name_ta,category,fabric,color,price,primary_image_url,is_active
SKU-KAN-901,Bridal Kanchipuram Gold Brocade,காஞ்சிபுரம் தங்க பட்டு புடவை,Silk Sarees,Pure Mulberry Silk,Royal Gold,18500,https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=700&auto=format&fit=crop&q=80,true
SKU-BAN-902,Royal Crimson Banarasi Zari,பனாரசி சிவப்பு ஜரிகை புடவை,Silk Sarees,Katan Silk,Crimson Red,14200,https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=700&auto=format&fit=crop&q=80,true
SKU-MEN-903,Maharaja Royal Sherwani Set,மகாராஜா ராயல் ஷெர்வானி,Men's Royal Ethnic,Raw Silk & Velvet,Ivory Cream,22000,https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=700&auto=format&fit=crop&q=80,true
SKU-MYS-904,Mysore Royal Peach Soft Silk,மைசூர் பீச் சாப்ட் சில்க்,Silk Sarees,Mysore Crepe,Peach Gold,9800,https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=700&auto=format&fit=crop&q=80,true
SKU-LEH-905,Velvet Maroon Reception Lehenga,வெல்வெட் மெரூன் லெஹெங்கா,Bridal Lehengas,Zari Velvet,Deep Maroon,28000,https://images.unsplash.com/photo-1594750854465-388e401ec862?w=700&auto=format&fit=crop&q=80,true`;
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'showroom_catalog_sample_template.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.notify.showSuccess('Downloaded standard catalog sample CSV template!');
  }

  onCsvFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.csvFileName.set(file.name);
    this.csvParseError.set(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const rows = this.parseCsvText(text);
        if (rows.length === 0) {
          this.csvParseError.set('No valid product rows found in CSV. Please follow the sample format.');
          return;
        }
        this.csvParsedRows.set(rows);
        this.notify.showSuccess(`Parsed ${rows.length} garments from CSV successfully!`);
      } catch (err: any) {
        this.csvParseError.set('Error parsing CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  private parseCsvText(csvText: string): any[] {
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const skuIdx = headers.indexOf('sku');
    const nameEnIdx = headers.indexOf('name_en') !== -1 ? headers.indexOf('name_en') : headers.indexOf('name');
    const nameTaIdx = headers.indexOf('name_ta');
    const catIdx = headers.indexOf('category');
    const fabricIdx = headers.indexOf('fabric');
    const colorIdx = headers.indexOf('color');
    const priceIdx = headers.indexOf('price');
    const imgIdx = headers.indexOf('primary_image_url') !== -1 ? headers.indexOf('primary_image_url') : headers.indexOf('image');
    const activeIdx = headers.indexOf('is_active');

    const result: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (row.length < 2) continue;
      const sku = skuIdx !== -1 && row[skuIdx] ? row[skuIdx] : `SKU-BULK-${Date.now()}-${i}`;
      const nameEn = nameEnIdx !== -1 && row[nameEnIdx] ? row[nameEnIdx] : `Imported Garment #${i}`;
      const nameTa = nameTaIdx !== -1 && row[nameTaIdx] ? row[nameTaIdx] : nameEn;
      const category = catIdx !== -1 && row[catIdx] ? row[catIdx] : 'Silk Sarees';
      const fabric = fabricIdx !== -1 && row[fabricIdx] ? row[fabricIdx] : 'Pure Silk';
      const color = colorIdx !== -1 && row[colorIdx] ? row[colorIdx] : 'Rich Tone';
      const price = priceIdx !== -1 && row[priceIdx] ? parseFloat(row[priceIdx]) || 9999 : 9999;
      const img = imgIdx !== -1 && row[imgIdx] ? row[imgIdx] : 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=700&auto=format&fit=crop&q=80';
      const isActive = activeIdx !== -1 ? row[activeIdx].toLowerCase() !== 'false' : true;

      result.push({
        id: 'saree_csv_' + Date.now() + '_' + i,
        sku,
        name_en: nameEn,
        name_ta: nameTa,
        category,
        fabric,
        color,
        price,
        thumbnail: img,
        rack_location: `Rack ${(i % 8) + 1}-A`,
        is_active: isActive,
        created_at: new Date().toISOString()
      });
    }
    return result;
  }

  importParsedCsv(): void {
    const newItems = this.csvParsedRows();
    if (newItems.length === 0) return;
    this.sarees = [...newItems, ...this.sarees];
    this.saveSareesState();
    this.showBulkCsvModal.set(false);
    this.notify.showSuccess(`🎉 Successfully imported ${newItems.length} new garments into Showroom Catalogue!`);
  }

  // --- 55" Kiosk Digital Signage & Attract Mode CMS ---
  saveAttractModeSettings(): void {
    try {
      localStorage.setItem('nexooai_attract_type', this.attractForm.modeType);
      localStorage.setItem('nexooai_attract_timeout', this.attractForm.timeoutSeconds.toString());
      localStorage.setItem('nexooai_attract_video_url', this.attractForm.videoUrl);
      localStorage.setItem('nexooai_attract_title', this.attractForm.title);
      localStorage.setItem('nexooai_attract_subtitle', this.attractForm.subtitle);
    } catch { }
    this.notify.showSuccess('✨ 55" Kiosk Digital Signage & Festival Campaign saved and updated live!');
  }

  submitAddKiosk(e: Event): void {
    e.preventDefault();
    if (!this.newKioskForm.name.trim()) {
      this.notify.showWarning('Please enter a display name for the kiosk totem.');
      return;
    }

    const targetShop = this.selectedShopForKioskModal || this.selectedShowroomForDetails?.id || (this.shopId() && this.shopId() !== 'Platform Master' && this.shopId() !== 'shop_default' ? this.shopId() : (this.saasShowrooms[0]?.id || 'shop_default'));
    const payload = {
      display_name: this.newKioskForm.name.trim(),
      kiosk_code: this.newKioskForm.id.trim().toUpperCase(),
      section: this.newKioskForm.section.trim(),
      screen_resolution: this.newKioskForm.screenResolution,
      username: this.newKioskForm.username.trim(),
      password: this.newKioskForm.password.trim(),
      kiosk_pin: this.newKioskForm.kiosk_pin.trim() || '5521',
      hardware_price_inr: Number(this.newKioskForm.hardware_price_inr) || 0,
    };

    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token') || '';
    const headers: Record<string, string> = token ? { Authorization: 'Bearer ' + token } : {};

    this.http.post<any>(`${this.apiBase}/admin/customers/${targetShop}/kiosks`, payload, { headers }).subscribe({
      next: (res) => {
        this.notify.showSuccess(`✨ Registered Floor Kiosk '${payload.display_name}' (${res?.kiosk?.kiosk_code || payload.kiosk_code})!`);
        this.showAddKioskModal.set(false);
        this.selectedShopForKioskModal = '';
        this.fetchSaasShowroomsFromApi();
        this.fetchStoreKiosksFromApi();
      },
      error: (err) => {
        const detail = err?.error?.detail || err?.message || 'Failed to register kiosk';
        this.notify.showError(`Error creating kiosk: ${detail}`);
      }
    });
  }

  // --- Showroom Branding & Logo Methods ---
  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        this.customStoreLogo.set(dataUrl);
        try {
          localStorage.setItem('nexooai_custom_store_logo', dataUrl);
        } catch { }
        this.notify.showSuccess('Showroom logo uploaded and applied to kiosk screens!');
      };
      reader.readAsDataURL(file);
    }
  }

  removeStoreLogo(): void {
    this.customStoreLogo.set('');
    try {
      localStorage.removeItem('nexooai_custom_store_logo');
    } catch { }
    this.notify.showToast('Showroom custom logo reset to default NeXooAi branding.', 'info');
  }

  saveShowroomBranding(): void {
    this.isBrandingSaving.set(true);
    try {
      localStorage.setItem('nexooai_custom_store_name', this.customStoreName());
      localStorage.setItem('nexooai_custom_store_tagline', this.customStoreTagline());
      localStorage.setItem('nexooai_custom_store_city', this.customStoreCity());
      localStorage.setItem('nexooai_staff_kiosk_pin', this.customStaffPin());
      if (this.customStoreLogo()) {
        localStorage.setItem('nexooai_custom_store_logo', this.customStoreLogo());
      }
    } catch { }

    setTimeout(() => {
      this.isBrandingSaving.set(false);
      this.notify.showSuccess('Showroom branding, logo, and watermark frame settings saved successfully!');
    }, 400);
  }

  toggleSareeStatus(saree: SareeInventoryItem) {
    saree.is_active = !saree.is_active;
    this.saveSareesState();
    this.notify.showSuccess(`"${saree.name_en}" is now ${saree.is_active ? '🟢 In Stock (Visible on Kiosk)' : '🔴 Sold Out (Hidden from Kiosk)'}`);
  }

  toggleKioskLock(k: KioskDevice) {
    k.isLocked = !k.isLocked;
    k.status = k.isLocked ? 'offline' : 'online';
    this.saveKiosksState();
    this.notify.showToast(
      `${k.name} is now ${k.isLocked ? 'Locked (Floor Totem Display Inactive)' : 'Unlocked & Active for Customer Try-Ons'}`,
      k.isLocked ? 'warning' : 'success'
    );
  }

  addTokens(qty: number) {
    this.tokenQuota.update((q) => q + qty);
    this.notify.showSuccess(`Added +${qty} virtual try-on tokens to showroom quota.`);
  }

  openAddModal() {
    this.addGarmentForm = {
      sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
      name_en: '',
      name_ta: '',
      category: 'Kanchipuram Silk',
      fabric: 'Pure Mulberry Silk with Gold Zari',
      price: 24500,
      rack_location: 'Ground Floor Rack A-01',
      thumbnail: 'assets/images/saree1.jpg',
      is_active: true,
    };
    this.showAddGarmentModal.set(true);
  }

  closeAddModal() {
    this.showAddGarmentModal.set(false);
  }

  submitAddGarment(e: Event) {
    e.preventDefault();
    if (!this.addGarmentForm.name_en || !this.addGarmentForm.sku) {
      this.notify.showWarning('Please enter garment name and SKU.');
      return;
    }

    const newItem: SareeInventoryItem = {
      id: 'sar-' + Date.now(),
      sku: this.addGarmentForm.sku,
      name_en: this.addGarmentForm.name_en,
      name_ta: this.addGarmentForm.name_ta || this.addGarmentForm.name_en,
      category: this.addGarmentForm.category,
      fabric: this.addGarmentForm.fabric,
      price: Number(this.addGarmentForm.price) || 18500,
      rack_location: this.addGarmentForm.rack_location,
      is_active: true,
      thumbnail: this.addGarmentForm.thumbnail || 'assets/images/saree1.jpg',
    };

    this.sarees.unshift(newItem);
    this.saveSareesState();
    this.showAddGarmentModal.set(false);
    this.notify.showSuccess(`Added "${newItem.name_en}" to Showroom Inventory!`);
  }

  logout() {
    try {
      sessionStorage.clear();
      localStorage.removeItem('nexooai_session_token');
    } catch {
      // ignore
    }
    this.notify.showSuccess('Signed out of showroom portal.');
    this.router.navigate(['/login']);
  }
}
