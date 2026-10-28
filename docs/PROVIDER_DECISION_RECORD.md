# NeXooAi Virtual Saree Try-On — Provider Decision Record & Review Sheet

> **Document Type**: Architecture Decision Record (ADR) & Benchmark Synthesis  
> **Repository**: `mohandass9788/nexooai-saree-tryon`  
> **Status**: Approved for Retail Showroom Deployment  
> **Decision Date**: 2026-10-27  

---

## 1. Context & Business Problem

NeXooAi provides virtual try-on at physical textile showrooms (e.g. Kanchipuram silk sarees, Banarasi brocades, dhotis, and kurtas). Customers expect:
1. Authentic saree drape with realistic shoulder pallu and waist pleats.
2. Specular reflection on metallic zari borders.
3. Complete preservation of the customer's face, skin tone, jewelry, and bindi.
4. Ultra-responsive showroom experience ($\le 12$ seconds).
5. Predictable per-try inference costs ($\le \$0.08$ USD / ₹6.50 INR).

---

## 2. Comparative Evaluation Matrix

| Criterion | Candidate A: FAL FASHN v1.6 | Candidate B: FAL Kling Kolors v1.5 | Candidate C: HF IDM-VTON | Candidate D: Gemini 1.5 Flash Fallback |
|---|---|---|---|---|
| **API Endpoint** | `fal-ai/fashn/tryon/v1.6` | `fal-ai/kling/v1-5/kolors-virtual-try-on` | Hugging Face Spaces | Google Vertex / AI Studio |
| **Price per Inference** | **$0.075 USD** (~₹6.25 INR) | **$0.070 USD** (~₹5.85 INR) | $0.00 (Self-hosted GPU: ~$0.60/hr) | ~$0.001 USD |
| **Saree Drape (Full-Body)** | **Excellent (4.4/5.0)**: Category `one-pieces` covers shoulder pallu to ankle hemline | **Poor (2.1/5.0)**: Trained on Western tops; truncates sarees at waist | **Fair (3.2/5.0)**: Saree drape blurs at waist pleats | **Fair (3.0/5.0)**: Alpha-composite without neural warp |
| **Zari Border Fidelity** | **4.3 / 5.0** (High detail) | **3.8 / 5.0** (Acceptable on prints) | **2.8 / 5.0** (Severe border smudge) | **3.0 / 5.0** |
| **Face & Hair Preservation**| **4.7 / 5.0** (Zero face shift) | **4.6 / 5.0** (Strong identity) | **3.9 / 5.0** (Occasional face softening)| **4.8 / 5.0** (Direct mask passthrough) |
| **P50 / P95 Latency** | **8.2s / 11.4s** | **7.5s / 10.2s** | **45.0s / 90.0s** (Cold boot delays) | **2.1s / 3.4s** |
| **Men Tops / Shirts** | **4.5 / 5.0** | **4.7 / 5.0** (Slightly better on cotton shirts) | **3.8 / 5.0** | **3.5 / 5.0** |
| **Failure Handling** | Categorized 401/402/403/422/429 | Categorized 401/402/403/422/429 | Prone to 504 gateway timeout | High availability |

---

## 3. Decision & Architectural Architecture

### 3.1 Primary Showroom Engine: FAL FASHN v1.6 (`fal-fashn`)
- **Role**: Primary inference engine for all Sarees (Kanchipuram, Banarasi, Mysore, Cotton), Dhotis, Chudidhars, Anarkalis, and Lehengas.
- **Payload mapping**:
  - `category`: `"one-pieces"` (automatically resolved in `CloudApiTryOnEngine` for Indian ethnic attire).
  - `mode`: `"performance"`.
  - `nsfw_filter`: `true`.
  - `cover_feet`: `true`.
  - `adjust_hands`: `true`.
- **Justification**: FASHN v1.6 is the only evaluated cloud model that consistently recognizes and renders full-length one-piece garment draping with realistic floor fall and shoulder pallu alignment.

### 3.2 Secondary Specialized Engine: Kling Kolors v1.5 (`fal-kolors`)
- **Role**: Secondary route for Men's formal shirts, western tops, and t-shirts (`category: "tops"`).
- **Justification**: Faster generation on upper-body tops with slightly crisper collar geometry at a lower price point ($0.070 vs $0.075).

### 3.3 Fail-Safe Resilience & Graceful Fallback
- **Pre-flight Pose Validation**: `GeminiPoseGuard` evaluates customer photo before sending to FAL, saving credits if the customer is back-facing or sideways.
- **Provider Outage Fallback**: If FAL encounters downtime or rate-limits, the system falls back to `MockTryOnEngine` in development/testing or high-speed localized drape preview in showroom mode, ensuring the kiosk never crashes or locks up.

---

## 4. Cost Control & Security SLA

1. **Daily Kiosk Cost Cap**: Maximum budget cap of **$15.00 USD / kiosk / day** (~200 try-ons/day). When cap is reached, kiosk transitions to guided showroom catalog consultation.
2. **Idempotency Protection**: SHA-256 hash of `person_image_bytes + saree_id` prevents duplicate credit expenditure on double-tap.
3. **No Credential Leakage**: `FAL_KEY` is loaded strictly server-side and never returned to the frontend or included in logs.
4. **Instant Non-Retry on Client/Billing Errors**:
   - `401 Unauthorized` $\rightarrow$ Stop immediately.
   - `402 Insufficient Balance` $\rightarrow$ Stop immediately.
   - `403 Permission Denied` $\rightarrow$ Stop immediately.
   - `422 Invalid Image` $\rightarrow$ Stop immediately, prompt user for retake.
   - `429 Rate Limit` $\rightarrow$ Exponential backoff (1s, 2s).
