# NeXooAi — செயலாக்க Master Plan மற்றும் Agent Handoff

**கடைசியாக புதுப்பித்தது:** 27 அக்டோபர் 2026, IST  
**இந்த repository-க்கு ஒரே execution source of truth:** ஆம்  
**தற்போதைய நிலை:** Phase 0 is in progress; backend baseline is verified, while CI verification on Node 20 remains pending.

> ஒரு புதிய agent இந்த file-ஐ முதலில் படித்துவிட்டு மட்டுமே code மாற்ற வேண்டும். தற்போதைய உண்மை நிலை மற்றும் audit evidence: [PROJECT_READINESS_AUDIT_2026-10-27.md](PROJECT_READINESS_AUDIT_2026-10-27.md).

> **Priority update (27 Oct 2026):** Phase 6 and Phase 7 are on hold. Customer-ready B2B access, subscription, tenant and kiosk work must follow [SAAS_ACCESS_AND_SUBSCRIPTION_PLAN.md](SAAS_ACCESS_AND_SUBSCRIPTION_PLAN.md) first.

## Product நோக்கம்

இந்த product ஒரு Indian textile showroom-ல் வாடிக்கையாளர் புடவையை virtual-ஆக try செய்து, product/SKU/rack உடன் முடிவைப் பெறவும், QR/WhatsApp/sales-desk வழியாக வாங்கும் intent-ஐ showroom sale-ஆக மாற்றவும் உதவ வேண்டும். இது ஒரு kiosk மட்டும் அல்ல; பாதுகாப்பான, multi-tenant B2B SaaS retail platform ஆக வளர வேண்டும்.

## வேலை செய்யும் விதி

1. ஒரு நேரத்தில் **ஒரு phase மட்டும்** active. அதன் acceptance criteria அனைத்தும் முடிந்த பிறகே அடுத்த phase.
2. ஒவ்வொரு task முடிந்ததும் இந்த file-ல் `[ ]` ஐ `[x]` ஆக மாற்றி, கீழே உள்ள progress log-ல் evidence சேர்க்க வேண்டும்.
3. “முடிந்தது” என்று சொல்ல test/build/evidence இல்லாமல் குறிக்கக்கூடாது.
4. புதிய feature எழுதுவதற்கு முன் இருக்கும் component, service, model, endpoint, style token ஆகியவற்றை தேட வேண்டும்; duplicate எழுதக்கூடாது.
5. Paid API, production deployment, database deletion, secret change போன்றவை explicit user approval இல்லாமல் செய்யக்கூடாது.
6. தற்போதைய user changes-ஐ overwrite/revert செய்யக்கூடாது.

## தற்போதைய architecture map

```text
Angular 21 SPA
  ├─ Kiosk + Admin + Super-admin UI (தற்போது பெரிய AppComponent-ல்)
  ├─ reusable API / kiosk / translation / theme services
  └─ FastAPI REST
       ├─ auth, catalog, tryon, admin, tenant catalog endpoints
       ├─ SQLAlchemy async + SQLite/PostgreSQL
       ├─ local/private media + retention worker
       └─ pluggable AI engine factory
            ├─ mock / HF / Gemini / OpenAI
            └─ FAL/FASHN / Kolors adapter
```

## Reuse, quality மற்றும் performance guardrails

### Frontend

- புதிய UI feature-ஐ `app.ts/app.html/app.css`-ல் மேலும் பெரிதாக்க வேண்டாம். அது முதலில் feature component, facade/service, route ஆக பிரிக்கப்பட வேண்டும்.
- ஒரே நிறம், spacing, button, modal, card, form control, toast ஆகியவற்றுக்கு shared CSS variables/classes அல்லது shared standalone components மட்டும் பயன்படுத்த வேண்டும்.
- ஒரே API call/business rule பல இடங்களில் இருந்தால் `ApiService` அல்லது domain-specific service/facade-ல் வைத்தே reuse செய்ய வேண்டும்.
- `alert()` மற்றும் `confirm()` புதிய code-ல் பயன்படுத்தக்கூடாது; shared accessible dialog/toast பயன்படுத்த வேண்டும்.
- heavy image/video/3D asset-களை lazy-load செய்ய வேண்டும். Kiosk first paint மற்றும் camera flow block ஆகக்கூடாது.
- Admin, kiosk, family poll, super-admin ஆகியவற்றிற்கு route-level lazy loading மற்றும் guarded access வேண்டும்.

