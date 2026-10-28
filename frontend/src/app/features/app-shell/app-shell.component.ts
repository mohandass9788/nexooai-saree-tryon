import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';

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
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'tenant_owner' | 'store_manager' | 'staff';
  status: 'active' | 'invited';
  lastActive: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="app-shell-wrapper">
      <!-- App Shell Sidebar -->
      <aside class="app-sidebar">
        <div class="sidebar-brand">
          <div class="brand-crest">✦</div>
          <div class="brand-info">
            <span class="brand-name">NeXooAi</span>
            <span class="tenant-badge">B2B Portal</span>
          </div>
        </div>

        <!-- Store Context Pill -->
        <div class="store-pill">
          <span class="store-icon">🏬</span>
          <div class="store-meta">
            <span class="store-name">{{ shopName() }}</span>
            <span class="store-id">{{ shopId() }}</span>
          </div>
        </div>

        <nav class="sidebar-nav">
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
            [class.active]="activeNav() === 'subscription'"
            (click)="setNav('subscription')">
            <span class="nav-icon">💳</span>
            <span>Subscription & Quota</span>
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

        <div class="sidebar-footer">
          <a routerLink="/kiosk" class="btn-floor-kiosk">
            <span>🖥️</span>
            <span>Launch Floor Kiosk</span>
          </a>
          <button type="button" class="btn-logout" (click)="logout()">
            <span>⎋</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <!-- Main Portal Workspace -->
      <main class="app-main">
        <!-- Topbar -->
        <header class="app-topbar">
          <div class="topbar-left">
            <h2 class="page-title">
              {{ navTitles[activeNav()] }}
            </h2>
            <div class="status-indicator-badge">
              <span class="status-dot"></span>
              <span>Account Status: <strong>ACTIVE</strong> (Platinum Enterprise)</span>
            </div>
          </div>

          <div class="topbar-right">
            <div class="quota-pill">
              <span>Try-Ons: <strong>{{ tokensUsed() }} / {{ tokenQuota() }}</strong></span>
              <div class="mini-progress-bar">
                <div class="mini-fill" [style.width]="(tokensUsed() / tokenQuota() * 100) + '%'"></div>
              </div>
            </div>

            <div class="user-chip">
              <div class="user-avatar">{{ userInitials() }}</div>
              <div class="user-text">
                <span class="user-name">{{ userName() }}</span>
                <span class="user-role">{{ userRole() }}</span>
              </div>
            </div>
          </div>
        </header>

        <!-- Workspace Content Area -->
        <div class="app-content-body">
          <!-- 1. DASHBOARD OVERVIEW TAB -->
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
                  <div class="kpi-progress-bar">
                    <div class="kpi-fill" [style.width]="(tokensUsed() / tokenQuota() * 100) + '%'"></div>
                  </div>
                  <span class="kpi-sub">3,452 tries remaining this billing month</span>
                </div>
              </div>

              <div class="kpi-card">
                <div class="kpi-icon">📈</div>
                <div class="kpi-meta">
                  <span class="kpi-label">Walk-in Conversion Lift</span>
                  <div class="kpi-val">+38.4%</div>
                  <span class="kpi-sub text-success">↑ 4.2% increase over last 30 days</span>
                </div>
              </div>

              <div class="kpi-card">
                <div class="kpi-icon">🖥️</div>
                <div class="kpi-meta">
                  <span class="kpi-label">Floor Kiosks</span>
                  <div class="kpi-val">2 Online</div>
                  <span class="kpi-sub">Kiosk 01 (Bridal) & Kiosk 02 (Silk)</span>
                </div>
              </div>

              <div class="kpi-card">
                <div class="kpi-icon">🧾</div>
                <div class="kpi-meta">
                  <span class="kpi-label">Sales Counter Slips</span>
                  <div class="kpi-val">26 Slips</div>
                  <span class="kpi-sub">QR codes scanned at billing desk today</span>
                </div>
              </div>
            </div>

            <!-- Recent Try-On Telemetry Table -->
            <div class="portal-card mt-6">
              <div class="card-header-row">
                <div>
                  <h3 class="card-title">Recent Showroom Try-On Sessions</h3>
                  <p class="card-subtitle">Real-time telemetry from connected floor kiosks</p>
                </div>
                <a routerLink="/kiosk" class="btn-sm-primary">Open Floor Kiosk View ➔</a>
              </div>

              <div class="table-responsive">
                <table class="portal-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Kiosk Location</th>
                      <th>Selected Saree</th>
                      <th>Fabric / Category</th>
                      <th>Result Status</th>
                      <th>Sales Desk Slip</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let s of recentSessions">
                      <td>{{ s.time }}</td>
                      <td>{{ s.kiosk }}</td>
                      <td><strong>{{ s.sareeName }}</strong> ({{ s.sku }})</td>
                      <td><span class="badge-category">{{ s.category }}</span></td>
                      <td>
                        <span class="status-pill status-completed">✓ Drape Success</span>
                      </td>
                      <td>
                        <span class="token-code">{{ s.tokenCode }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- 2. SAREE CATALOGUE MANAGEMENT TAB -->
          <div *ngIf="activeNav() === 'catalogue'" class="tab-view-body">
            <div class="portal-card">
              <div class="card-header-row">
                <div>
                  <h3 class="card-title">Showroom Saree Inventory</h3>
                  <p class="card-subtitle">Products synced to floor kiosks for virtual draping</p>
                </div>
                <button type="button" class="btn-sm-gold" (click)="openAddModal()">
                  + Add New Saree to Kiosk
                </button>
              </div>

              <div class="table-responsive">
                <table class="portal-table">
                  <thead>
                    <tr>
                      <th>Thumbnail</th>
                      <th>SKU</th>
                      <th>Saree Title (English / Tamil)</th>
                      <th>Fabric</th>
                      <th>Showroom Price</th>
                      <th>Rack Location</th>
                      <th>Kiosk Display</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let saree of sarees">
                      <td>
                        <img [src]="saree.thumbnail" [alt]="saree.name_en" class="table-saree-thumb" />
                      </td>
                      <td><code>{{ saree.sku }}</code></td>
                      <td>
                        <div class="saree-name-block">
                          <span class="saree-en">{{ saree.name_en }}</span>
                          <span class="saree-ta">{{ saree.name_ta }}</span>
                        </div>
                      </td>
                      <td>{{ saree.fabric }}</td>
                      <td><strong>₹{{ saree.price.toLocaleString('en-IN') }}</strong></td>
                      <td><span class="rack-badge">{{ saree.rack_location }}</span></td>
                      <td>
                        <button
                          type="button"
                          class="toggle-switch-btn"
                          [class.on]="saree.is_active"
                          (click)="toggleSareeStatus(saree)">
                          {{ saree.is_active ? 'Active' : 'Hidden' }}
                        </button>
                      </td>
                      <td>
                        <button type="button" class="btn-table-action" (click)="notifyInfo('Edit product workflow')">
                          Edit
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- 3. FLOOR KIOSKS MANAGEMENT TAB -->
          <div *ngIf="activeNav() === 'kiosks'" class="tab-view-body">
            <div class="portal-card">
              <div class="card-header-row">
                <div>
                  <h3 class="card-title">Showroom Floor Kiosks & Hardware</h3>
                  <p class="card-subtitle">55-inch portrait touchscreen stations on your shop floor</p>
                </div>
                <a routerLink="/kiosk" class="btn-sm-primary">Launch Kiosk Fullscreen ➔</a>
              </div>

              <div class="kiosks-card-grid">
                <div *ngFor="let k of kiosks" class="kiosk-status-card" [class.locked]="k.isLocked">
                  <div class="kiosk-header">
                    <span class="kiosk-screen-icon">🖥️</span>
                    <div>
                      <h4 class="kiosk-name">{{ k.name }}</h4>
                      <span class="kiosk-id">ID: {{ k.id }}</span>
                    </div>
                    <span class="kiosk-badge-online">Online</span>
                  </div>

                  <div class="kiosk-details-list">
                    <div class="detail-row">
                      <span>Floor Section:</span>
                      <strong>{{ k.section }}</strong>
                    </div>
                    <div class="detail-row">
                      <span>Display Spec:</span>
                      <strong>{{ k.screenResolution }}</strong>
                    </div>
                    <div class="detail-row">
                      <span>Last Heartbeat:</span>
                      <strong>{{ k.lastPing }}</strong>
                    </div>
                    <div class="detail-row">
                      <span>Staff PIN Mode:</span>
                      <strong>{{ k.isLocked ? 'Locked (PIN Required)' : 'Customer Active' }}</strong>
                    </div>
                  </div>

                  <div class="kiosk-actions-row">
                    <button
                      type="button"
                      class="btn-kiosk-lock"
                      (click)="toggleKioskLock(k)">
                      {{ k.isLocked ? '🔓 Unlock Staff Screen' : '🔒 Lock Kiosk' }}
                    </button>
                    <a routerLink="/kiosk" class="btn-kiosk-view">Open Terminal</a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. SUBSCRIPTION & BILLING TAB -->
          <div *ngIf="activeNav() === 'subscription'" class="tab-view-body">
            <div class="portal-card">
              <div class="card-header-row">
                <div>
                  <h3 class="card-title">Commercial Subscription Plan</h3>
                  <p class="card-subtitle">Showroom plan entitlements, token quotas and tax invoices</p>
                </div>
                <span class="plan-badge-gold">PLATINUM ENTERPRISE</span>
              </div>

              <div class="sub-overview-grid">
                <div class="sub-info-block">
                  <span class="sub-label">Current Plan</span>
                  <div class="sub-price-row">
                    <span class="sub-price">₹49,999</span>
                    <span class="sub-period">/ month (Annual Billing)</span>
                  </div>
                  <span class="sub-next">Next renewal date: <strong>27 November 2026</strong></span>
                  <ul class="sub-benefits">
                    <li>✓ 3,500 Virtual Try-Ons included monthly</li>
                    <li>✓ Unlimited 55-inch floor kiosk stations</li>
                    <li>✓ Custom showroom branding & POS receipt integration</li>
                    <li>✓ WhatsApp sharing gateway & family polling</li>
                    <li>✓ Enterprise tenant data isolation guarantee</li>
                  </ul>
                </div>

                <div class="quota-meter-block">
                  <span class="sub-label">Monthly Try-On Usage</span>
                  <div class="meter-number">
                    <span class="meter-used">{{ tokensUsed() }}</span>
                    <span class="meter-total">/ {{ tokenQuota() }} Try-Ons</span>
                  </div>
                  <div class="large-meter-bar">
                    <div class="meter-fill" [style.width]="(tokensUsed() / tokenQuota() * 100) + '%'"></div>
                  </div>
                  <div class="topup-box">
                    <span>Need extra try-on volume for festive season?</span>
                    <button type="button" class="btn-topup" (click)="addTokens(500)">
                      + Add 500 Try-On Pack (₹2,999)
                    </button>
                  </div>
                </div>
              </div>

              <h4 class="mt-8 font-bold">Billing & Invoices History</h4>
              <table class="portal-table mt-3">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Billing Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Payment Status</th>
                    <th>Download</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>INV-2026-10-001</code></td>
                    <td>27 Oct 2026</td>
                    <td>NeXooAi Platinum Enterprise (Monthly)</td>
                    <td>₹49,999 + GST</td>
                    <td><span class="status-pill status-completed">Paid</span></td>
                    <td>
                      <button type="button" class="btn-table-action" (click)="notifySuccess('Invoice PDF downloaded.')">
                        Download PDF
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 5. TEAM & ROLES TAB -->
          <div *ngIf="activeNav() === 'team'" class="tab-view-body">
            <div class="portal-card">
              <div class="card-header-row">
                <div>
                  <h3 class="card-title">Store Staff & Team Access</h3>
                  <p class="card-subtitle">Manage showroom managers, floor staff and terminal credentials</p>
                </div>
                <button type="button" class="btn-sm-primary" (click)="notifyInfo('Member invitation sent.')">
                  + Invite Team Member
                </button>
              </div>

              <table class="portal-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Account Status</th>
                    <th>Last Active</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let m of team">
                    <td><strong>{{ m.name }}</strong></td>
                    <td>{{ m.email }}</td>
                    <td>
                      <span class="role-badge">{{ m.role }}</span>
                    </td>
                    <td>
                      <span class="status-pill status-completed">{{ m.status }}</span>
                    </td>
                    <td>{{ m.lastActive }}</td>
                    <td>
                      <button type="button" class="btn-table-action" (click)="notifyInfo('Role configuration opened')">
                        Permissions
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 6. SETTINGS TAB -->
          <div *ngIf="activeNav() === 'settings'" class="tab-view-body">
            <div class="portal-card">
              <h3 class="card-title">Showroom & Integration Settings</h3>
              <p class="card-subtitle">Configure showroom profile, POS receipt dispatch and tenant privacy</p>

              <div class="settings-form-grid mt-6">
                <div class="settings-field">
                  <label>Showroom Legal Name</label>
                  <input type="text" [value]="shopName()" class="form-input" readonly />
                </div>
                <div class="settings-field">
                  <label>Tenant ID (Permanent)</label>
                  <input type="text" [value]="shopId()" class="form-input" readonly />
                </div>
                <div class="settings-field">
                  <label>Store POS Webhook URL</label>
                  <input type="text" value="https://pos.nexooai.in/webhooks/tryon-dispatch" class="form-input" />
                </div>
                <div class="settings-field">
                  <label>WhatsApp Delivery Gateway</label>
                  <input type="text" value="Meta WhatsApp Cloud API (Verified)" class="form-input" readonly />
                </div>
              </div>

              <div class="privacy-guarantee-box mt-6">
                <span class="privacy-icon">🛡️</span>
                <div>
                  <h4>100% Tenant Data Isolation Enforced</h4>
                  <p>Customer try-on portraits, phone numbers and sales tokens are encrypted and purged after 24 hours. Your catalogue and analytics are strictly inaccessible by other showrooms.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .app-shell-wrapper {
      display: flex;
      min-height: 100vh;
      background: #09050d;
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
    }

    /* Sidebar */
    .app-sidebar {
      width: 270px;
      background: #110816;
      border-right: 1px solid rgba(212, 175, 55, 0.2);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
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

    .store-name {
      display: block;
      font-size: 0.85rem;
      font-weight: 700;
      color: #ffffff;
    }

    .store-id {
      display: block;
      font-size: 0.72rem;
      color: #d4af37;
    }

    .sidebar-nav {
      flex: 1;
      padding: 0.5rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
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

    .sidebar-footer {
      padding: 1rem 1.25rem 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .btn-floor-kiosk {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem;
      border-radius: 8px;
      background: linear-gradient(135deg, #d4af37 0%, #aa8420 100%);
      color: #120715;
      font-weight: 700;
      font-size: 0.88rem;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(212, 175, 55, 0.25);
    }

    .btn-logout {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.65rem;
      border-radius: 8px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ff85be;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }

    /* Main Workspace */
    .app-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      background: #09050d;
    }

    .app-topbar {
      padding: 1.25rem 2rem;
      background: #110816;
      border-bottom: 1px solid rgba(212, 175, 55, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
    }

    .status-indicator-badge {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.8rem;
      color: #a89fae;
      margin-top: 0.25rem;
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
      color: #d4af37;
    }

    /* Content Area */
    .app-content-body {
      padding: 2rem;
      max-width: 1300px;
      width: 100%;
      box-sizing: border-box;
    }

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

    .kpi-progress-bar {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      margin: 0.5rem 0;
      overflow: hidden;
    }

    .kpi-fill {
      height: 100%;
      background: #d4af37;
    }

    .kpi-sub {
      font-size: 0.75rem;
      color: #8c7c90;
      display: block;
    }

    .text-success {
      color: #00e676;
    }

    .portal-card {
      background: rgba(26, 11, 33, 0.6);
      border: 1px solid rgba(212, 175, 55, 0.25);
      border-radius: 16px;
      padding: 1.75rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }

    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .card-title {
      font-size: 1.25rem;
      font-weight: 800;
      margin: 0;
    }

    .card-subtitle {
      font-size: 0.85rem;
      color: #a89fae;
      margin: 0.25rem 0 0;
    }

    .btn-sm-primary {
      background: linear-gradient(135deg, #ff177d 0%, #ff8300 100%);
      color: #ffffff;
      border: none;
      padding: 0.55rem 1.2rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
    }

    .btn-sm-gold {
      background: linear-gradient(135deg, #d4af37 0%, #aa8420 100%);
      color: #120715;
      border: none;
      padding: 0.55rem 1.2rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 800;
      cursor: pointer;
    }

    /* Tables */
    .table-responsive {
      overflow-x: auto;
    }

    .portal-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.88rem;
    }

    .portal-table th {
      padding: 0.85rem 1rem;
      background: rgba(0, 0, 0, 0.25);
      color: #d4af37;
      font-weight: 700;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .portal-table td {
      padding: 0.9rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #e5dbe7;
    }

    .portal-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .table-saree-thumb {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      object-fit: cover;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .saree-name-block {
      display: flex;
      flex-direction: column;
    }

    .saree-ta {
      font-size: 0.78rem;
      color: #a89fae;
    }

    .rack-badge {
      background: rgba(255, 255, 255, 0.06);
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      font-size: 0.78rem;
    }

    .toggle-switch-btn {
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.1);
      color: #ccc;
    }

    .toggle-switch-btn.on {
      background: #00e676;
      color: #0c040f;
    }

    .btn-table-action {
      background: transparent;
      border: 1px solid rgba(212, 175, 55, 0.3);
      color: #fbeea8;
      padding: 0.35rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }

    .status-pill {
      display: inline-block;
      padding: 0.25rem 0.65rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .status-completed {
      background: rgba(0, 230, 118, 0.15);
      color: #00e676;
    }

    .token-code {
      font-family: monospace;
      font-weight: bold;
      color: #d4af37;
    }

    /* Kiosks Grid */
    .kiosks-card-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .kiosk-status-card {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 1.5rem;
    }

    .kiosk-status-card.locked {
      border-color: rgba(255, 23, 125, 0.4);
    }

    .kiosk-header {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      margin-bottom: 1.25rem;
    }

    .kiosk-screen-icon {
      font-size: 2rem;
    }

    .kiosk-name {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0;
    }

    .kiosk-id {
      font-size: 0.75rem;
      color: #8c7c90;
    }

    .kiosk-badge-online {
      margin-left: auto;
      background: rgba(0, 230, 118, 0.15);
      color: #00e676;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 12px;
    }

    .kiosk-details-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      font-size: 0.85rem;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      color: #b5a4b7;
    }

    .detail-row strong {
      color: #ffffff;
    }

    .kiosk-actions-row {
      display: flex;
      gap: 0.75rem;
    }

    .btn-kiosk-lock {
      flex: 1;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      padding: 0.6rem;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-kiosk-view {
      flex: 1;
      background: #7c4dff;
      color: #ffffff;
      padding: 0.6rem;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 700;
      text-align: center;
      text-decoration: none;
    }

    /* Subscription grid */
    .sub-overview-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 2rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .sub-label {
      font-size: 0.78rem;
      color: #a89fae;
      text-transform: uppercase;
      font-weight: 700;
    }

    .sub-price-row {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      margin: 0.25rem 0 0.5rem;
    }

    .sub-price {
      font-size: 2.2rem;
      font-weight: 800;
      color: #d4af37;
    }

    .sub-period {
      font-size: 0.9rem;
      color: #8c7c90;
    }

    .sub-next {
      font-size: 0.85rem;
      color: #e5dbe7;
      display: block;
      margin-bottom: 1rem;
    }

    .sub-benefits {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 0.85rem;
      color: #b5a4b7;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .quota-meter-block {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 10px;
      padding: 1.25rem;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .meter-number {
      margin: 0.5rem 0;
    }

    .meter-used {
      font-size: 2rem;
      font-weight: 800;
      color: #ffffff;
    }

    .meter-total {
      font-size: 1rem;
      color: #8c7c90;
      margin-left: 0.35rem;
    }

    .large-meter-bar {
      width: 100%;
      height: 10px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 5px;
      overflow: hidden;
      margin-bottom: 1rem;
    }

    .meter-fill {
      height: 100%;
      background: #d4af37;
    }

    .topup-box {
      font-size: 0.82rem;
      color: #b5a4b7;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .btn-topup {
      background: linear-gradient(135deg, #d4af37 0%, #aa8420 100%);
      color: #120715;
      border: none;
      padding: 0.65rem;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
    }

    .plan-badge-gold {
      background: #d4af37;
      color: #120715;
      font-weight: 800;
      font-size: 0.75rem;
      padding: 0.35rem 0.85rem;
      border-radius: 20px;
    }

    .role-badge {
      background: rgba(124, 77, 255, 0.2);
      color: #b388ff;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    /* Settings form */
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
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.3);
      color: #ffffff;
      font-size: 0.9rem;
      box-sizing: border-box;
    }

    .privacy-guarantee-box {
      background: rgba(0, 230, 118, 0.08);
      border: 1px solid rgba(0, 230, 118, 0.25);
      border-radius: 10px;
      padding: 1.25rem;
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }

    .privacy-icon {
      font-size: 1.8rem;
    }

    .privacy-guarantee-box h4 {
      font-size: 0.95rem;
      color: #00e676;
      margin: 0 0 0.25rem;
    }

    .privacy-guarantee-box p {
      font-size: 0.82rem;
      color: #b5a4b7;
      margin: 0;
      line-height: 1.4;
    }

    .mt-6 { margin-top: 1.5rem; }
    .mt-8 { margin-top: 2rem; }
    .mt-3 { margin-top: 0.75rem; }
  `],
})
export class AppShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  activeNav = signal<'dashboard' | 'catalogue' | 'kiosks' | 'subscription' | 'team' | 'settings'>('dashboard');
  shopName = signal<string>('NeXooAi Luxury Silks');
  shopId = signal<string>('shop_default');
  userName = signal<string>('Showroom Store Manager');
  userRole = signal<string>('store_manager');
  userInitials = signal<string>('SM');

  tokensUsed = signal<number>(48);
  tokenQuota = signal<number>(3500);

  navTitles: Record<string, string> = {
    dashboard: 'Showroom Command Center',
    catalogue: 'Garment & Saree Inventory',
    kiosks: 'Floor Kiosks & Hardware Status',
    subscription: 'Commercial Subscription & Usage',
    team: 'Showroom Staff & Access Control',
    settings: 'Showroom Store Configuration',
  };

  sarees: SareeInventoryItem[] = [
    {
      id: 'sar-001',
      sku: 'KAN-GOLD-01',
      name_en: 'Bridal Kanchipuram Gold Brocade',
      name_ta: 'முகூர்த்த காஞ்சிபுரம் தங்க ஜரிகை பட்டு',
      category: 'Bridal Silk',
      fabric: 'Pure Mulberry Silk',
      price: 38500,
      rack_location: 'Rack A-04',
      is_active: true,
      thumbnail: 'assets/images/col_kanchipuram.png',
    },
    {
      id: 'sar-002',
      sku: 'BAN-RED-02',
      name_en: 'Royal Banarasi Crimson Kadwa',
      name_ta: 'ராஜ பனாரசி சிவப்பு கட்வா பட்டு',
      category: 'Banarasi Silk',
      fabric: 'Katan Silk',
      price: 29000,
      rack_location: 'Rack B-01',
      is_active: true,
      thumbnail: 'assets/images/col_banarasi.png',
    },
    {
      id: 'sar-003',
      sku: 'MYS-CREAM-03',
      name_en: 'Mysore Silk Temple Border',
      name_ta: 'மைசூர் சில்க் கோவில் பார்டர் புடவை',
      category: 'Mysore Silk',
      fabric: 'Crepe Silk',
      price: 18200,
      rack_location: 'Rack C-02',
      is_active: true,
      thumbnail: 'assets/images/col_bridal.png',
    },
    {
      id: 'sar-004',
      sku: 'DES-PURPLE-04',
      name_en: 'Designer Violet Zari Tissue',
      name_ta: 'டிசைனர் வயலட் ஜரிகை டிஷ்யூ பட்டு',
      category: 'Designer Collection',
      fabric: 'Organza Silk',
      price: 24500,
      rack_location: 'Rack D-07',
      is_active: true,
      thumbnail: 'assets/images/col_designer.png',
    },
  ];

  kiosks: KioskDevice[] = [
    {
      id: 'KIOSK-TN-CHN-01',
      name: 'Ground Floor Bridal Kiosk',
      section: 'Bridal & Kanchipuram Zone',
      status: 'online',
      lastPing: 'Just now (12s ago)',
      screenResolution: '1080x1920 Portrait (55")',
      isLocked: false,
    },
    {
      id: 'KIOSK-TN-CHN-02',
      name: 'First Floor Designer Counter',
      section: 'Party Wear & Silk Section',
      status: 'online',
      lastPing: '2 mins ago',
      screenResolution: '1080x1920 Portrait (55")',
      isLocked: false,
    },
  ];

  recentSessions = [
    { time: '12:45 PM', kiosk: 'Ground Floor Bridal', sareeName: 'Bridal Kanchipuram Gold', sku: 'KAN-GOLD-01', category: 'Bridal Silk', tokenCode: '#TK-4821' },
    { time: '12:38 PM', kiosk: 'First Floor Designer', sareeName: 'Royal Banarasi Crimson', sku: 'BAN-RED-02', category: 'Banarasi', tokenCode: '#TK-4820' },
    { time: '12:20 PM', kiosk: 'Ground Floor Bridal', sareeName: 'Designer Violet Zari Tissue', sku: 'DES-PURPLE-04', category: 'Designer', tokenCode: '#TK-4819' },
    { time: '11:54 AM', kiosk: 'Ground Floor Bridal', sareeName: 'Mysore Silk Temple Border', sku: 'MYS-CREAM-03', category: 'Mysore Silk', tokenCode: '#TK-4818' },
  ];

  team: TeamMember[] = [
    { id: 'u-1', name: 'Store General Manager', email: 'admin@nexooai.com', role: 'store_manager', status: 'active', lastActive: 'Active Now' },
    { id: 'u-2', name: 'Suresh Kumar (Sales Desk)', email: 'suresh@nexooai.in', role: 'staff', status: 'active', lastActive: '10m ago' },
    { id: 'u-3', name: 'Priya Raman (Bridal Floor)', email: 'priya@nexooai.in', role: 'staff', status: 'active', lastActive: '25m ago' },
  ];

  ngOnInit() {
    try {
      const storedName = sessionStorage.getItem('nexooai_user_name');
      const storedRole = sessionStorage.getItem('nexooai_user_role');
      const storedShop = sessionStorage.getItem('nexooai_shop_id');
      if (storedName) {
        this.userName.set(storedName);
        const parts = storedName.split(' ');
        this.userInitials.set(parts.map((p) => p[0]).join('').substring(0, 2).toUpperCase());
      }
      if (storedRole) this.userRole.set(storedRole);
      if (storedShop) this.shopId.set(storedShop);
    } catch {
      // ignore
    }
  }

  setNav(tab: 'dashboard' | 'catalogue' | 'kiosks' | 'subscription' | 'team' | 'settings') {
    this.activeNav.set(tab);
  }

  toggleSareeStatus(saree: SareeInventoryItem) {
    saree.is_active = !saree.is_active;
    this.notify.showSuccess(`${saree.name_en} status updated to: ${saree.is_active ? 'Active' : 'Hidden'}`);
  }

  toggleKioskLock(k: KioskDevice) {
    k.isLocked = !k.isLocked;
    this.notify.showToast(
      `${k.name} is now ${k.isLocked ? 'Locked (Staff PIN required)' : 'Unlocked for Customer Try-Ons'}`,
      'info'
    );
  }

  addTokens(qty: number) {
    this.tokenQuota.update((q) => q + qty);
    this.notify.showSuccess(`Added +${qty} virtual try-on tokens to showroom quota.`);
  }

  openAddModal() {
    this.notify.showToast('Select saree photograph or CSV catalogue to import.', 'info');
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

  notifySuccess(msg: string) {
    this.notify.showSuccess(msg);
  }

  notifyInfo(msg: string) {
    this.notify.showToast(msg, 'info');
  }
}
