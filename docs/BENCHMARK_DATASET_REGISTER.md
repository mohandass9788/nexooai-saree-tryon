# NeXooAi Virtual Saree Try-On — Benchmark Dataset Register

> **Document Type**: Dataset Specification & Test Catalog Register  
> **Repository**: `mohandass9788/nexooai-saree-tryon`  
> **Status**: Approved & Consent-Cleared  
> **Updated**: 2026-10-27  

---

## 1. Overview & Purpose

To ensure objective, bias-free, and culturally authentic evaluation of virtual try-on providers (FASHN, Kling Kolors, IDM-VTON, Gemini), this register establishes a standardized benchmark dataset of:
1. **25 Garment Products** spanning high-difficulty silk weaves, delicate prints, metallic zari borders, sheer fabrics, and male/kids garments.
2. **6 Model Demographic Profiles** reflecting realistic South Indian and pan-Indian customer diversity across heights, skin tones, body shapes, and ambient lighting conditions.

All model images and catalog garment photos in this register are strictly consent-cleared, synthetic, or showroom-licensed for benchmark use.

---

## 2. Product Catalog Benchmark Register (25 Products)

| # | SKU | Garment Name | Category | Fabric / Weave | Primary Color | Border & Pallu Details | Drape Complexity |
|---|---|---|---|---|---|---|---|
| 01 | `KAN-SILK-001` | Kanchipuram Temple Border Silk | Bridal Silk | Pure Mulberry Silk | Crimson Red / Gold | Heavy Korvai Zari temple border; rich peacock pallu | High (Stiff silk, rich pallu) |
| 02 | `KAN-SILK-002` | Kanchipuram Mayilkan Brocade | Bridal Silk | Silk Brocade | Royal Blue / Gold | Wide Mayilkan (peacock eye) zari border | High (Structured drape) |
| 03 | `BAN-SILK-003` | Banarasi Katan Jangla Saree | Banarasi Silk | Pure Katan Silk | Emerald Green | Dense gold zari floral jal with scalloped border | High (Dense pattern alignment) |
| 04 | `BAN-SILK-004` | Banarasi Tanchoi Weave | Banarasi Silk | Tanchoi Silk | Magenta Pink | Dual-tone subtle zari satin finish | Medium (Soft reflection) |
| 05 | `MYS-SILK-005` | Mysore Crepe Silk Saree | Mysore Silk | Crepe Silk | Deep Maroon | Minimalist gold kasuti border, plain body | Low-Medium (Fluid drape) |
| 06 | `MYS-SILK-006` | Mysore Georgette Gold Floral | Mysore Silk | Silk Georgette | Mustard Yellow | Delicate floral zari motifs along pleated border | Medium (Sheer & flowy) |
| 07 | `COT-HAND-007` | Chettinad Kandangi Cotton | Cotton Sarees | Handloom Cotton | Mustard & Black | Bold contrasting checks, thick temple borders | Medium (Crisp drape) |
| 08 | `COT-CHAND-008`| Chanderi Cotton Silk | Cotton Sarees | Cotton-Silk Blend | Pastel Mint Green | Golden tissue border with bootis | Low-Medium (Translucent) |
| 09 | `COT-KOTA-009` | Kota Doria Printed Saree | Cotton Sarees | Fine Kota Cotton | Peach / Coral | Khat weave check texture, floral block print | Medium (Geometric texture) |
| 10 | `ART-SILK-010` | Digital Floral Poly-Silk | Daily Wear | Polyester Silk | Turquoise | Contemporary digital watercolor floral print | Low (Fluid drape) |
| 11 | `TUS-SILK-011` | Pure Tussar Hand-Painted | Heritage Silk | Wild Tussar Silk | Natural Beige / Multi | Hand-painted Madhubani motifs on pallu | High (Irregular artisan art) |
| 12 | `PAI-SILK-012` | Paithani Royal Peacock Saree | Paithani Silk | Mulberry Silk | Wine Purple | Oblique square border, kaleidoscopic mor pallu | High (Multi-colored silk zari) |
| 13 | `ORG-EMB-013` | Organza Zardozi Embroidered | Party Wear | Sheer Organza | Lavender | Scalloped silver zardozi beadwork border | Very High (Sheer transparency) |
| 14 | `LIN-ZARI-014` | Organic Linen Zari Saree | Linen Sarees | 100-count Linen | Charcoal Grey / Rose | Silver metallic pinstripe border | Medium (Structured wrinkles) |
| 15 | `PAT-IKAT-015` | Pochampally Ikat Silk Saree | Handloom Silk | Double Ikat Silk | Electric Orange / Black | Intricate geometric warp/weft ikat patterns | High (Pattern continuity) |
| 16 | `CHUDI-ANAR-016`| Floor-Length Anarkali Suit | Chudidhar | Georgette / Shantoon | Royal Navy | Heavy neckline embroidery + dupatta drape | Medium (Full flare) |
| 17 | `CHUDI-STR-017`| Straight Cut Cotton Chudi | Chudidhar | Cambric Cotton | Powder Blue | Printed floral kurta with solid pant & chiffon dupatta | Low (Straight lines) |
| 18 | `LEH-BRID-018` | Heavy Velvet Bridal Lehenga | Bridal Wear | Micro Velvet | Maroon & Gold | Extensive kalidar skirt with cancan volume | High (Volumetric silhouette) |
| 19 | `DHOTI-MEN-019`| Kasavu Double Dhoti & Angavastram | Men Dhoti | Fine Cotton / Zari | Off-White / Gold | 2-inch pure gold kasavu border | Medium (Pleated waist drape) |
| 20 | `DHOTI-SILK-020`| Kanchipuram Silk Pattu Veshti | Men Dhoti | Pure Silk | Cream / Red Zari | Rich Mayilkan silk zari border | Medium (Traditional fold) |
| 21 | `KURTA-MEN-021`| Raw Silk Mandarin Kurta | Men Kurta | Raw Silk (Dupion) | Rust Orange | Thread-embroidered mandarin collar | Low (Structured top) |
| 22 | `SHIRT-MEN-022`| Tailored Chambray Formal Shirt | Men Tops | Egyptian Cotton | Sky Blue | Classic spread collar, button-down placket | Low (Standard top) |
| 23 | `KIDS-PAV-023` | Pure Silk Pattu Pavadai Set | Kids Wear | Silk & Brocade | Fuchsia & Mustard | Pleated pattu skirt with contrast blouse | Medium (Youth proportions) |
| 24 | `KIDS-DHOT-024`| Kids Dhoti & Kurta Set | Kids Wear | Cotton Silk | Mint Green | Elasticated waist dhoti with zari border | Low (Kids fit) |
| 25 | `WEST-GOWN-025`| Contemporary Evening Silk Gown | Western Gown | Silk Satin | Emerald Green | Asymmetric neckline with side drape | Medium (Bias drape) |