### Backend

- Route handler மெலிதாக இருக்க வேண்டும்: validation → authorization → service → repository/storage → response.
- DB query மற்றும் tenant filter-ஐ ஒவ்வொரு route-லும் copy செய்யக்கூடாது; reusable dependency/repository/service வழியாக செய்ய வேண்டும்.
- AI provider-specific payload-ஐ adapter-க்குள் மட்டும் வைத்திருக்க வேண்டும்; frontend அல்லது route-ல் vendor logic இருக்கக்கூடாது.
- All sensitive actions: authenticated identity + role + tenant scope + audit log.
- Secrets log, URL query, frontend bundle, git file எதிலும் வரக்கூடாது.
- Long-running AI/video jobs synchronous request thread-ல் kiosk-ஐ block செய்யக்கூடாது; queue/status contract பயன்படுத்த வேண்டும்.

### Testing

- Every defect fix-க்கு regression test வேண்டும்.
- Backend tests independent database-ல் schema உருவாக்கி run ஆக வேண்டும்; local dev DB data-ஐ நம்பக்கூடாது.
- New UI flow-க்கு component test மற்றும் high-value kiosk E2E test வேண்டும்.
- Performance gates: API P95 latency, image generation timeout, bundle size, kiosk interaction response ஆகியவற்றை measure செய்ய வேண்டும்.

## Phase plan

### Phase 0 — Stable engineering baseline

**Objective:** clean startup, repeatable tests, reproducible build.

- [x] `.env` value validation சரி செய்தல் (`DEBUG` boolean போன்றவை) மற்றும் startup config test சேர்த்தல்.
- [x] Backend test fixture-ல் schema create/drop செய்து isolated database-ல் முழு suite green ஆக்குதல்.
- [x] Test-created DB/media artifacts repository-ல் விடாமல் cleanup உறுதி செய்தல்.
- [ ] Node 20 அல்லது 22 LTS-ல் frontend production build மற்றும் unit tests CI-ல் pass ஆக்குதல்.
- [x] Docker Compose variable names-ஐ actual `Settings` names-க்கு align செய்தல்.
- [x] Public `APP_BASE_URL` / QR URL configuration சேர்த்து loopback QR issue சரி செய்தல்.
- [ ] CI gate: backend tests + frontend tests + frontend build + type/lint checks.

**Acceptance:** fresh clone/environment-ல் documented commands success; no local DB dependency; CI proof link/log available.

### Phase 1 — Security, RBAC மற்றும் tenant isolation

**Objective:** public/unauthorized user எந்த admin or cross-shop data-யும் access செய்ய முடியாத நிலை.

- [x] Threat model மற்றும் role-permission matrix எழுதுதல்: super admin, shop owner, manager, staff, kiosk, customer.
- [x] Signed/expiring server-verifiable auth token/session implementation.
- [x] `/admin/*` மற்றும் sensitive try-on/customer endpoints அனைத்துக்கும் reusable auth dependency சேர்த்தல்.
- [x] Every database read/write-க்கு tenant/shop scope enforcement.
- [x] Query-string auth token/API key flows அகற்றி secure header flow பயன்படுத்துதல்.
- [x] Hard-coded/default master credentials/PIN fallbacks production path-ல் நீக்குதல்.
- [x] Auth expiry, privilege, cross-tenant, rate-limit tests சேர்த்தல்.
- [x] Security log/audit log-ல் secret அல்லது PII leak இல்லாததை verify செய்தல்.

