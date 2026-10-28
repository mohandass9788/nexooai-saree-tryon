# NeXooAi Project Readiness Audit

**Audit date:** 27 October 2026 (IST)  
**Scope:** current workspace source, configuration, automated test/build commands, and existing documentation. This is a documentation-first assessment; it does not change application behaviour or call any paid AI service.

## Executive assessment

NeXooAi has moved well beyond a UI prototype. It contains a credible showroom-kiosk product flow, a substantial FastAPI backend, a multi-tenant catalogue model, and an AI-provider abstraction. Its strongest completed layer is the **demo / assisted showroom workflow**. It is **not production-ready yet**, principally because authentication and tenant isolation are not enforced on sensitive APIs, the verified test/build baseline is currently broken, and true saree output quality has not been live-benchmarked with a configured commercial provider.

**Readiness score:** 55/100 for a supervised internal showroom pilot; 25/100 for an internet-exposed commercial release.

## Product motive and implementation fit

### Intended outcome

Help an Indian textile showroom customer preview a saree quickly, retain the selected look on their phone, and connect that intent to a sales desk. For the operator, offer catalogue control, AI-provider configuration, operational metrics, and eventual B2B multi-tenant onboarding.

### What is genuinely present

1. Kiosk path: Tamil/English UI, camera/file image input, consent handling, pose validation, catalogue selection, AI try-on submission, result comparison/download QR, inactivity reset, and a 9:16 totem layout.
2. Retail path: product catalogue, product upload, counter tokens/POS webhook path, WhatsApp delivery integration surface, family poll flow, and showroom settings.
3. Platform path: shops, branches, kiosks, products, sessions, jobs, downloads, admin users, audit logs, and tenant catalogue ingestion endpoints.
4. AI path: mock, Hugging Face VTON, Gemini, OpenAI, FASHN/fal and Kolors/fal provider choices behind a factory; a cloud adapter includes retry/error/cost handling.

### Maturity conclusion

The kiosk journey is coherent, but the central promise is not yet proved: **an accurate, identity-preserving saree drape from real showroom assets at predictable speed and cost**. Current code supports integrations; it is not evidence that a real saree works reliably. Treat words such as “3D drape” as a visual-presentation claim until a cloth simulation or multi-view system is implemented.

## Architecture actually found

```text
Angular 21 single-page app
  ├─ kiosk, admin, super-admin experiences in a very large AppComponent
  ├─ camera/browser media, local signals, translation/theme/kiosk/API services
  └─ HTTP REST
          │
FastAPI /api/v1
  ├─ auth, catalog, tryon, admin, tenant-catalog routers
  ├─ SQLAlchemy async models and SQLite/PostgreSQL configuration
  ├─ local media storage + static file serving + hourly retention worker
  └─ try-on engine factory
          ├─ mock / Hugging Face / Gemini / OpenAI
          └─ FASHN and Kolors cloud adapter paths
```

### Architecture strengths

- AI engines are reasonably decoupled from routes through `BaseTryOnEngine` and a factory.
- The relational model covers the right retail entities for the next stage.
- Cloud adapter unit tests exercise response/error paths without paid calls.
- Retention, expiring QR downloads, consent records, and bilingual UI address real kiosk needs.

### Architecture gaps

- `app.ts`, `app.html`, and `app.css` have become monolithic. Kiosk, admin, super-admin, family poll, POS, styling, and onboarding should be feature modules/components with route guards.
- The app has no real client-side routing (`app.routes.ts` is empty), which makes deep links, authorization boundaries, testing, and maintenance harder.
- The backend router exposes many high-impact admin actions but does not apply an authentication/RBAC dependency to them. A successful login creates only an in-memory token; it expires only by client convention, is sent in query parameters for verify/logout, and is not checked by admin endpoints.
- Tenant catalogue APIs authenticate via an API key, but the rest of the system is not tenant-scoped consistently. A multi-tenant launch needs `shop_id` isolation for every query and a tested authorization policy.
- In-memory sessions disappear on restart and do not work across multiple backend replicas. Use short-lived signed access tokens, refresh/session storage, server-side revocation, and role/tenant claims.
- Docker variables do not align with application settings (`ACTIVE_AI_PROVIDER` vs `AI_TRYON_PROVIDER`, `FRONTEND_ORIGINS` vs `CORS_ORIGINS`, `FASHN_API_KEY` vs configured `FAL_KEY`/`AI_TRYON_API_KEY`). This can silently start production in an unexpected configuration.

## Design / experience review

### What works conceptually

- Portrait-first totem, big touch controls, bilingual copy, countdown capture, product catalogue, QR hand-off, and sales-token follow-up are right for a textile showroom.
- Bridal styling, lighting, couple looks, and family voting can improve engagement after the primary try-on is dependable.

### Important UX/design gaps

1. **Focus is diluted.** The primary “choose → capture → try → decide → call staff” path competes with a large number of advanced features. Ship the core path first; keep optional features behind an “Enhance my look” screen.
2. **Capture guidance needs measurable quality gates.** Add live framing silhouette, distance/lighting indicators, full-body requirement, camera-permission fallback, and clear retry advice before a paid generation.
3. **Results need trust cues.** Show generation time, AI-preview disclaimer, original product image/SKU/price/rack, retry/report-error actions, and an explicit privacy expiry.
4. **Accessibility needs validation.** Audit contrast, Tamil font rendering, touch target sizes on the real 55-inch device, keyboard focus, screen-reader labels, and network-loss states.
5. **Admin UX should not rely on browser `alert`/`confirm`.** Use accessible non-blocking confirmations and toast/error states.
6. **Do not market it as true 3D today.** The existing output is a 2D AI-generated image/video-style effect, not an interactive 3D garment or physics simulation.