---

## 3. Standardized Model Demographics (6 Test Profiles)

| Profile ID | Gender | Apparent Age | Complexion (Fitzpatrick) | Height & Build | Hair & Framing | Lighting Setup |
|---|---|---|---|---|---|---|
| `MDL-01` | Female | 26–30 yrs | Type IV (Olive / Wheatish) | 165 cm, Slim | Long hair tied back; front-facing hands at side | Studio Softbox (High-key) |
| `MDL-02` | Female | 35–40 yrs | Type V (Deep Brown) | 158 cm, Medium / Curvy | Hair open over shoulder; slight side angle (10°) | Warm Showroom Halogen |
| `MDL-03` | Female | 22–25 yrs | Type III (Fair / Light Wheatish) | 170 cm, Athletic | Braided hair with flowers; front full-body | Diffused Ambient Natural |
| `MDL-04` | Male | 30–35 yrs | Type IV (Medium Brown) | 178 cm, Broad Shoulder | Short hair, clean shave; upright posture | Studio 3-point Key Light |
| `MDL-05` | Girl (Kid)| 7–9 yrs | Type IV (Wheatish) | 125 cm, Slender | Two pigtails; cheerful standing pose | High-key Bright Retail |
| `MDL-06` | Female | 45–50 yrs | Type V (Rich Brown) | 155 cm, Mature / Traditional | Hair bun with bindi; traditional posture | Standard Kiosk Ring-Light |

---

## 4. Benchmark Asset File Specifications

1. **Resolution**: All model images standard 9:16 aspect ratio (`864x1536` or `768x1365` pixels minimum).
2. **Format**: High-quality JPEG (`q=90`) or Lossless WebP.
3. **Background**: Neutral showroom backdrop or clean gradient, minimizing segmentation artifacts.
4. **Validation Checksum**: SHA-256 registered for every asset before benchmark execution to guarantee reproducibility.