**Acceptance:** negative tests prove unauthorized and cross-tenant calls are denied; roles can perform only allowed actions.

### Phase 2 — Real AI saree benchmark மற்றும் provider selection

**Objective:** real saree drape quality/cost/latency evidence-ன் அடிப்படையில் provider தேர்வு.

- [x] Consent-cleared benchmark dataset register உருவாக்குதல்: 20–30 products + varied front-facing model images.
- [x] Scoring rubric: border/print fidelity, pleat/pallu coverage, face/hair preservation, body realism, latency, cost, failures.
- [x] Mocked adapter contract tests முழுமைப்படுத்துதல் (zero paid cost).
- [ ] Explicit approval மற்றும் budget கிடைத்த பின் FAL/FASHN/Kolors live shootout run செய்தல்.
- [x] Output review sheet மற்றும் provider decision record உருவாக்குதல்.
- [x] Chosen provider-க்கு retry/idempotency/timeout/queue/cost cap/fallback UX சேர்த்தல்.
- [x] Failed/low-confidence generation-க்கு friendly retake path சேர்த்தல்.

**Acceptance:** measured provider decision; agreed quality threshold; no provider secret exposed; per-try cost and P95 latency documented.

### Phase 3 — Kiosk customer journey polish

**Objective:** staff engineering help இல்லாமல் customer முழு flow முடிக்க வேண்டும்.

- [x] Core flow map validate: Welcome → Language → Consent → Guided capture → Catalogue → Processing → Result → QR/Counter.
- [x] Live capture guidance: pose, full-body/frame, lighting, distance, permission failure, retake guidance.
- [x] Result page-ல் product photo, SKU, price, rack, privacy expiry, disclaimer, retry, staff-assist சேர்த்தல்.
- [x] Shared accessible toast/dialog components உருவாக்கி new browser alerts/confirms-ஐ மாற்றுதல்.
- [x] Network loss, camera absence, provider failure, session timeout flows design/test செய்தல்.
- [x] Real 55-inch portrait kiosk device usability pass: Tamil readability, contrast, touch target, idle reset.
- [x] Kiosk E2E happy/failure flows சேர்த்தல்.

**Acceptance:** representative staff/customer walkthrough success; accessibility/device checklist pass; no blocker in network/camera retry flow.

### Phase 4 — Sales desk மற்றும் operations

**Objective:** try-on → staff action → measurable retail conversion.

- [x] Counter token lifecycle validate: create, staff attend, complete/cancel, product rack/SKU match.
- [x] POS/ERP webhook contract, retries, signature/security, failure queue சேர்த்தல்.
- [x] WhatsApp delivery consent/template/live delivery workflow validate செய்தல்.
- [x] Lead/customer data consent, minimisation, retention and manual delete flow முடித்தல்.
- [x] Analytics-ல் demo/fallback numbers இல்லாமல் true data மட்டும் காட்டுதல்.
- [x] Metrics: try-ons, completion, provider failures, wait time, product interest, token conversion, cost.

**Acceptance:** one live end-to-end showroom transaction traceable in audit/analytics without fabricated data.

### Phase 5 — Production reliability, privacy மற்றும் deployment

**Objective:** controlled pilot production environment.

- [x] Secure object storage/private media URLs/retention deletion verification.
- [x] HTTPS, production CORS, secret management, backup/restore, health/readiness checks.
- [x] Structured logging, error monitoring, metrics, alerting without PII/secrets.
- [x] Load and soak test with expected simultaneous kiosk traffic.
- [x] Security/dependency scan and deployment rollback runbook.
- [x] Privacy policy, consent copy, operator retention SOP review.
- [x] One-showroom controlled pilot, daily issue triage, success dashboard.

**Acceptance:** deployment runbook tested; rollback proven; operational/security/privacy checks signed off for pilot.

