# NeXooAi Virtual Saree Try-On — fal.ai Integration Status Report

> **Document Type**: Technical Integration Specification & Benchmark Verification  
> **Repository**: [mohandass9788/nexooai-saree-tryon](https://github.com/mohandass9788/nexooai-saree-tryon)  
> **Status**: Implementation Complete / Dry-Run Verified / Awaiting Live Approval  
> **Timestamp**: 2026-10-14T15:50:00+05:30  

---

## 1. Executive Summary

Phase 1 has successfully integrated **fal.ai** virtual try-on models into the NeXooAi platform. The integration supports both:
1. **FASHN v1.6** (`fal-ai/fashn/tryon/v1.6`): Designed for full-body garments, Indian sarees, dresses, and fabric textures with autonomous category resolution (`one-pieces` for sarees/dhotis; `tops` for shirts).
2. **Kling Kolors Virtual Try-On v1.5** (`fal-ai/kling/v1-5/kolors-virtual-try-on`): Diffusion-based garment transfer optimized for Western tops, shirts, and upper-body clothing.

Both models use the existing `CloudApiTryOnEngine` architecture, require zero heavy third-party SDKs (operating via existing `httpx` async client), and share a single server-side `FAL_KEY`.

---

## 2. Verified API Endpoints & Request Schemas

### 2.1 Authorization Header
* **Format**: `Authorization: Key <FAL_KEY>`
* **Rule**: fal.ai direct run endpoints (`https://fal.run/...`) require the `Key` scheme (not `Bearer`).

### 2.2 Candidate A: FASHN v1.6
* **Endpoint**: `https://fal.run/fal-ai/fashn/tryon/v1.6`
* **Verified Price**: **$0.075 per generation** (7.5¢ USD).
* **Input Payload Format**:
  ```json
  {
    "model_image": "data:image/jpeg;base64,...",
    "garment_image": "data:image/jpeg;base64,...",
    "category": "one-pieces",
    "mode": "performance",
    "nsfw_filter": true,
    "cover_feet": true,
    "adjust_hands": true
  }
  ```
* **Category Auto-Mapping Logic in NeXooAi**:
  - Sarees, Dhotis, Chudidhars, Pavadais, Dresses $\rightarrow$ `"one-pieces"`
  - Shirts, Tops, Kurtas, Blazers, T-Shirts $\rightarrow$ `"tops"`
  - Trousers, Pants, Skirts $\rightarrow$ `"bottoms"`
  - Other garments $\rightarrow$ `"auto"`
* **Response Output Format**:
  ```json
  {
    "images": [
      {
        "url": "https://fal.media/files/.../output.jpg",
        "width": 864,
        "height": 1296,
        "content_type": "image/jpeg"
      }
    ]
  }
  ```

### 2.3 Candidate B: Kling Kolors Virtual Try-On v1.5
* **Endpoint**: `https://fal.run/fal-ai/kling/v1-5/kolors-virtual-try-on`
* **Verified Price**: **$0.070 per generation** (7.0¢ USD).
* **Input Payload Format**:
  ```json
  {
    "human_image_url": "data:image/jpeg;base64,...",
    "garment_image_url": "data:image/jpeg;base64,..."
  }
  ```
* **Response Output Format**:
  ```json
  {
    "image": {
      "url": "https://fal.media/files/.../output.jpg",
      "width": 768,
      "height": 1024,
      "content_type": "image/jpeg"
    }
  }
  ```

---

## 3. Implemented Provider Choices & Routing

Provider selection is managed through `factory.py` and configured via `AI_TRYON_PROVIDER`:

| Provider String in `.env` | Active Engine Instance | Model Endpoint | Cost per Inference |
| :--- | :--- | :--- | :--- |
| `AI_TRYON_PROVIDER=fal-fashn` | `CloudApiTryOnEngine` | `https://fal.run/fal-ai/fashn/tryon/v1.6` | $0.075 USD |
| `AI_TRYON_PROVIDER=fal-kolors` | `CloudApiTryOnEngine` | `https://fal.run/fal-ai/kling/v1-5/kolors-virtual-try-on` | $0.070 USD |
| `AI_TRYON_PROVIDER=huggingface` | `HuggingFaceVTONEngine` | Hugging Face IDM-VTON spaces | $0.000 (Free tier) |
| `AI_TRYON_PROVIDER=gemini` | `GeminiTryOnEngine` | Multimodal alpha-composite fallback | $0.001 USD |
| `AI_TRYON_PROVIDER=mock` | `MockTryOnEngine` | Local instant mock image | $0.000 USD |

---

## 4. Files Modified / Created

1. [backend/app/core/config.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/core/config.py):
   - Added `FAL_KEY: str = ""` setting to Pydantic `Settings`.
2. [.env.example](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/.env.example):
   - Added `FAL_KEY=""` placeholder and updated documentation on supported provider values.
3. [backend/app/services/tryon/cloud_engine.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/cloud_engine.py):
   - Implemented fal.ai REST request builders for `fal-fashn` and `fal-kolors`.
   - Added `Authorization: Key <FAL_KEY>` header resolution.
   - Added autonomous category mapping for Indian sarees (`one-pieces`) and Western apparel (`tops`).
   - Added response parsers for both `{images: [{url}]}` and `{image: {url}}`.
   - Downloaded resulting image bytes automatically into memory for storage.
   - Categorized non-retryable errors (401 Auth, 403 Forbidden, 402 Insufficient Balance, 422 Invalid Input) to prevent accidental billing loops.
   - Configured exponential backoff for 429 rate-limiting and 5xx network errors.
4. [backend/app/services/tryon/factory.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/app/services/tryon/factory.py):
   - Routed `fal-fashn` and `fal-kolors` to configured `CloudApiTryOnEngine` instances.
5. [backend/tests/test_cloud_adapter.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/tests/test_cloud_adapter.py):
   - Authored 12 unit tests verifying payloads, headers, image downloads, 401/402/403/422/429/timeout handling, and credential safety without calling external APIs.
6. [backend/run_fal_shootout.py](file:///c:/Users/nithy/Videos/MNV's/nexooai-saree-tryon/backend/run_fal_shootout.py):
   - Created safe standalone benchmark script supporting `--dry-run` and `--live`.

---

## 5. Automated Test Results

* **Backend Test Suite Execution**:
  ```bash
  backend\venv\Scripts\python.exe -m pytest backend\tests -v
  ```
* **Summary**: **29 PASSED out of 29 tests** in 8.95 seconds (100% pass rate).
* **Test Breakdown**:
  - `test_cloud_adapter.py`: **12/12 PASSED** (Covering FASHN payloads, Kolors payloads, category mapping, 401, 402, 403, 422, 429, timeouts, malformed responses, factory routing, credential confidentiality).
  - `test_tryon.py`: **4/4 PASSED** (Consent rejection, MIME validation, QR token generation, pose validation).
  - `test_catalog.py`: **5/5 PASSED** (Catalog pagination, filters, SKU detail, vector similarity, category list).
  - `test_admin.py`: **4/4 PASSED** (Telemetry metrics, SKU uniqueness, catalog toggle, job retry).
  - `test_retention_and_tokens.py`: **3/3 PASSED** (Token hashing, expiry checks, media storage purge).
  - `test_health.py`: **1/1 PASSED** (Health status and provider metadata).

---

## 6. Setup Instructions for the User

1. Log in to [fal.ai](https://fal.ai/) and generate an API Key from your dashboard.
2. Open your local `.env` file (`c:\Users\nithy\Videos\MNV's\nexooai-saree-tryon\.env`).
3. Add your key:
   ```env
   FAL_KEY=your_actual_fal_key_here
   ```
4. **Important**:
   - Never paste your key into the chat.
   - `.env` is strictly excluded by `.gitignore` and will never be committed to Git.

---

## 7. Dry-Run Benchmark Results

The dry-run verification was executed using:
```powershell
backend\venv\Scripts\python.exe backend/run_fal_shootout.py --dry-run
```

### Verified Output:
```text
===========================================================================
 NeXooAi fal.ai Benchmark Shootout - DRY-RUN VALIDATION
===========================================================================

[1] fal.ai Credentials Status:
    - FAL_KEY configured: False
    - Key status: MISSING (Please configure FAL_KEY in .env before running --live)

[2] Verifying Benchmark Assets:
    [OK] Person Model:    896x1200 px (488.6 KB) - backend/app/static/benchmark_model.jpg
    [OK] Saree Asset:     700x1050 px (98.4 KB)  - backend/app/static/sarees/real_kanchipuram.jpg
    [OK] Western Asset:   700x1049 px (69.3 KB)  - backend/app/static/sarees/m-dhoti-006.jpg
         (Note: File 'm-dhoti-006.jpg' contains the Tailored Chambray Shirt matching SKU M-SHIRT-006)

[3] Candidate Models & Endpoints:
    Candidate A: FASHN v1.6
      - Endpoint:    https://fal.run/fal-ai/fashn/tryon/v1.6
      - Cost/Run:    $0.075 USD
      - Auth Header: Key <FAL_KEY>
    Candidate B: Kling Kolors Virtual Try-On v1.5
      - Endpoint:    https://fal.run/fal-ai/kling/v1-5/kolors-virtual-try-on
      - Cost/Run:    $0.070 USD
      - Auth Header: Key <FAL_KEY>

[4] Validating Payload Construction:
    [OK] FASHN Saree Payload: category='one-pieces', mode='performance'
    [OK] Kolors Saree Payload: human_image_url length=667091, garment_image_url length=134307
    [OK] FASHN Western Payload: category='tops'
    [OK] Kolors Western Payload: human_image_url length=667091

[5] Cost Estimate for Live Shootout:
    - FASHN v1.6 (2 runs):       $0.150 USD
    - Kling Kolors v1.5 (2 runs): $0.140 USD
    - Total Estimated Cost:      $0.290 USD (~Rs 24.00 INR)

===========================================================================
 [OK] DRY-RUN SUCCESSFUL: All input assets, configurations & payloads verified.
      ZERO external API requests were made. ZERO credits were spent.
===========================================================================
```

---

## 8. Exact Command for Live Shootout

When you have saved your `FAL_KEY` in `.env` and are ready to execute the live benchmark, run:

```powershell
backend\venv\Scripts\python.exe backend/run_fal_shootout.py --live
```

### Maximum Cost:
* **Total Generations**: 4 runs
  1. FASHN v1.6 $\times$ Kanchipuram Silk Saree ($0.075)
  2. Kling Kolors v1.5 $\times$ Kanchipuram Silk Saree ($0.070)
  3. FASHN v1.6 $\times$ Chambray Western Shirt ($0.075)
  4. Kling Kolors v1.5 $\times$ Chambray Western Shirt ($0.070)
* **Maximum Total Cost**: **$0.29 USD** (~₹24.00 INR).

Output images will be saved under the Git-ignored directory: `media/shootout/`.

---

## 9. Remaining Limitations & Next Single Step

### Remaining Non-Blocking Items:
1. **Frontend Vitest Setup**: 6 Vitest tests fail due to missing `TestBed.initTestEnvironment` setup file in Vitest config (application production build and execution are unaffected).
2. **Admin Authentication**: Admin endpoints `/api/v1/admin/*` are functional with SQLite persistence but lack JWT/password enforcement middleware.

### Recommended Next Single Step:
**Add `FAL_KEY` to your local `.env` and grant approval to execute the 4-image live shootout (`--live`).**  
Once the images are generated in `media/shootout/`, we will inspect and compare the saree drape fidelity and face preservation side-by-side, determine the winner, and set it as the primary showroom engine.
