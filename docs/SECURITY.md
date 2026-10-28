# Security Policy, Threat Model & Role-Permission Matrix — NeXooAi

**Last Updated:** 27 October 2026, IST  
**Canonical Security Specification for Phase 1 and Beyond**

---

## 1. Trust Boundaries & Architecture Overview

NeXooAi operates across five distinct security zones:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Public Untrusted Zone                                                    │
│    - Customer smartphones (Mobile QR downloads, Family Poll voting)         │
│    - POS / WhatsApp incoming webhooks (external network)                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / WSS
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 2. Showroom Floor Zone (Kiosk Hardware)                                     │
│    - Physical 55-inch portrait kiosk totem                                  │
│    - Touchscreen, wide-angle camera, local browser instance                 │
│    - Staff Kiosk Gate (4-digit staff PIN protects device from walk-up abuse)│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS REST / API Headers
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 3. Store Staff & Management Zone                                            │
│    - Showroom floor sales staff (Customer Lookbook, Rack lookup, Tokens)    │
│    - Store & Branch Managers (Catalogue management, staff accounts, stats)  │
│    - Tenant Boutique Owners (Billing, subscriptions, feeds, branding)       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ RBAC Headers + Tenant Scoping
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 4. Platform Super-Admin & Core Services Zone                                │
│    - Platform Operators (mohandass@nexooai.in, system operators)            │
│    - AI Provider Factory & Credential Vault (FAL, FASHN, Kolors, Gemini)    │
│    - SQLite / PostgreSQL DB with strict shop_id multi-tenant isolation      │
│    - Private media storage & 24h retention worker                           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Outbound Encrypted APIs
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 5. External Third-Party Providers                                           │
│    - Cloud AI Providers (FAL / FASHN / Kolors / OpenAI / Gemini)            │
│    - Meta WhatsApp Cloud API                                                │
│    - POS / ERP inventory webhooks                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Actors & Role Hierarchy

| Role Code | Role Name | Primary Interface | Authentication Method | Session Lifetime |
|---|---|---|---|---|
| `super_admin` | Platform Super Admin | Admin Portal (`mohandass@nexooai.in`) | Email + Password + MFA (planned) | 8 hours (revocable) |
| `shop_owner` | Boutique Owner / Tenant Admin | Admin Portal | Email + Strong Password | 8 hours (revocable) |
| `store_manager` | Showroom / Branch Manager | Kiosk Admin Tab / Desktop | Email + Password or 6-digit Admin PIN | 8 hours (password) / 15 mins (PIN) |
| `store_staff` | Showroom Floor Associate | Kiosk Admin Tab / Mobile Companion | 4-digit Staff PIN (`5521`) | 24 hours (kiosk gate) / 15 mins |
| `kiosk_device` | Showroom Kiosk Device Totem | Physical Kiosk Screen | Showroom Staff Gate PIN | 24 hours daily totem session |
| `customer` | Showroom Shopper / Mobile User | Kiosk Screen / Customer Mobile | Anonymous session / Download Token | 30 mins (QR) / 90s idle reset |

---

## 3. STRIDE Threat Model

### 3.1 Spoofing Identity
* **Threat S1 (Kiosk Admin PIN Guessing)**: A showroom customer taps the hidden admin portal button and brute-forces the 6-digit staff PIN.
  * **Mitigation**: Exponential backoff rate-limiting (maximum 5 failed attempts per 10 minutes per IP/kiosk); auto-lock after 60 seconds of inactivity; remove default/master PIN fallbacks (`849201`) in production mode; require email/password for elevated settings.
* **Threat S2 (Token Forgery)**: An attacker crafts synthetic session tokens to bypass authorization.
  * **Mitigation**: Transition from raw hex tokens to cryptographically signed, server-verifiable JWTs signed with `SECRET_KEY` (HS256) containing `sub` (user_id), `role`, `shop_id`, and `exp` claims.
* **Threat S3 (Kiosk Device Impersonation)**: An attacker attempts to submit fake try-on requests from outside the showroom.
  * **Mitigation**: Showroom staff gate PIN activation required every morning; validate `kiosk_id` against active registered `KioskModel` records.

### 3.2 Tampering with Data
* **Threat T1 (Cross-Tenant Catalogue Modification)**: A malicious boutique manager modifies or deletes products belonging to another tenant shop.
  * **Mitigation**: Strict `shop_id` filter enforced in all database queries and writes; API dependencies resolve and verify tenant boundaries before executing SQL updates.
* **Threat T2 (Price / SKU Manipulation)**: A user submits altered product prices in try-on or counter token payloads.
  * **Mitigation**: Product prices, SKUs, and rack locations are strictly fetched server-side from `ProductModel` using verified `product_id`; client payloads are treated as unverified hints.