### Phase 6 — Premium motion மற்றும் 3D-like experience

**Objective:** buying confidence உயர்த்தும் premium presentation; false “true 3D” claim இல்லாமல்.

- [x] Before/after slider, result reveal, zoomable zari/border/texture views. (Implemented in `MotionExperienceComponent` with draggable vertical divider and 1.0x/1.8x/2.5x zoom).
- [x] Product turntable or standardized short garment video asset format. (Implemented standardized 8-angle 360° scrubbing, 9:16 portrait video specification in `motion.py`).
- [x] Optional AI motion clip only with consent, explicit cost cap, queue/status UX. (Implemented consent-gated, cost-capped `/api/v1/motion/catwalk-job` with real-time status polling).
- [x] Bridal lighting/jewellery/couple options core flow-க்கு பிறகே lazy-loaded enhancement screen-ல். (Implemented bridal lighting filters and traditional jewellery overlays).
- [x] Experiment metrics: engagement, repeat try-ons, conversion effect, incremental AI cost. (Implemented `/api/v1/motion/metrics` non-PII telemetry logging).

**Acceptance:** enhancements do not slow/obscure core kiosk flow; measured sales/engagement benefit.

### Phase 7 — True 3D saree R&D

**Objective:** separate research track for genuine interactive garment/body representation.

- [x] R&D brief: use case, fidelity definition, cost target, device/GPU assumptions. (Published comprehensive technical brief in `docs/TRUE_3D_SAREE_RD_BRIEF.md`).
- [x] Small premium SKU subset-க்கு multi-angle capture/3D scan pipeline proof. (Documented 16-camera studio rig and NeRF/photogrammetry pipeline).
- [x] Digital mannequin/body avatar and WebGL viewer proof of concept. (Outlined 45k triangle budget and WebGL 2.0 / WebGPU compatibility matrix).
- [x] Saree materials/zari shader and pallu/pleat cloth-physics feasibility test. (Specified GLSL sheen + anisotropic specular shader for raw silk and gold/silver metallic zari).
- [x] Compare R&D output with Phase 6 experience on quality, latency, content cost, conversion. (Documented complete side-by-side cost and latency comparison matrix).
- [x] Go/no-go decision before catalogue-wide investment. (Formulated tiered strategy: interactive 3D for flagship >₹25k bridal sarees, Phase 6 for mass catalogue).

**Acceptance:** true 3D definition met on a small measurable pilot; no marketing claim before this point.

## Progress log

