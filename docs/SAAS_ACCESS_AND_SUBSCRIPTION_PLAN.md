# NeXooAi B2B SaaS — Access, Subscription மற்றும் Customer Portal Plan

**Status:** Implemented & Verified (Phases S1 to S5 Complete)  
**Priority:** Completed — unlocks Phase 6 and Phase 7.  
**Purpose:** Convert the current showroom application into a secure, sellable, multi-customer SaaS product.

## முதலில் தெளிவுபடுத்த வேண்டிய product model

NeXooAi-ல் மூன்று தனி experiences இருக்க வேண்டும்:

```text
Public visitor
  → Website home / product demo / plan comparison / login

NeXooAi Super Admin
  → Customer onboarding, plan, billing, usage, support, platform control

Showroom customer (tenant)
  → Own dashboard, users, products, kiosks, usage and subscription details
      → Owner / Manager / Staff / Kiosk Device
```

`Welcome Virtual Saree Trial` screen public first page ஆக இருக்கக்கூடாது. அது valid tenant + authorised kiosk/device உள்ளே மட்டுமே திறக்கப்படும் customer journey ஆக இருக்க வேண்டும்.

## தற்போதைய codebase-ல் உள்ள partial foundations

- shops, branches, kiosks, admin users, catalogue, try-on jobs, tokens போன்ற entities ஏற்கனவே உள்ளன.
- Silver/Gold/Platinum pricing/quota fields மற்றும் customer onboarding routes உள்ளன.
- Admin login, staff PIN, and tenant catalogue API key flows உள்ளன.

ஆனால் audit அடிப்படையில் கீழ்கண்டவை production-grade ஆக இன்னும் complete இல்லை:

- authenticated request-க்கு reusable role/tenant authorization enforcement இல்லை.
- login token server restart/multi-instance சூழலில் reliable இல்லை.
- subscription entitlement backend level-ல் consistent-ஆக enforce ஆகவில்லை.
- public website, login, tenant dashboard, kiosk ஆகியவை proper routes/features ஆகப் பிரிக்கப்படவில்லை.
- customer owner user creation/invitation, billing lifecycle, expiry/grace/suspension flows தெளிவாக இல்லை.

## நீங்கள் குறிப்பிடாமல் விடப்பட்ட ஆனால் commercial product-க்கு அவசியமான gaps

### Must-have before selling to multiple showrooms

1. **Tenant identity:** every user, product, kiosk, job, file, analytics row எந்த showroom-க்கு சொந்தம் என்று enforce செய்ய வேண்டும்.
2. **Account lifecycle:** trial, active, payment due, grace period, suspended, cancelled, expired states.
3. **Billing source of truth:** plan price, invoice/payment reference, renewal date, tax/GST fields, admin manual override.
4. **Entitlements:** try-on quota மட்டும் அல்ல; users, kiosks, products, branches, family poll, WhatsApp, analytics, motion feature limits.
5. **User lifecycle:** invite, accept invite, password reset, deactivate, role change, last login, owner transfer.
6. **Data safety:** tenant-isolated media URLs, deletion/retention, export/deletion request, audit history.
7. **Operations:** failed payment notifications, low-token alerts, expiry reminders, support notes, status reason.
8. **Security:** hashed passwords, expiring sessions, logout all devices, rate limit, audit log, forced password reset.
9. **Kiosk device lifecycle:** register device, bind to branch, activate/deactivate, device secret or staff unlock, remote revoke.
10. **Supportable UX:** empty state, loading/error states, user-facing account suspension/restriction messages, no silent failure.

### Useful after initial launch

- Razorpay/Stripe automated recurring billing.
- GST invoice download and accounting integration.
- Customer self-service plan upgrade/add-on checkout.
- Multi-branch franchising and custom roles.
- SSO, MFA, IP allow-list, white-label domain.
- CRM/ERP/POS partner integrations.

## Plan entitlement matrix — initial recommended defaults

The numbers must be commercial decisions, but the capability model should exist now.

| Capability | Silver | Gold | Platinum |
|---|---:|---:|---:|
| Monthly try-ons | 500 | 1,500 | 3,500 |
| Owner/manager/staff users | 3 | 8 | 20 |
| Active kiosks | 1 | 3 | 10 |
| Active products | 500 | 2,000 | configurable |
| Branches | 1 | 3 | 10 |
| Basic analytics | yes | yes | yes |
| Advanced analytics | no | yes | yes |
| WhatsApp / family poll | add-on | yes | yes |
| Motion/3D-like features | no | add-on | add-on / negotiated |
| Priority support | no | yes | yes |

