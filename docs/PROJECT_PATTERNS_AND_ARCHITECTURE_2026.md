# NeXooAi — Project Patterns, System Architecture & Technical Specification
(திட்டக் கட்டமைப்பு, வடிவமைப்பு முறைகள் மற்றும் தொழில்நுட்ப விவரக்குறிப்பு)

**Date**: 15 November 2026  
**Status**: 100% Production Verified (Backend: 99/99 Tests Passed, Frontend: 75/75 Tests Passed)  
**Live Production URL**: [https://tryon.nexooai.in](https://tryon.nexooai.in)  
**Live Production API**: [https://api.tryon.nexooai.in](https://api.tryon.nexooai.in)  

---

## 1. Executive Summary & Design Philosophy

NeXooAi is an enterprise-grade Virtual Saree & Garment Try-On Retail SaaS designed specifically for Indian textile showrooms (such as Pothys, Nalli, RMKV, Kalyan Silks). It transforms the traditional floor showroom experience through touch-first 55" totems, delivering sub-second virtual trials, instant comparisons, and friction-free purchase intent conversion via WhatsApp and POS counter slips.

### Key Architectural Pillars:
1. **Touch-First Ergonomic Kiosk**: Bottom-up interaction dock optimized for 55" vertical totems, wheelchair reachability, and bilingual Tamil/English guidance.
2. **Pluggable AI Try-On Engine (Dual-Track)**:
   - **Track 1 (2-Step Catalog & Custom Garment)**: Combines customer portrait with segmented catalogue/physical garments using deep learning VTO models (Fashn.ai / Kolors / MediaPipe).
   - **Track 2 (Single-Shot "Hold & Wear" 1-Click)**: Allows customers to simply hold the physical saree in hand or over their shoulder in front of the kiosk camera; a single snapshot automatically parses the customer, fabric, pallu, and zari, draping it seamlessly in 1 pass using Google Gemini Multimodal Vision.
3. **Multi-Tenant B2B SaaS & Strict Role Isolation**: Complete separation between Super Admin platform management, Boutique Store Manager operations, Floor Staff assistance, and Sandboxed Kiosk Terminals.
4. **Data Privacy & Ephemeral Media Lifecycle**: Customer portrait photos and intermediate try-on assets are automatically purged by scheduled retention workers, preventing unauthorized PII storage while preserving anonymized retail conversion telemetry.

---

## 2. Core Architectural Patterns

### 2.1 Pluggable Adapter Pattern (AI Try-On Engines)
Located in `backend/app/services/tryon/`:
```
                     +---------------------------------+
                     |      BaseTryOnEngine (ABC)      |
                     +---------------------------------+
                     | + process_tryon(model, garment) |
                     | + process_single_shot(photo)    |
                     +----------------+----------------+
                                      |
         +----------------------------+----------------------------+
         |                            |                            |
+--------v----------+        +--------v----------+        +--------v----------+
|  MockTryOnEngine  |        | CloudApiTryOn     |        |  GeminiTryOn      |
|  (Testing/CI/CD)  |        | (FAL/Fashn/Kolors)|        | (Single-Shot VTO) |
+-------------------+        +-------------------+        +-------------------+
```
- **Factory Dispatch**: `get_tryon_engine()` inspects the tenant's configured provider (`gemini_single_shot`, `fal_fashn`, `fal_kolors`, or `mock`) and instantiates the appropriate adapter.
- **Resilience**: If a cloud provider experiences timeouts or credit exhaustion, the engine automatically falls back to an offline synthesis drape, ensuring the kiosk screen never displays an ugly crash.

### 2.2 Reactive Signal-Based UI Pattern (Angular 21)
Located in `frontend/src/app/`:
- **State Management**: Built entirely on native Angular signals (`signal()`, `computed()`) eliminating zone.js overhead and memory leaks.
- **Kiosk Step Machine**: Strictly governed by `KioskService`:
  ```
  WELCOME ──► CAMERA ──► CATALOGUE / CUSTOM ──► COMBINE ──► PROCESSING ──► RESULT
     │                                                                       ▲
     └───────────► SINGLE-SHOT "HOLD & WEAR" (1-Click) ─────────────────────┘
  ```
- **Ergonomics & Reach Mode**: Responsive signals toggle keypad heights (`isStaffKeypadLowered`), camera framing, and filter pill docking dynamically based on screen orientation (9:16 portrait vs 16:9 landscape).

### 2.3 Dependency Injection & Multi-Tenant RBAC (FastAPI)
Located in `backend/app/api/deps.py`:
- Every sensitive endpoint enforces tenant scoping and role-based permissions:
  - `require_super_admin`: Platform-wide configuration, tenant creation, billing.
  - `require_tenant_owner` / `require_manager`: Boutique catalog, pricing, daily customer reports, staff PIN management.
  - `require_staff`: Floor-level kiosk unlock and assistance.
  - `require_kiosk_device`: Sandboxed terminal operation with restricted API privileges.
- Tokens are passed strictly via `Authorization: Bearer <JWT>` headers; query-string token leaks are explicitly blocked by security middleware.

### 2.4 Dynamic Feature Toggle System
Located in `backend/app/core/system_settings.py` & `backend/app/api/v1/endpoints/admin.py`:
- Features (such as `feature_single_shot_tryon`, `runway_video`, `split_slider`, `feature_dash_whatsapp`) are stored in system settings and cached in memory.
- The public unauthenticated endpoint `GET /api/v1/admin/features-public` feeds feature flags to kiosks on boot, allowing the Super Admin to remotely enable or disable capabilities per store without redeploying code.

---

## 3. The Dual-Track Try-On Pipeline

### Track A: Traditional 2-Step Try-On
1. **Customer Snapshot**: High-resolution front camera capture evaluated in real-time by `GeminiPoseGuard` for centering and upright posture.
2. **Garment Selection**:
   - **Catalog Mode**: Customer browses showroom silk sarees (filtered by Kanchipuram, Banarasi, Soft Silk, Cotton).
   - **Custom Upload Mode**: Customer captures physical saree from the rack. Validated by `GarmentValidator` for fabric texture and genuine saree boundaries.
3. **Combine Step**: Customer reviews both portraits and taps "உடனடி ட்ரையல் தொடங்கு / Start AI Drape".
4. **VTO Synthesis**: Cloud engine segments customer body, replaces torso/shoulder drape, preserves customer face, skin tone, and hair, and drapes the selected pallu and pleats.

### Track B: Single-Shot "Hold & Wear" 1-Click Try-On
1. **Entry**: Customer taps **"⚡ கையில் பிடித்தபடி உடனடி ட்ரை-ஆன் (Single-Shot 1-Click)"** on the Welcome screen.
2. **Instant Capture**: Customer holds the physical saree in hand or over their shoulder in front of the kiosk camera.
3. **1-Click AI Processing**:
   - Dispatched to `POST /api/v1/tryon/single-shot`.
   - Google Gemini Multimodal Vision perceives the entire scene simultaneously:
     - Identifies customer identity, face, gender, posture, and skin tone.
     - Identifies the held fabric, its color, golden zari pattern, border, and pallu motifs.
     - Segments and removes the hand holding the fabric, reconstructing the customer standing in an elegant bridal posture wearing that exact saree.
4. **Direct Result**: Bypasses intermediate screens, landing directly on the Result screen with before/after comparison slider, WhatsApp share, and QR download slip.

---

## 4. Safety, Quality & Validation Guards

| Component | Endpoint | Model / Tech | Rejection Criteria & Actions |
| :--- | :--- | :--- | :--- |
| **Gemini Pose Guard** | `/api/v1/tryon/validate-pose` | Google Gemini 3.8 Flash | Rejects tilted heads (>25°), severe back-lighting, obscured faces, and multiple people in frame. Returns bilingual guidance in Tamil & English. |
| **Garment Fabric Validator** | `/api/v1/tryon/validate-garment` | Computer Vision + Gemini | Rejects pitch-dark frames, non-textile objects (phones, lamps, floors, faces), and extreme blur. Enforces green tick before proceeding. |
| **Payload Guard** | Middleware | FastAPI & Nginx | Enforces 10MB individual file cap, 25MB overall request cap (`client_max_body_size 25M`), and strictly validates image MIME types (`image/jpeg`, `image/png`, `image/webp`). |
| **Data Retention Guard** | Background Worker | SQLite / PostgreSQL | Purges customer portraits after configurable retention period (default 24 hours), ensuring compliance with personal privacy standards. |

---

## 5. Deployment & Production Infrastructure

### VPS Topology (`31.97.227.105`):
```
                      Internet (HTTPS Port 443 / HTTP Port 80)
                                      │
                                      ▼
                        Host Nginx Reverse Proxy (SSL)
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
    tryon.nexooai.in (Port 8080)                    api.tryon.nexooai.in (Port 8000)
              │                                               │
              ▼                                               ▼
┌───────────────────────────┐                   ┌───────────────────────────┐
│     nexooai_frontend      │                   │      nexooai_backend      │
│  (Angular 21 on Nginx)    │◄───(Docker Net)───►   (FastAPI on Uvicorn)    │
└───────────────────────────┘                   └─────────────┬─────────────┘
                                                              │
                                                              ▼
                                                ┌───────────────────────────┐
                                                │     nexooai_postgres      │
                                                │     (PostgreSQL 16)       │
                                                └───────────────────────────┘
```

- **Container 1 (`nexooai_frontend`)**: Lightweight Alpine Nginx serving compiled Angular 21 production bundles, pre-rendered routes, and multi-language assets (`assets/i18n/*.json`).
- **Container 2 (`nexooai_backend`)**: Python 3.10 FastAPI application with async Uvicorn workers, SQLAlchemy 2.0 ORM, and integrated AI adapter factory.
- **Container 3 (`nexooai_postgres`)**: PostgreSQL 16 Alpine database with persistent volume `nexooai_postgres_data` and healthcheck monitoring.

---

## 6. Test Suite & Verification Evidence

### Backend Test Results (Pytest):
- **Command**: `backend\venv\Scripts\python.exe -m pytest -c pytest.ini -v`
- **Total Tests**: **99 passed** out of 99 (100% pass rate).
- **Key Modules Tested**:
  - `test_tryon.py`: 12/12 passed (including single-shot success, disabled toggle enforcement, pose guard, garment validation).
  - `test_admin.py` & `test_admin_new_features.py`: 9/9 passed.
  - `test_rbac.py` & `test_saas_contract.py`: 12/12 passed.
  - `test_kiosk_management.py` & `test_kiosk_load_and_soak.py`: 3/3 passed.
  - `test_cloud_adapter.py`: 12/12 passed.

### Frontend Test Results (Vitest / Angular Testing):
- **Command**: `npm --prefix frontend test -- --watch=false`
- **Total Test Files**: **7 passed** out of 7.
- **Total Tests**: **75 passed** out of 75 (100% pass rate).
- **Key Suites Tested**:
  - `app.spec.ts`: 40/40 passed (including single-shot mode activation, 1-click try-on execution, error recovery, session reset, PIN security, cropper, reach mode).
  - `api.service.spec.ts`: 5/5 passed (single-shot submission, public features fetching, garment validation, pose guard).
  - `public-home.component.spec.ts`: 9/9 passed.
  - `app-shell.component.spec.ts`: 5/5 passed.
  - `motion-experience.component.spec.ts`: 6/6 passed.
  - `contact.component.spec.ts`: 5/5 passed.
  - `notification.service.spec.ts`: 5/5 passed.

### Overall Verification Score:
$$\text{Pass Rate} = \frac{99 + 75}{99 + 75} = \frac{174}{174} = 100\%$$
- **Angular Production Build**: Generated cleanly with zero errors (`npm --prefix frontend run build -- --configuration production`).
- **Live VPS Sync**: Deployed to `https://tryon.nexooai.in` and verified via automated HTTP requests with response status **200 OK**.