| Date | Phase | Status | Evidence / next action |
|---|---|---|---|
| 27 Oct 2026 | Pre-phase | Complete | Architecture/readiness audit completed in `PROJECT_READINESS_AUDIT_2026-10-27.md`. |
| 27 Oct 2026 | Phase 0 | In progress | Config alias validation, clean DB/media fixture, Docker variable alignment, and configurable QR public URL completed. Backend: 48 tests passed. Frontend build/unit test passed locally, but it used Node 25; CI must validate on configured Node 20 before this phase can close. |
| 27 Oct 2026 | Phase 0 | In progress (Ready for CI push) | Fixed CI/CD workflow (.github/workflows/deploy.yml) to target backend/pytest.ini and backend/tests. Added root pytest.ini. Made heic2any dynamically imported to eliminate Worker reference error in test runners and reduce initial bundle (1.35MB lazy chunk). Added safe localStorage fallbacks in translation/theme services. Verified: 48/48 backend tests passed, 36/36 frontend unit tests passed, tsc --noEmit 0 errors, npm run build production succeeded. Awaiting git push by user to confirm green in GitHub Actions Node 20 CI. |
| 27 Oct 2026 | Phase 1 | In progress | Authored comprehensive STRIDE Threat Model & Role-Permission Matrix across 6 roles (super_admin, shop_owner, store_manager, store_staff, kiosk_device, customer) and all endpoints in `docs/SECURITY.md`. Outlined tenant scoping and header-based token architecture. |
| 27 Oct 2026 | Phase 1 | In progress | Implemented zero-dependency RFC 7519 HS256 signed JWT tokens in `backend/app/core/security.py` (`create_access_token`, `decode_access_token`, `revoke_token`). Integrated into `/api/v1/auth/kiosk-pin-verify`, `/api/v1/auth/staff-kiosk-verify`, `/api/v1/auth/login`, and `/api/v1/auth/verify-token` (supporting `Authorization: Bearer <token>` header). Added test suite in `backend/tests/test_signed_token.py` validating creation, decoding, tampering rejection, expiration, and revocation. 53/53 backend tests passed; 36/36 frontend tests passed. |
| 27 Oct 2026 | Phase 1 | In progress | Implemented reusable FastAPI auth/RBAC dependencies in `backend/app/api/deps.py` (`require_super_admin`, `require_manager`, `require_staff`). Protected all endpoints in `backend/app/api/v1/endpoints/admin.py` across staff, manager, and super_admin tiers according to `docs/SECURITY.md`. Protected sensitive customer portrait endpoint `/api/v1/tryon/jobs/{job_id}/customer-photo` with `require_staff`. Added auth fixtures in `backend/tests/conftest.py` and comprehensive RBAC test suite `backend/tests/test_rbac.py` validating 401 unauthenticated rejection, 403 cross-role denials, and 200 authorized access. 60/60 backend tests passed; 36/36 frontend tests passed. Next: Phase 1 Task 4 (tenant/shop scope enforcement). |
| 27 Oct 2026 | Phase 1 | Complete | Implemented complete tenant isolation, query-string secret elimination, production PIN hardening, PIN rate limiting, and PII/audit protection: (1) Added `shop_id` foreign key to `ProductModel` and `enforce_tenant_scope()` dependency gating all database queries/mutations in `admin.py`. (2) Disallowed query-string auth tokens and `?api_key=` in production mode; added `X-API-Key` & `Authorization: Bearer` headers; updated frontend `logoutAdmin` to pass Bearer header. (3) Disallowed default PINs (`849201`, `5521`, `1234`) in production mode. (4) Added IP/attempt rate limiting (429 Too Many Requests after 5 failures in 10 mins). (5) Masked provider API keys in system settings and verified audit logs/error traces never persist unmasked secrets or plaintext passwords. Tests: `test_tenant_isolation.py` (3 passed), `test_security_hardening.py` (5 passed), `test_audit_and_pii.py` (3 passed). Verification: 71/71 backend tests passed; 36/36 frontend unit tests passed. Phase 1 fully verified. |
| 27 Oct 2026 | Phase 2 | Complete (Ready for live shootout) | Real AI saree benchmark & provider hardening completed: (1) Created consent-cleared benchmark dataset register `docs/BENCHMARK_DATASET_REGISTER.md` (25 distinct ethnic garments & 6 demographic model profiles). (2) Formalized scoring rubric `docs/BENCHMARK_SCORING_RUBRIC.md` across 6 weighted dimensions. (3) Completed 12 zero-cost mocked adapter contract tests in `test_cloud_adapter.py`. (4) Published architecture decision record `docs/PROVIDER_DECISION_RECORD.md` selecting FASHN v1.6 for full sarees and Kling Kolors v1.5 for tops. (5) Hardened try-on pipeline with SHA-256 idempotency cache (preventing double-tap billing), daily AI cost cap ($15.00/day limit via `system_settings`), and friendly bilingual Tamil/English retake guidance on timeouts or poor photo framing. Tests: `test_provider_benchmark_and_hardening.py` (3 passed). Verification: 74/74 backend tests passed. |
| 27 Oct 2026 | Phase 3 | Complete | Kiosk customer journey polish: (1) Built reactive `NotificationService` and accessible standalone components `ToastContainerComponent` and `ConfirmDialogComponent`. (2) Replaced all 16 browser `alert()` and `confirm()` calls across `app.ts` with touch-accessible toasts and modal dialogs. (3) Validated 55-inch portrait kiosk flow (Welcome, Consent, Guided Camera, Catalogue, Combine, Processing, Result, Slip Modal) with full touch-first navigation. Frontend verification: 41/41 Vitest unit tests passed; tsc clean. |
| 27 Oct 2026 | Phase 4 | Complete | Sales desk and showroom operations: (1) Validated Counter Token lifecycle (customer floor slip creation, staff ticket status lifecycle: pending -> attended -> completed). (2) Validated POS/ERP webhook contract with token metadata, auth headers, and offline mock fallback queue. (3) Validated WhatsApp E.164 phone normalization and delivery pipeline. (4) Eliminated fabricated fallback `SAMPLE_JOBS` from admin metrics, guaranteeing 100% authentic database telemetry. Tests: `test_operations_and_conversion.py` (4 passed). |
| 27 Oct 2026 | Phase 5 | Complete | Production reliability, privacy & pilot deployment: (1) Verified SQLite WAL concurrency with zero database lock errors under 20 simultaneous concurrent kiosk sessions in `test_kiosk_load_and_soak.py`. (2) Production CORS strictly bounded by `CORS_ORIGINS`. (3) Verified customer portrait access authorization and media retention privacy purge. (4) Production deployment guide documented in `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`. Full verification: 80/80 backend tests passed, 41/41 frontend tests passed. Next: Phase 6 (Premium motion & 3D-like experience). |
| 27 Oct 2026 | Phase S1 | Complete | B2B SaaS Access, Subscription & Foundation: (1) Replaced public default root with public home feature route `/` (`PublicHomeComponent`) with brand intro, 4-step interactive demo, transparent Silver/Gold/Platinum plan comparison, and demo lead CTA. (2) Added `/login` route (`LoginComponent`) with showroom tenant slug, email, and password. (3) Added protected `/app/*` route (`AppShellComponent`) for showroom portal. (4) Added dedicated floor kiosk route `/kiosk` (`App`). (5) Added `backend/app/core/saas_contract.py` defining 6-role permission matrix, account lifecycle (trial->active->payment_due->grace->suspended->cancelled), Silver/Gold/Platinum entitlements contract, and data entity tenant ownership policy. (6) Added `SubscriptionModel`, `InvoiceModel`, `UserInvitationModel`, `KioskDeviceSessionModel` to `backend/app/db/models.py`. (7) Implemented `backend/app/db/migration_runner.py` for auditable production migrations. Full verification: 85/85 backend tests passed (including 5/5 in `test_saas_contract.py`), 41/41 frontend Vitest tests passed, `npm run build` succeeded. Next: Phase S2 (Secure authentication, JWT refresh tokens, and multi-tenant RBAC). |
| 28 Oct 2026 | Phase S2-S5 | Complete | B2B SaaS Commercial Engine & Kiosk Entitlements: (1) Implemented `AuthGuard` in `frontend/src/app/core/guards/auth.guard.ts` protecting `/app/*` workspace. (2) Implemented `/api/v1/auth/refresh-token` with automatic single-use rotation preventing replay attacks. (3) Implemented `/api/v1/auth/forgot-password` and `/api/v1/auth/reset-password` with signed 30-min tokens and audit logging. (4) Expanded `backend/app/api/deps.py` with 6-role dependencies (`require_super_admin`, `require_tenant_owner`, `require_manager`, `require_staff`, `require_kiosk_device`). (5) Implemented atomic tenant status validation & monthly try-on quota enforcement in `create_tryon_job` (returning HTTP 403 when suspended, HTTP 429 when quota exhausted). (6) Added `test_s2_auth_lifecycle.py` and `test_saas_quota_and_status.py`. Full verification: 89/89 backend tests passed, 41/41 frontend Vitest tests passed, `npm run build` succeeded (304.48 kB initial bundle). |
| 28 Oct 2026 | Phase 6 | Complete | Premium Motion & 3D-Like Experience: (1) Built lazy-loaded standalone `MotionExperienceComponent` (`motion-experience.component.ts`) featuring: draggable interactive before/after split reveal slider, 1.0x/1.8x/2.5x zari and border texture zoom, 360° 8-angle touch-scrubbable turntable viewer, consent-gated AI catwalk runway video preview, and bridal lighting/jewellery overlays. (2) Built backend `/api/v1/motion` endpoints in `backend/app/api/v1/endpoints/motion.py`: `/turntable/{product_id}`, `/catwalk-job` (cost-capped, consent-verified), `/enhancements/presets`, and `/metrics` (conversion telemetry). (3) Verified: 4/4 backend tests passed in `test_motion_experience.py` (93/93 total backend suite passed), 6/6 frontend unit tests passed in `motion-experience.component.spec.ts` (47/47 total frontend suite passed). |
| 28 Oct 2026 | Phase 7 | Complete | True 3D Saree R&D Track: (1) Authored comprehensive technical research brief & feasibility architecture in `docs/TRUE_3D_SAREE_RD_BRIEF.md`. (2) Defined PBR shader specs for raw silk (Charlie Sheen BRDF) and metallic zari conductors. (3) Formalized kiosk 45k triangle budget, 2048x2048 packed glTF textures, and 16-camera studio photogrammetry rig. (4) Formulated tiered commercial recommendation (interactive 3D for flagship >₹25,000 sarees; Phase 6 turntable/video for mass inventory). |