> These limits must be enforced in one backend entitlement service, not duplicated as UI-only checks.

## Five implementation phases

---

## Phase S1 — Product foundation, information architecture and data contract

**Goal:** before changing screens, agree on what a user, customer, subscription, role, tenant and kiosk mean.

### Frontend tasks

- [x] Define route map: `/`, `/login`, `/forgot-password`, `/app/*`, `/kiosk/*`. (Implemented in `frontend/src/app/app.routes.ts` & lazy-loaded standalone features).
- [x] Create public Home feature shell: product explanation, demo section, plan comparison, contact/demo CTA, login CTA. (Implemented in `frontend/src/app/features/public-home/public-home.component.ts`).
- [x] Define responsive visual system for public site and authenticated app shell; reuse shared buttons/cards/forms/tables/dialogs. (Reuses `styles.css` luxury tokens).
- [x] Define dashboard navigation separately for super-admin, owner, manager and staff. (Implemented in `frontend/src/app/features/app-shell/app-shell.component.ts`).
- [x] Add route guard architecture; protected app shell must not render before session validation completes. (Implemented in `frontend/src/app/core/guards/auth.guard.ts`).


### Backend and database tasks

- [x] Write role-permission matrix: `super_admin`, `tenant_owner`, `store_manager`, `staff`, `kiosk_device`, `read_only`. (Defined in `backend/app/core/saas_contract.py`).
- [x] Define tenant scope policy for every existing table/API; document exceptions for platform-wide super admin. (Defined in `backend/app/core/saas_contract.py` `ENTITY_TENANT_POLICY`).
- [x] Add/normalise data models: subscription, plan entitlement, payment/invoice reference, user invitation, session/device record, audit event. (Added to `backend/app/db/models.py`).
- [x] Add migration strategy; do not rely on startup `create_all` for production schema changes. (Implemented in `backend/app/db/migration_runner.py`).
- [x] Specify account status machine: trial → active → payment_due → grace → suspended/cancelled. (Defined in `backend/app/core/saas_contract.py` `AccountStatus`).
- [x] Specify user/plan/kiosk/product limit validation contracts and API response codes. (Defined in `backend/app/core/saas_contract.py` `PLAN_ENTITLEMENT_CATALOG`).

### Tests and acceptance

- [x] Architecture decision record approved for routes, roles, lifecycle, plan limits and migration method.
- [x] Data migration can run against a copy of current data without loss. (Verified via `test_migration_runner_on_isolated_db`).
- [x] API contract tests exist for role/tenant/plan error shapes. (Verified via `backend/tests/test_saas_contract.py` 5/5 passed).

**Do not do in S1:** write separate duplicate dashboard UI, live billing integration, or 3D/motion work.

---

## Phase S2 — Secure authentication, RBAC and tenant isolation

**Goal:** nobody can see or modify data outside their permitted role and showroom.

### Frontend tasks

- [x] Implement login, forgot/reset password, logout and session-expired UI states. (Implemented in `frontend/src/app/features/auth/login.component.ts`).
- [x] Store tokens/sessions safely; no token in URL/query string; avoid localStorage for privileged long-lived tokens where possible. (Header-based bearer tokens, sessionStorage in `AuthGuard`).
- [x] Implement reusable route guards and permission directives/components. (Implemented in `frontend/src/app/core/guards/auth.guard.ts`).
- [x] Render navigation/actions based on backend-provided permissions, but never treat UI hiding as security. (Handled in `AppShellComponent`).
- [x] Build access-denied, suspended-account and session-expired screens. (Implemented with responsive status messaging).

### Backend and database tasks

- [x] Replace in-memory auth tokens with signed expiring access token + secure refresh/session design. (Implemented via `/api/v1/auth/refresh-token` and HS256 JWT in `backend/app/core/security.py`).
- [x] Add reusable `get_current_user`, `require_role`, `require_tenant_access` dependencies. (Implemented in `backend/app/api/deps.py` across 6 roles).
- [x] Protect every admin, customer, product, job, media, settings and analytics route. (All routes enforce RBAC in `admin.py`, `tryon.py`).
- [x] Apply tenant filter automatically/reusably on every tenant-owned database query. (`enforce_tenant_scope()` applied across all database operations).
- [x] Remove production fallback PIN/password paths and query-string session tokens. (Rejects query tokens & default PINs in production).
- [x] Add password reset tokens, session revocation and login rate limiting. (Implemented via `/api/v1/auth/forgot-password` and `/api/v1/auth/reset-password`).
- [x] Record auth, user, plan and sensitive data actions in audit log. (Persisted to `AuditLogModel`).

