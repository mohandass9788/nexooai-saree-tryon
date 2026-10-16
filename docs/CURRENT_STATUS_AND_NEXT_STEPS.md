# NeXooAi Virtual Saree Try-On — Current Status Check and Next-Step Decision

> **Document Type**: Comprehensive State Audit & Provider Decision Report  
> **Repository**: [mohandass9788/nexooai-saree-tryon](https://github.com/mohandass9788/nexooai-saree-tryon)  
> **Audit Timestamp**: 2026-10-14T15:15:00+05:30  
> **Status**: Completed / Ready for User Review  

---

## Executive Summary

An evidence-based inspection was conducted on the **NeXooAi Virtual Saree Try-On** codebase to verify actual progress following the initial audit and the 2026-10-13 handover session. 

### Key Findings at a Glance:
1. **Frontend Progress**: The Angular 21 Kiosk Totem UI (9:16 portrait), bilingual Tamil/English translation dictionary, 90-second inactivity session reset, camera streaming, and local file upload are verified and compile cleanly into production (`ng build` succeeded with exit code 0).
2. **Download & QR Code**: The previously identified defect in [app.ts](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/frontend/src/app/app.ts) has been resolved to download the try-on result rather than the raw customer input. The dynamic QR code generator using the `qrcode` library has been implemented in [qr-code.component.ts](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/frontend/src/app/shared/components/qr-code.component.ts) and embedded into the Totem UI template.
3. **Database & Storage**: SQLite database (`nexooai_dev.sqlite3`) schema has been synchronized with 12 relational tables (`shops`, `branches`, `kiosks`, `categories`, `products`, `product_images`, `tryon_sessions`, `tryon_jobs`, `download_tokens`, `admin_users`, `consent_audits`, `audit_logs`). Try-on job logging, consent recording, and download token tracking have been connected to `AsyncSession` in [tryon.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/api/v1/endpoints/tryon.py). An hourly retention purge daemon has been integrated into the FastAPI `lifespan` in [main.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/main.py).
4. **AI Virtual Try-On Status**:
   - Hugging Face IDM-VTON was implemented in [hf_engine.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/hf_engine.py) and successfully generated upper-body blouse and pallu drapes during earlier tests, but ran out of free ZeroGPU daily quota.
   - `gemini_guard.py` is actively using `gemini-3.5-flash-lite` for front-facing pose and orientation validation.
   - `gemini_engine.py` operates as an alpha-compositing fallback (not generative diffusion).
   - Neither **fal.ai FASHN v1.6** nor **Kling Kolors v1.5** is currently configured or wired to live endpoints. `FAL_KEY` does not exist in `.env` or system environment variables.
5. **Test Status**:
   - Backend Pytest: **20/20 PASSED** in 5.97s (100% pass rate).
   - Frontend Vitest: **6/6 FAILED** due to missing `TestBed.initTestEnvironment` setup in Vitest.
   - Angular Production Build: **PASSED** (bundle size: 355.57 kB).

---

## Step 1 — Inspection of the Actual Current State

### 1.1 Git Status, Branch, and Working Tree
- **Current Branch**: `main` (up to date with `origin/main`).
- **Recent Commit**: `f08d4b0 Initial commit`.
- **Staged Changes** (57 files): Includes foundational backend modules, docs, initial tests, and static assets staged for commit.
- **Unstaged Changes** (15 files modified in working directory):
  - [backend/app/api/v1/endpoints/tryon.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/api/v1/endpoints/tryon.py) (Database persistence for jobs, consent, and tokens).
  - [backend/app/api/v1/endpoints/catalog.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/api/v1/endpoints/catalog.py) (Category listing route and DB queries).
  - [backend/app/api/v1/endpoints/admin.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/api/v1/endpoints/admin.py) (Admin DB query sync and retry updates).
  - [backend/app/db/models.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/db/models.py) (Full relational schemas: shops, branches, kiosks, categories, tokens).
  - [backend/app/db/init_db.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/db/init_db.py) (Data synchronization and category seeding).
  - [backend/app/main.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/main.py) (Hourly retention purge daemon added to lifespan).
  - [backend/app/services/tryon/hf_engine.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/hf_engine.py) (Full saree inpainting mask, EXIF auto-rotation, 2K upscaling).
  - [backend/tests/](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/tests) (Added category tests, updated SKU mock in admin).
  - [frontend/src/app/shared/components/qr-code.component.ts](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/frontend/src/app/shared/components/qr-code.component.ts) (Dynamic canvas/dataURL QR generator via `qrcode`).
  - [frontend/src/app/app.html](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/frontend/src/app/app.html) (Embedded `<app-qr-code>` in Totem UI).
  - [frontend/src/app/app.css](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/frontend/src/app/app.css) (Totem drawer and QR card styling).
- **Untracked Files**:
  - `SESSION_HANDOVER_RESUME.md` (End-of-day handover log from 2026-10-13).
  - `docs/PYTHON_BACKEND_FOR_ANGULAR_DEVS.md` (Architectural companion guide).

### 1.2 Frontend and Backend Architecture
- **Frontend**: Angular 21.0.0 with Standalone Components, reactive Signals (`signal()`, `computed()`), and touch-optimized CSS. Features Totem 9:16 Portrait Mirror, Desktop Hub, and Admin Dashboard views.
- **Backend**: Python 3.9.6, FastAPI 0.115.14, SQLAlchemy 2.0.54, Uvicorn 0.31.1, Pydantic v2 schemas.

### 1.3 Endpoints and Database Persistence
- **Endpoints Verified**:
  - `/api/v1/health`: Returns service health, version, environment, and AI provider status.
  - `/api/v1/catalog`: Supports pagination, category filtering, search, and DB queries.
  - `/api/v1/catalog/categories/list`: Returns active garment categories.
  - `/api/v1/catalog/{saree_id}`: Retrieves individual product specifications.
  - `/api/v1/catalog/search/similar`: Vector similarity simulation.
  - `/api/v1/tryon`: Submits customer image and saree SKU; validates consent, MIME type, and size; creates jobs.
  - `/api/v1/tryon/validate-pose`: Calls Gemini multimodal vision for pose validation.
  - `/api/v1/tryon/jobs/{job_id}/result`: Serves output JPEG from storage.
  - `/api/v1/tryon/download/{token}`: Cryptographic download gate with use count and expiration.
  - `/api/v1/admin/*`: Metrics, product catalog management, and job retry endpoints.
- **Database Status**:
  - SQLite database `nexooai_dev.sqlite3` is initialized.
  - Table counts verified via inspect query:
    - `shops`: 1 row (`shop_default`)
    - `branches`: 1 row (`branch_tnagar`)
    - `kiosks`: 1 row (`KIOSK-TN-CHN-01`)
    - `categories`: 8 rows (Bridal Silk, Banarasi, Cotton, Mysore, Chudidhar, Dhoti, Kurta, Kids)
    - `products`: 14 rows
    - `product_images`: 14 rows
    - `tryon_sessions`: 2 rows
    - `tryon_jobs`: 2 rows (earlier test jobs)
    - `download_tokens`: 2 rows
    - `consent_audits`: 2 rows
    - `admin_users`: 1 row (`admin@nexooai.com`)
    - `audit_logs`: 0 rows

### 1.4 Virtual Try-On Engines Inspection
- [gemini_guard.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/gemini_guard.py): Configured with `gemini-3.5-flash-lite`. Detects orientation via `ImageOps.exif_transpose`, validates upright front-facing posture, and returns bilingual customer guidance.
- [gemini_engine.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/gemini_engine.py): Pillow 2D polygon drawing has been removed. Performs background-keyed alpha compositing of garment swatches plus branding plaque. Not a generative diffusion model.
- [hf_engine.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/hf_engine.py): Implements Gradio client connectivity to Hugging Face Spaces (`yisol/IDM-VTON`, `Nymbo/Virtual-Try-On`), inpainting mask synthesis, and Lanczos 2K upscaling. Worked during previous test sessions but failed when Hugging Face daily free ZeroGPU quota was exhausted.
- [cloud_engine.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/cloud_engine.py): Implements HTTP request dispatch with exponential backoff and cost tracking. Contains legacy payload formats for Fashn direct and Replicate, but lacks dedicated fal.ai REST endpoints and fal authorization headers.
- [factory.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/factory.py): Maps `settings.AI_TRYON_PROVIDER` to `HuggingFaceVTONEngine`, `GeminiTryOnEngine`, `CloudApiTryOnEngine`, or `MockTryOnEngine`.

### 1.5 Environment Variables & Secret Safety Audit
- `.env` inspected strictly for variable presence without revealing secrets:
  - `APP_ENV`: Present
  - `DATABASE_URL`: Present
  - `AI_TRYON_PROVIDER`: Present (configured to `huggingface`)
  - `HF_TOKEN`: Present
  - `GEMINI_API_KEY`: Present
  - `SECRET_KEY`: Present
  - `FAL_KEY`: **NOT PRESENT** in `.env` and **NOT PRESENT** in system environment.
  - `AI_TRYON_API_KEY`: **NOT PRESENT** in `.env`.
  - `AI_TRYON_API_URL`: **NOT PRESENT** in `.env`.

### 1.6 Download, QR Code, and Image Purge Status
- **Result Download**: Verified fixed in [app.ts:L357-L367](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/frontend/src/app/app.ts#L357-L367). Prioritizes `tryOnResult().result_image_url` before falling back to customer photo.
- **QR Code**: Verified implemented in [qr-code.component.ts](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/frontend/src/app/shared/components/qr-code.component.ts) using `QRCode.toDataURL()`. The static placeholder SVG is replaced with a scannable dynamic QR matrix.
- **Automatic Purge**: Implemented in [main.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/main.py) via `retention_purge_worker()` coroutine running every 3600 seconds to delete files older than `MEDIA_RETENTION_HOURS` (24h).

### 1.7 Test Execution Results
- **Backend (Pytest)**:
  - Command: `backend\venv\Scripts\python.exe -m pytest backend\tests -v`
  - Result: **20/20 PASSED** in 5.97s (100% pass rate).
- **Frontend (Vitest)**:
  - Command: `npx vitest run`
  - Result: **6/6 FAILED** (`Need to call TestBed.initTestEnvironment() first`).
- **Frontend (Angular Production Build)**:
  - Command: `npx ng build`
  - Result: **SUCCESS** (Exit Code 0, 355.57 kB initial bundle).

---

## Step 2 — Work Classification Table

| Feature | Current Status | Evidence (Files, Symbols, Tests) | Remaining Issue | Recommended Next Action |
| :--- | :--- | :--- | :--- | :--- |
| **Bilingual Kiosk UI (Tamil / English)** | **Completed** | [app.ts](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/frontend/src/app/app.ts), [translation.service.ts](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/frontend/src/app/core/services/translation.service.ts), [app.html](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/frontend/src/app/app.html) | None. Language toggle updates all strings dynamically. | Retain as is. |
| **55" Portrait Totem View & Mobile Drawer** | **Completed** | [app.css](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/frontend/src/app/app.css), [app.html:L150-L318](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/frontend/src/app/app.html#L150-L318) | None. Edge-to-edge camera background and glass drawer verified. | Retain as is. |
| **Webcam & File Upload** | **Completed** | [app.ts:L105-L260](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/frontend/src/app/app.ts#L105-L260) | None. Live streaming, 3s/5s countdown timer, and local file picker functional. | Retain as is. |
| **Pose Quality & Orientation Guard** | **Completed** | [gemini_guard.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/gemini_guard.py), `test_validate_pose_endpoint` | None. EXIF transpose and Gemini 3.5 Flash Vision validate pose before generation. | Retain as is. |
| **Background Removal Normalization** | **Completed** | [bg_remover.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/image/bg_remover.py), `rembg[cpu]` installed | None. Replaces room clutter with studio white background. | Retain as is. |
| **Dynamic Scannable QR Code** | **Completed** | [qr-code.component.ts](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/frontend/src/app/shared/components/qr-code.component.ts), [app.html:L304](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/frontend/src/app/app.html#L304) | None. Real QR matrix generated with `QRCode.toDataURL()`. | Retain as is. |
| **Result Image Direct Download** | **Completed** | [app.ts:L357-L367](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/frontend/src/app/app.ts#L357-L367) | None. Downloads generated result rather than raw input photo. | Retain as is. |
| **Database Persistence in Endpoints** | **Completed** | [tryon.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/api/v1/endpoints/tryon.py), [catalog.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/api/v1/endpoints/catalog.py), [models.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/db/models.py) | None. SQLite synchronized with products, jobs, categories, and consent records. | Retain as is. |
| **Automatic Image Retention Purge** | **Completed** | [main.py:L11-L23](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/main.py#L11-L23), [local_storage.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/storage/local_storage.py) | Background task runs hourly on server lifecycle; not yet scheduled in external system daemon. | Sufficient for kiosk deployment. |
| **Backend Automated Tests** | **Completed** | `backend/tests/` (20 tests passed in 5.97s) | None. Covers admin, catalog, tryon, tokens, health, and cloud adapter. | Retain as is. |
| **Frontend Production Build** | **Completed** | `frontend/dist/frontend` (355.57 kB) | None. Exit code 0, CSS budget exceeded warning is non-fatal. | Retain as is. |
| **Admin Authentication (Security)** | **Missing** | [admin.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/api/v1/endpoints/admin.py) | Endpoints are accessible without JWT or API key headers. | Add Bearer token / password protection in a future phase. |
| **Frontend Vitest Unit Suite** | **Blocked** | [app.spec.ts](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/frontend/src/app/app.spec.ts) | Vitest requires Angular test environment bootstrap file. | Configure Vitest setup file in a subsequent phase. |
| **Production Generative AI Try-On** | **Missing / Blocked** | [cloud_engine.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/cloud_engine.py), `.env` | `FAL_KEY` not configured; fal.ai endpoints for FASHN v1.6 and Kling Kolors v1.5 are not wired into adapter. | **Top Priority**: Implement fal.ai adapter for FASHN v1.6 & Kling Kolors v1.5 and run side-by-side benchmark. |

---

## Step 3 — Check the AI Provider Decision

### 3.1 Candidate Models on fal.ai
Both candidates run through the **fal.ai** serverless infrastructure using a single account and single `FAL_KEY`:

| Dimension | Candidate A: FASHN v1.6 via fal.ai | Candidate B: Kling Kolors v1.5 via fal.ai |
| :--- | :--- | :--- |
| **Model URL** | `fal.ai/models/fal-ai/fashn/tryon/v1.6` | `fal.ai/models/fal-ai/kling/v1-5/kolors-virtual-try-on` |
| **API Endpoint** | `https://fal.run/fal-ai/fashn/tryon/v1.6` | `https://fal.run/fal-ai/kling/v1-5/kolors-virtual-try-on` |
| **Verified Pricing** | **$0.075 per generation** (7.5¢ USD) | **$0.070 per generation** (7.0¢ USD) |
| **Input Schema** | `model_image` (URL/b64), `garment_image` (URL/b64), `category` ("one-pieces", "tops", "bottoms"), `mode` ("performance", "balanced", "quality") | `human_image_url` (URL/b64), `garment_image_url` (URL/b64) |
| **Output Resolution** | 864 × 1296 (1.1 MP) | Standard portrait (768 × 1024 / 1024 × 1024) |
| **Strengths** | Designed specifically for full-length outfits (`category: one-pieces`), dresses, and authentic fabric prints. Strong drape simulation. | High photorealism for shirts, dresses, and upper body clothing; natural skin tone preservation. |
| **Potential Risks for Sarees** | Saree pallu drape and shoulder pleats require flat-lay or on-model garment references. | Often biases toward western tops or skirts if input garment is an unfolded rectangular fabric. |

### 3.2 Current Implementation State
- Neither integration is currently implemented or tested with live fal.ai requests.
- `CloudApiTryOnEngine` in [cloud_engine.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/cloud_engine.py) has an adapter stub for legacy Fashn direct API, but does not use the fal.ai REST schema or headers.
- **Zero API credits were spent during this audit.** No paid endpoints were called.

### 3.3 Minimal Benchmark Shootout Plan
To make an evidence-based selection without assuming either model is superior for Indian sarees, both models should be tested side-by-side using the **identical approved test asset suite already in the repository**:

1. **Test Person Image**: [backend/app/static/benchmark_model.jpg](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/static/benchmark_model.jpg)  
   *(Clean, front-facing studio portrait of an Indian woman, 896 × 1200 px).*
2. **Garment A (Indian Silk Saree)**: [backend/app/static/sarees/real_kanchipuram.jpg](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/static/sarees/real_kanchipuram.jpg)  
   *(Authentic Kanchipuram silk saree with rich red fabric, gold zari border, and woven pallu, 700 × 1050 px).*
3. **Garment B (Western Apparel)**: [backend/app/static/sarees/m-dhoti-006.jpg](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/static/sarees/m-dhoti-006.jpg) / `M-SHIRT-006`  
   *(Tailored chambray cotton shirt / western top, 700 × 1049 px).*

#### Comparison Matrix Criteria:
1. **Garment-Design Fidelity**: Does the model preserve the exact color, border motif, and zari luster without blurring or hallucinating generic patterns?
2. **Saree Pleat & Pallu Drape**: Does the model drape the saree over the shoulder down to the feet, or does it leave trousers visible?
3. **Face & Identity Preservation**: Does the customer's face, hair, and skin tone remain 100% intact?
4. **Processing Latency**: Round-trip duration from submission to image delivery.
5. **Cost per Generation**: $0.075 vs $0.070.

### 3.4 What You Need to Configure (Credentials)
To enable this test, you only need to obtain a single API key from [fal.ai](https://fal.ai/) and add it to your local `.env` file:

```env
# Add this line to c:\Users\nithy\Videos\MNV's\nexooai-saree-tryon\.env
FAL_KEY=your_actual_fal_key_here
```

> [!IMPORTANT]
> **Never paste your API key into this chat.** Simply save it in your local `.env` file on your machine. The backend will read it locally via `Settings`.

---

## Step 4 — Recommended Next Instruction: Phase 1

### Recommended Phase:
**fal.ai Unified Adapter & Controlled Model Shootout (FASHN v1.6 vs. Kling Kolors v1.5)**

### 4.1 Why This Is the Next Priority
1. The Kiosk UI, database, tokens, QR code, and pose validation guard are already completed and functioning properly.
2. The remaining blocker preventing NeXooAi from being a commercial product is the **AI Try-On Reality Gap**: Hugging Face free GPU quota is exhausted, and Gemini only provides Pillow 2D compositing.
3. Connecting fal.ai unlocks commercial-grade virtual try-on at a predictable low cost (~7¢ per customer try-on).
4. Running the controlled shootout with approved showroom assets will settle the model decision with empirical evidence before finalizing showroom deployment.

### 4.2 What Is Already Completed and Reused
- [cloud_engine.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/cloud_engine.py): HTTP client structure, exponential backoff retries, error categorization, and cost logging.
- [factory.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/factory.py): Provider routing mechanism.
- [bg_remover.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/image/bg_remover.py): Customer image cleanup before dispatching to fal.ai.
- `backend/app/static/benchmark_model.jpg`: Approved person image.
- `backend/app/static/sarees/real_kanchipuram.jpg`: Approved saree asset.

### 4.3 Exact Files Requiring Modification in Phase 1
1. [backend/app/core/config.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/core/config.py): Add `FAL_KEY: str = ""` and provider options `fal-fashn` and `fal-kolors`.
2. [backend/app/services/tryon/cloud_engine.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/cloud_engine.py): Add payload builders and REST endpoints for:
   - `fal-ai/fashn/tryon/v1.6` (`https://fal.run/fal-ai/fashn/tryon/v1.6`)
   - `fal-ai/kling/v1-5/kolors-virtual-try-on` (`https://fal.run/fal-ai/kling/v1-5/kolors-virtual-try-on`)
   - Support `Authorization: Key {FAL_KEY}` header.
3. [backend/app/services/tryon/factory.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/factory.py): Wire `fal-fashn` and `fal-kolors` strings.
4. [backend/tests/test_cloud_adapter.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/tests/test_cloud_adapter.py): Add unit tests verifying payload formatting and error responses for both fal.ai models without spending credits.
5. `backend/run_fal_shootout.py`: A dedicated verification script that runs the 3 approved test images on both models only when explicitly triggered by you.

### 4.4 Expected Result
- Zero-dependency implementation (uses standard `httpx` already installed, no heavy SDK required).
- Side-by-side visual output comparison images saved in `media/shootout/`:
  - `fashn_kanchipuram_saree.jpg` vs `kolors_kanchipuram_saree.jpg`
  - `fashn_western_apparel.jpg` vs `kolors_western_apparel.jpg`
- Objective metrics: latency (seconds), exact cost ($), face fidelity score, and pleat coverage.
- Clear recommendation on which model to set as the default showroom engine in `.env`.

### 4.5 Tests That Will Prove It Works
1. **Mock Test**: Pytest unit test simulating 200 OK responses with synthetic fal.ai payloads (cost: $0.00).
2. **Authorized Live Benchmark**: Running `run_fal_shootout.py` on the 3 approved images:
   - 2 calls to FASHN v1.6 ($0.075 × 2 = $0.15)
   - 2 calls to Kling Kolors v1.5 ($0.070 × 2 = $0.14)
   - Total estimated benchmark cost: **$0.29 USD** (~₹24 INR).

---

## Step 5 — Waiting for Your Approval

In accordance with instructions:
- **No application code, database records, or environment files have been modified during this audit.**
- **No paid API endpoints have been invoked.**
- **No secrets or credentials have been exposed.**

Please review this status report. Once you have added your `FAL_KEY` to your local `.env` and give your approval, we will proceed immediately with **Phase 1: fal.ai Unified Adapter & Controlled Model Shootout**.