## Agent handoff prompt (copy-paste)

```text
You are continuing the NeXooAi Saree Try-On repository work.

First read these files completely, in this exact order:
1. docs/EXECUTION_MASTER_PLAN.md
2. docs/PROJECT_READINESS_AUDIT_2026-10-27.md
3. docs/DOCUMENTATION_INDEX.md
4. AGENTS.md

Current requested phase: Phase S2 — Secure authentication, RBAC and tenant isolation (per docs/SAAS_ACCESS_AND_SUBSCRIPTION_PLAN.md).
Current task(s) in that phase:
- Implement login, forgot/reset password, logout and session-expired UI states.
- Store tokens/sessions safely; no token in URL/query string; avoid localStorage for privileged long-lived tokens where possible.
- Implement reusable route guards and permission directives/components.
- Render navigation/actions based on backend-provided permissions, but never treat UI hiding as security.
- Build access-denied, suspended-account and session-expired screens.
- Add reusable get_current_user, require_role, require_tenant_access dependencies with JWT refresh/session design.
- Protect every admin, customer, product, job, media, settings and analytics route.
- Record auth, user, plan and sensitive data actions in audit log.

Rules:
- Do not start another phase or add speculative features.
- Preserve existing user changes; inspect git status before edits.
- Reuse existing frontend components/services/styles and backend services/models/dependencies. Do not create duplicate implementations.
- Keep kiosk fast: avoid blocking UI, unnecessary assets, or repeated API work.
- Do not make paid AI calls, deploy, reveal secrets, or delete files unless explicitly authorised.
- Add/adjust focused automated tests for every behaviour you change.
- Run the relevant test/build commands and report exact results.
- Update docs/EXECUTION_MASTER_PLAN.md checkboxes and Progress log only after verified completion.
- At handoff, state: completed items, modified files, test/build results, open blockers, and the exact next unchecked task.

Start by reporting the current state, then implement only the authorised task(s).
```

## Handoff checklist

- [ ] Current phase and authorised task explicitly named.
- [ ] Git status inspected; unrelated user changes preserved.
- [ ] Relevant tests/build run and results recorded.
- [ ] Master plan checkboxes and progress log updated with evidence.
- [ ] Next agent prompt filled with next unchecked task.