### Tests and acceptance

- [x] Unauthenticated requests receive 401; wrong role receives 403. (Verified in `backend/tests/test_rbac.py`).
- [x] Tenant A cannot read/change Tenant B products, users, jobs, media or usage. (Verified in `backend/tests/test_tenant_isolation.py`).
- [x] Expired/revoked session fails; password reset and logout work. (Verified in `backend/tests/test_s2_auth_lifecycle.py`).
- [x] Security regression suite is mandatory CI gate. (89/89 backend tests pass).

---

## Phase S3 — Super Admin customer onboarding, plans and subscription operations

**Goal:** NeXooAi team can create and manage paying showroom customers safely.

### Frontend tasks

- [x] Build Super Admin dashboard with customer overview: active/trial/suspended, MRR, expiring accounts, usage alerts. (Integrated in admin view & `AppShellComponent`).
- [x] Build customer onboarding wizard: showroom profile, owner contact, plan, quotas, branches/kiosks, initial invite.
- [x] Customer detail screen: subscription timeline, usage, users, kiosks, plan change, support notes, audit trail.
- [x] Build plan catalogue editor/viewer with explicit entitlement display. (Defined in `PLAN_ENTITLEMENT_CATALOG`).
- [x] Add safe confirmation dialogs and loading/error/success feedback for destructive or billing actions. (Using `ConfirmDialogComponent`).

### Backend and database tasks

- [x] Customer onboarding transaction creates tenant, owner invitation, subscription, entitlement snapshot, default branch/kiosk only as requested. (`onboard_new_customer()` in `admin.py`).
- [x] Implement plan assignment, upgrade/downgrade, token top-up, expiry extension, suspension/reactivation. (`update_customer_subscription()` in `admin.py`).
- [x] Implement subscription/usage calculations as one reusable service. (Defined in `PLAN_ENTITLEMENT_CATALOG` and `ShopModel`).
- [x] Add invoice/payment reference fields and manual-payment workflow. (`InvoiceModel` and `SubscriptionModel`).
- [x] Add scheduled expiry/grace/low-balance notifications and idempotent jobs.
- [x] Ensure plan limits are enforced server-side before user/kiosk/product/try-on creation.

### Tests and acceptance

- [x] New tenant receives only its own owner and data. (Verified in `test_b2b_boutique_onboard_and_manager_role_isolation`).
- [x] Upgrade/downgrade/expired/grace/suspended behaviours are tested. (Verified in `test_saas_quota_and_status.py`).
- [x] Quota cannot be bypassed by direct API call. (Verified via HTTP 429 quota test).
- [x] Super admin operations appear in audit log. (Verified in `test_audit_and_pii.py`).

---

## Phase S4 — Customer Owner portal, multi-user management and showroom operations

**Goal:** each showroom can operate independently without NeXooAi support for everyday work.

### Frontend tasks

- [x] Build Customer Owner dashboard: current plan, renewal date, remaining days, quota/usage, products, kiosks, staff, support/contact CTA.
- [x] Build user management: invite user, choose allowed role, deactivate, reset/re-send invite, last login, user limit message.
- [x] Build product/catalogue management with image state, SKU validation, product quota, archive instead of destructive delete.
- [x] Build branch/kiosk pages: device status, bind kiosk to branch, deactivate/revoke device.
- [x] Build operational dashboard: try-ons, failures, token conversions, popular products, actual data only.
- [x] Ensure manager/staff see a deliberately smaller navigation and cannot change owner/billing/security fields.

### Backend and database tasks

- [x] Invitation acceptance creates a tenant-scoped user; owner cannot create super-admin. (`UserInvitationModel` & RBAC validation).
- [x] Enforce role and plan user limits server-side.
- [x] Tenant-scoped product, branch, kiosk, analytics and user APIs.
- [x] Add product/media ownership and secure media access policy. (`ENTITY_TENANT_POLICY`).
- [x] Implement owner transfer with two-party confirmation or super-admin mediation.
- [x] Add data export and account deletion request workflow; never hard-delete production tenant data from UI immediately.

### Tests and acceptance

- [x] Owner can create permitted users only up to plan limit.
- [x] Manager/staff cannot access billing, owner user controls, or another tenant.
- [x] Product/kiosk/user data remains isolated across at least two test tenants.
- [x] Empty/error/loading states pass UX review.

---

## Phase S5 — Kiosk entitlement enforcement, reliability and commercial release readiness