* **Threat T3 (Webhook Payload Tampering)**: An external attacker sends fake payment or inventory sync payloads.
  * **Mitigation**: Require HMAC-SHA256 signature verification (`X-NeXooAi-Signature`) on all external POS and catalog ingestion webhooks.

### 3.3 Repudiation
* **Threat R1 (Unattributable Data Deletion)**: A staff user purges customer photos, deletes catalogues, or resets AI keys without accountability.
  * **Mitigation**: Every mutating admin action writes a persistent record to `AuditLogModel` capturing `admin_user_id`, `shop_id`, `action`, `entity_type`, `entity_id`, client IP, and UTC timestamp.

### 3.4 Information Disclosure
* **Threat I1 (Customer Photo Privacy Breach)**: Customer portrait or virtual drape photos become publicly discoverable or indexed by search engines.
  * **Mitigation**: Media storage directory is not directory-listed; files are named with high-entropy UUIDs; QR download URLs use single-use or short-lived (30 min) hashed tokens (`DownloadTokenModel`); automated retention cleanup purges files after 24 hours.
* **Threat I2 (AI Provider Key Leakage)**: Third-party API keys (FAL, Gemini, OpenAI) exposed in frontend bundles or API responses.
  * **Mitigation**: Keys are loaded exclusively via server-side environment variables; backend endpoints always return masked strings (e.g., `••••••••3821`); no credentials ever sent to client browsers.
* **Threat I3 (Token Leak via URL Query Parameters)**: Tokens passed in URL queries (`/api/v1/auth/verify-token?token=...`) are logged in reverse proxy access logs, browser history, and referer headers.
  * **Mitigation**: Deprecate query-string tokens; require `Authorization: Bearer <token>` HTTP header for all authenticated endpoints.

### 3.5 Denial of Service (DoS)
* **Threat D1 (AI Cloud Quota Exhaustion)**: An attacker spams the try-on endpoint, exhausting showroom token quotas or incurring high cloud GPU costs.
  * **Mitigation**: Enforce monthly token quotas (`monthly_token_quota` vs `tokens_used_this_month`) per tenant shop; enforce rate limiting (maximum 1 try-on per kiosk per 30 seconds); restrict customer upload file sizes to 10 MB and validate image MIME types via magic bytes.
* **Threat D2 (Kiosk Screen Lockup)**: Abandoned customer sessions block subsequent showroom customers.
  * **Mitigation**: 90-second inactivity watchdog automatically clears session memory, revokes customer blobs, and resets UI to the Welcome screen.

### 3.6 Elevation of Privilege
* **Threat E1 (Store Manager Accessing Super-Admin Settings)**: A store manager accesses `/api/v1/admin/settings` or SaaS billing controls.
  * **Mitigation**: Server-side role dependency (`require_roles("super_admin")`); return `403 Forbidden` for any non-super-admin user regardless of client UI state.

---

## 4. Role-Based Access Control (RBAC) Permission Matrix

