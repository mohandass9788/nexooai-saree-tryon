# NeXooAi Virtual Saree Try-On — Benchmark Scoring Rubric

> **Document Type**: Evaluation Rubric & Quality Criteria Specification  
> **Repository**: `mohandass9788/nexooai-saree-tryon`  
> **Target Models**: FASHN v1.6, Kling Kolors v1.5, HuggingFace IDM-VTON, Gemini 1.5 Flash  
> **Updated**: 2026-10-27  

---

## 1. Overview & Weighting Framework

In high-value Indian bridal and ethnic retail, a virtual try-on system is evaluated on authentic garment drape realism, fabric fidelity, and customer identity protection.

Every candidate generation is evaluated on a **1.0 to 5.0 scale** across 6 core criteria. An overall weighted score $\ge 4.0 / 5.0$ with zero fatal flaws (distorted face or severed limbs) is required for production sign-off.

$$\text{Final Score} = \sum_{i=1}^{6} (W_i \times S_i)$$

| Dimension | Metric | Weight ($W_i$) | Minimum Pass Threshold |
|---|---|---|---|
| **D1** | Border & Fabric Print Fidelity | **25%** | $\ge 4.0$ |
| **D2** | Pleat, Pallu & Saree Drape Geometry | **25%** | $\ge 4.0$ |
| **D3** | Face, Hair & Jewelry Preservation | **20%** | $\ge 4.5$ (Zero facial distortion) |
| **D4** | Body Proportions & Pose Realism | **15%** | $\ge 4.0$ |
| **D5** | Latency & Speed SLA | **10%** | $\le 15.0\text{s}$ (Score: 5.0 for $\le 8\text{s}$) |
| **D6** | Cost Efficiency & Failure Resilience | **5%** | $\le \$0.08 / \text{try}$ |

---

## 2. Dimension Detailed Scoring Scales (1.0 to 5.0)

### D1: Border & Fabric Print Fidelity (Weight: 25%)
- **5.0 (Flawless)**: Metallic gold zari retains authentic specular reflection; temple borders remain continuous and sharp along pleats; weave texture (brocade, jacquard, organza) is clearly discernible.
- **4.0 (Good)**: Border is sharp with minor compression along extreme folds; print pattern matches original catalogue photo closely.
- **3.0 (Acceptable)**: Border pattern blurs slightly at the waist pleats; color hue shifted by $\le 5\%$.
- **2.0 (Poor)**: Zari border smudges into body fabric; floral/ikat motifs are visibly warped or melted.
- **1.0 (Unusable)**: Border is completely missing, hallucinated with wrong colors, or rendered as flat wash.

---

### D2: Pleat, Pallu & Saree Drape Geometry (Weight: 25%)
- **5.0 (Flawless)**: Pallu naturally drapes over the left shoulder with realistic fabric gravity and folds; waist pleats (nivi drape) fan out correctly; fall and hemline touch near ankles realistically.
- **4.0 (Good)**: Authentic saree silhouette; pallu hangs naturally; slight smoothing on pleat depth.
- **3.0 (Acceptable)**: Looks like a saree but pleats resemble a stitched skirt without distinct fold lines.
- **2.0 (Poor)**: Garment resembles a generic Western wrap dress; pallu disappears behind torso awkwardly.
- **1.0 (Unusable)**: Saree texture floating unanchored or mapped onto legs as trousers.

---

### D3: Face, Hair & Jewelry Preservation (Weight: 20%)
*Crucial: Showroom customers reject photos if their face, bindi, nose-ring, or skin tone is altered.*
- **5.0 (Flawless)**: Face is 100% identical to input photo; hairline, earrings, necklaces, and bindi are completely preserved without blending artifacts.
- **4.0 (Good)**: Minor softening at hairline edges; facial features, teeth, and skin tone perfectly preserved.
- **3.0 (Borderline)**: Skin tone slightly over-saturated or smoothed (beauty filter effect); minor jewelry fading.
- **2.0 (Unacceptable)**: Noticeable facial distortion, blurred eyes, or skin tone bleached/altered.
- **1.0 (Fatal Flaw)**: Uncanny valley hallucination; altered identity; phantom extra ears or blurred face.

---

### D4: Body Proportions & Pose Realism (Weight: 15%)
- **5.0 (Flawless)**: Arms, fingers, neckline, and waist match the customer's true posture and proportions; natural fabric occlusion where arm rests over saree.
- **4.0 (Good)**: Natural proportions; minor finger boundary blending against fabric background.
- **3.0 (Acceptable)**: Mild stiffness at shoulders or arm boundary.
- **2.0 (Poor)**: Torso disproportionately stretched or compressed.
- **1.0 (Fatal Flaw)**: Phantom limb, fused hands, or severed anatomy.

---

### D5: Latency & Speed SLA (Weight: 10%)
Measured from request initiation to final result image download:
- **5.0**: $\le 8.0$ seconds (Delightful kiosk experience)
- **4.0**: $8.1 - 12.0$ seconds (Standard acceptable showroom wait)
- **3.0**: $12.1 - 15.0$ seconds (Tolerable with animated countdown)
- **2.0**: $15.1 - 25.0$ seconds (Excessive; risks kiosk abandon)
- **1.0**: $> 25.0$ seconds or Timeout

---

### D6: Cost Efficiency & Failure Resilience (Weight: 5%)
- **5.0**: Cost $\le \$0.04$ / inference; idempotency key prevents duplicate charges; auto-retries on 429.
- **4.0**: Cost $\$0.05 - \$0.08$ / inference; clean error categorization without credit waste on 4xx.
- **3.0**: Cost $\$0.08 - \$0.12$ / inference.
- **2.0**: Cost $> \$0.12$ / inference or unhandled timeout billing.
- **1.0**: Infinite billing loops on bad input images.

---

## 3. Decision Matrix & Sign-Off Criteria

| Verdict | Minimum Overall Score | Mandatory Hard Constraints |
|---|---|---|
| **Production Ready (Primary)** | $\ge 4.2 / 5.0$ | Face D3 $\ge 4.5$, Drape D2 $\ge 4.0$, Zero fatal anatomy errors, Latency $\le 15\text{s}$ |
| **Secondary / Fallback Engine** | $3.5 - 4.19 / 5.0$ | Face D3 $\ge 4.0$, Drape D2 $\ge 3.5$, Latency $\le 20\text{s}$ |
| **Reject / Development Only** | $< 3.5 / 5.0$ | Any fatal anatomy error or failure to drape full saree |