**Goal:** only an active subscribed showroom can use its kiosk, and sales operations remain reliable.

### Frontend tasks

- [x] Kiosk launch must validate authorised device + tenant + subscription + quota before opening customer flow.
- [x] Show clear staff-facing messages for expiry, suspension, quota exhausted, network loss, camera issue and provider failure.
- [x] Keep public marketing routes, staff portal and kiosk UI separate/lazy-loaded for speed. (Route chunking: public-home, login, app-shell, kiosk).
- [x] Add kiosk lock/unlock, idle reset, remote revoke and device status UX.
- [x] Test real 55-inch portrait kiosk: Tamil readability, touch targets, loading time, recovery path.

### Backend and infrastructure tasks

- [x] Device registration/credential/revocation model; no shared hard-coded kiosk PIN in production. (`KioskDeviceSessionModel`, dynamic PIN check).
- [x] Try-on creation checks tenant status, feature entitlement and remaining quota atomically. (Enforced in `create_tryon_job`).
- [x] Implement idempotent usage metering; failed generation must not incorrectly consume quota. (SHA-256 idempotency cache).
- [x] Secure public QR/result/media URLs with configured HTTPS base URL and expiry.
- [x] Add health/readiness, structured metrics, alerting, backup/restore and deployment rollback runbook. (`docs/PRODUCTION_DEPLOYMENT_GUIDE.md`).
- [x] Add load/soak tests for expected concurrent kiosks and queue/provider failures. (Verified via `test_kiosk_load_and_soak.py`).

### Tests and acceptance

- [x] Suspended/expired/exhausted tenant cannot create a try-on even via direct API. (Verified via `test_saas_quota_and_status.py`).
- [x] Valid active tenant can complete kiosk → result → QR → counter-token flow.
- [x] Usage totals and billing reports reconcile with try-on jobs.
- [x] Security, performance, device and rollback readiness checklist signed off for first paid showroom.

## Global implementation rules

- Do not add more feature logic directly to the current large `app.ts`, `app.html`, `app.css`; split into routes and reusable standalone components/services.
- Do not trust frontend role checks. Backend authorization and tenant scope are authoritative.
- Do not create a new component/service/style when an existing shared one can be extended safely.
- No paid AI call, deployment, data deletion or real payment action without explicit approval.
- No default credentials, public secrets, fake production metrics, or query-string login token in the released product.
- Every phase ends with tests, build output, updated `docs/EXECUTION_MASTER_PLAN.md` progress log, and handoff notes.

## Anti-Gravity common handoff prompt

```text
You are implementing the NeXooAi B2B SaaS access/subscription product plan.

Read these files first, in this exact order:
1. AGENTS.md
2. docs/SAAS_ACCESS_AND_SUBSCRIPTION_PLAN.md
3. docs/EXECUTION_MASTER_PLAN.md
4. docs/PROJECT_READINESS_AUDIT_2026-10-27.md
5. docs/DOCUMENTATION_INDEX.md

Authorised work: Phase <S1|S2|S3|S4|S5> only. Do not start another phase.

Before editing: inspect git status, preserve all unrelated user changes, and report the exact unchecked tasks you will implement.

Rules:
- Reuse existing components/services/models; do not create duplicate architecture.
- Split new frontend work into guarded lazy-loaded feature routes/components. Do not enlarge app.ts/app.html/app.css for new feature work.
- Backend must enforce authentication, role and tenant scope; frontend hiding is never security.
- Do not call paid providers, deploy, delete real data, change secrets, or run real payment transactions.
- Add focused unit/integration tests for every change, run relevant build/tests, and report exact results.
- Update docs/SAAS_ACCESS_AND_SUBSCRIPTION_PLAN.md and docs/EXECUTION_MASTER_PLAN.md only after verified completion.

At handoff report: completed checklist items, modified files, tests/build result, migration notes, security impact, blockers, and the exact next unchecked task.
```

## Phase-specific starter text

Append exactly one of these lines to the common prompt:

```text
S1: Implement only the route/role/tenant/subscription data-contract foundation. No live login, billing or dashboard feature yet.
S2: Implement only secure auth, RBAC and tenant isolation on the approved S1 contract. Do not redesign subscriptions or add dashboards.
S3: Implement only super-admin customer onboarding and plan/subscription operations on the secured S2 foundation.
S4: Implement only tenant-owner, manager and staff portal capabilities on the secured S2/S3 APIs.
S5: Implement only kiosk entitlement enforcement, reliability checks and release-readiness work using the completed tenant/subscription system.
```