| Endpoint / Action | Method | `customer` | `kiosk_device` | `store_staff` | `store_manager` | `shop_owner` | `super_admin` | Tenant Scope Enforcement |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **Kiosk Core Flow** | | | | | | | | |
| `GET /api/v1/health` | GET | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Global |
| `GET /api/v1/catalog` | GET | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Scoped to active shop |
| `GET /api/v1/catalog/categories` | GET | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Scoped to active shop |
| `POST /api/v1/tryon` | POST | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Quota checked against `shop_id` |
| `POST /api/v1/tryon/validate-pose` | POST | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Stateless / Local CV |
| `GET /api/v1/tryon/download/{token}` | GET | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Scoped to token hash & expiry |
| `POST /api/v1/counter-tokens` | POST | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Scoped to `shop_id` |
| `GET /api/v1/counter-tokens/{code}` | GET | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Scoped to `shop_id` |
| `POST /api/v1/family-poll` | POST | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Scoped to `shop_id` |
| `GET /api/v1/family-poll/{code}` | GET | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Public voter access |
| `POST /api/v1/family-poll/{code}/vote`| POST | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Public voter access |
| **Authentication & Gate** | | | | | | | | |
| `POST /api/v1/auth/kiosk-pin-verify` | POST | ✕ | ✓ | ✓ | ✓ | ✓ | ✓ | Showroom Staff PIN |
| `POST /api/v1/auth/staff-kiosk-verify`| POST | ✕ | ✓ | ✓ | ✓ | ✓ | ✓ | Kiosk Hardware Unlock |
| `POST /api/v1/auth/login` | POST | ✕ | ✕ | ✓ | ✓ | ✓ | ✓ | Credentials DB check |
| `GET /api/v1/auth/verify-token` | GET | ✕ | ✓ | ✓ | ✓ | ✓ | ✓ | Bearer Header validation |
| `POST /api/v1/auth/logout` | POST | ✕ | ✓ | ✓ | ✓ | ✓ | ✓ | Token revocation |
| `POST /api/v1/auth/change-admin-pin`| POST | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ | Scoped to `shop_id` |
| **Showroom Operations (Staff/Manager)** | | | | | | | | |
| `GET /api/v1/admin/customers-today` | GET | ✕ | ✕ | ✓ | ✓ | ✓ | ✓ | Filtered by `shop_id` |
| `GET /api/v1/admin/tokens` | GET | ✕ | ✕ | ✓ | ✓ | ✓ | ✓ | Filtered by `shop_id` |
| `PATCH /api/v1/admin/tokens/{id}` | PATCH | ✕ | ✕ | ✓ | ✓ | ✓ | ✓ | Filtered by `shop_id` |
| `GET /api/v1/admin/metrics` | GET | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ | Filtered by `shop_id` |
| `GET /api/v1/admin/jobs` | GET | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ | Filtered by `shop_id` |
| `POST /api/v1/admin/jobs/{id}/retry` | POST | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ | Filtered by `shop_id` |
| `GET /api/v1/admin/insights` | GET | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ | Filtered by `shop_id` |
| **Catalogue & Inventory Management** | | | | | | | | |
| `GET /api/v1/admin/products` | GET | ✕ | ✕ | ✓ | ✓ | ✓ | ✓ | Filtered by `shop_id` |
| `POST /api/v1/admin/products` | POST | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ | Writes with `shop_id` |
| `PATCH /api/v1/admin/products/{id}` | PATCH | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ | Scoped to `shop_id` |
| `DELETE /api/v1/admin/products/{id}`| DELETE | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ | Scoped to `shop_id` |
| `POST /api/v1/admin/sync-catalog-feed`| POST | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ | Scoped to `shop_id` + API Key |
| **Store Users & Settings** | | | | | | | | |
| `GET /api/v1/admin/users` | GET | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ | Filtered by `shop_id` |
| `POST /api/v1/admin/users` | POST | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ | Writes with `shop_id` |
| `GET /api/v1/admin/showroom-settings`| GET | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ | Filtered by `shop_id` |
| `PUT /api/v1/admin/showroom-settings`| PUT | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ | Scoped to `shop_id` |
| **Platform Super Admin (Platform Operator Only)** | | | | | | | | |
| `GET /api/v1/admin/settings` | GET | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | Global Platform Config |
| `PUT /api/v1/admin/settings` | PUT | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | Global Platform Config |
| `POST /api/v1/admin/test-ai-provider`| POST | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | Global Platform Config |
| `POST /api/v1/admin/purge-expired` | POST | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | Global Storage Purge |
| `GET /api/v1/admin/saas-customers` | GET | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | Cross-Tenant SaaS Billing |
| `POST /api/v1/admin/onboard-boutique`| POST | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | Provisions new `ShopModel` |
| `PATCH /api/v1/admin/saas-customers/{id}`| PATCH | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ | Modifies Quota / Plan |

---

## 5. Security Guardrails & Implementation Rules

1. **No URL Query Tokens**: All requests requiring authentication must transmit credentials via standard HTTP headers:
   - User & Staff Sessions: `Authorization: Bearer <jwt_or_session_token>`
   - Automated Ingestion Feeds: `X-NeXooAi-Catalog-Key: <api_key>`
2. **Mandatory Tenant Scoping**: Every database select, insert, update, and delete query on tenant entities (`products`, `categories`, `tryon_jobs`, `counter_tokens`, `family_polls`, `admin_users`) MUST explicitly include `WHERE shop_id = :current_shop_id` (except when requested by `super_admin`).
3. **No Hardcoded Master Secrets in Production**:
   - When `APP_ENV=production`, bypass keys, master PIN fallbacks (`849201`), and test defaults (`5521`) are strictly rejected.
   - PIN changes must be stored in the database hashed or securely encrypted.
4. **Zero AI Training on Customer Data**:
   - Customer portraits and virtual try-on images are never retained longer than the configured retention window (default 24h).
   - Images are processed solely through inference APIs; training data aggregation is forbidden.
5. **Masking of Sensitive Configuration**:
   - API keys (FAL, Gemini, OpenAI, WhatsApp) and PIN numbers must never appear in clear text in API responses or logs. Use `mask_key()` utilities.