## Verification results from this audit

| Check | Result | Evidence / interpretation |
|---|---|---|
| Backend test command using current `.env` | Blocked | `DEBUG=release` cannot be parsed as a boolean by Pydantic, so the application cannot initialise. |
| Backend tests using temporary valid test environment | 43 passed, 1 failed | The B2B onboarding/isolation test fails with `sqlite3.OperationalError: no such table: admin_users`; isolated DB setup is incomplete. |
| Frontend production build | Not verified / failed in this sandbox | Angular compiler cannot read ancestor directories and then cannot resolve app files. It also reports Node 25 (non-LTS). Re-run in a normal developer/CI environment with Node 20 or 22 LTS. |
| Frontend unit tests | Not verified / failed in this sandbox | Blocked by the same filesystem/compiler resolution issue. The test suite exists; no passing count should be claimed until CI runs it. |
| Paid AI live evaluation | Not run | No provider credential was used; live quality, latency, and per-look cost remain unverified. |

Do not describe the project as “all tests green” or “production release” until these commands run cleanly in CI with an isolated database and LTS Node.

## Release blockers, ordered

### P0 — fix before exposing the system

1. Correct invalid `.env` configuration (`DEBUG` must be `true` or `false`) and validate startup config in CI.
2. Enforce authentication, role checks, and tenant scope on every `/admin/*` endpoint and sensitive try-on/customer endpoints. Remove default/master PIN fallbacks and hard-coded default credentials from production paths.
3. Replace in-memory/query-string sessions with an expiring secure auth design; do not transmit access tokens in URLs.
4. Fix test database lifecycle so schema creation is explicit and each test run is clean/repeatable.
5. Align Docker Compose variables with `Settings`, remove insecure default database/password/secret values, and use production CORS origins.
6. Replace QR URL host `127.0.0.1:8000` with a configured public base URL; a customer phone cannot reach the kiosk loopback address.

### P1 — required for a reliable pilot

1. Run a controlled, consented saree benchmark: 20–30 representative sarees (silk, cotton, zari, different borders) × varied body/pose/light conditions; score garment fidelity, pallu/pleat coverage, face preservation, failure rate, latency, and cost.
2. Choose and configure one commercial provider based on that score, then add provider health checks, queueing, idempotency, timeout/cancellation, budget limits, and user-friendly failures.
3. Establish automated CI: backend test suite, frontend unit tests, production build, lint/type checks, dependency/security scan, and a smoke test that starts the composed app.
4. Persist/purge media securely with object storage, encryption/access controls, deletion audit, and privacy policy/consent copy reviewed for the operating region.
5. Add observability: structured logs without PII, error tracking, metrics for conversion/latency/provider failures, and alert thresholds.

### P2 — product improvement

- Split frontend by feature and routes; add end-to-end kiosk tests (camera mocked) and device tests on the real totem.
- Make analytics actual rather than fallback/demo values, and distinguish demo data clearly in the UI.
- Add offline/network-recovery screen, staff takeover, and booking/cart/CRM handoff.

## 3D and animation recommendation

Do not start with full real-time 3D cloth simulation; that requires accurate body measurement, garment geometry/material scans, GPU hardware, and a costly content-production pipeline. It is a separate R&D product from image try-on.

Use this staged approach instead:

1. **Now (highest value):** make 2D try-on trustworthy; add a subtle result reveal, before/after slider, and a short provider-generated motion clip only after obtaining explicit consent and cost limits.
2. **Next:** build “3D-like” showroom presentation—turntable/video assets for each product, garment detail zoom, texture/border close-ups, and a stable digital mannequin view. These improve buying confidence without misrepresenting fit.
3. **Later:** pilot true 3D on a small premium catalogue: standardized multi-angle garment photography or 3D scans, body avatar/measurements, WebGL viewer, then physics/drape R&D. Define success as fabric/border fidelity and sales lift, not animation alone.

## 30-day delivery sequence

| Week | Outcome |
|---|---|
| 1 | P0 configuration, auth/RBAC/tenant isolation design, test DB repair, CI baseline green. |
| 2 | Commercial AI provider benchmark and provider selection; QR public URL and secure media flow. |
| 3 | Guided capture/result UX, real kiosk device QA, operational monitoring, staff workflow. |
| 4 | Controlled one-showroom pilot with consent, daily quality review, conversion/latency/cost dashboard. |

## Definition of pilot success

- At least 95% of valid attempts complete without staff engineering help.
- Median result time and cost are within an agreed operational budget.
- Customers and staff rate image/product resemblance at an agreed threshold on real saree samples.
- No cross-shop data exposure, unauthorized admin action, unexpired media after deletion window, or QR link pointing to a local address.
- Every backend/frontend build and automated test gate is green in CI.

## Appendix: evidence locations

- Backend configuration: `backend/app/core/config.py`
- API composition: `backend/app/api/v1/router.py`
- Session/auth implementation: `backend/app/api/v1/endpoints/auth.py`
- AI selection/adapter: `backend/app/services/tryon/factory.py`, `backend/app/services/tryon/cloud_engine.py`
- Application/CORS/static serving: `backend/app/main.py`
- Frontend entry/features: `frontend/src/app/app.ts`, `app.html`, `app.css`
- Deployment and CI: `docker-compose.yml`, `.github/workflows/`
