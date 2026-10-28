# NeXooAi — True 3D Saree R&D Brief and Feasibility Architecture

**Author:** NeXooAi Research & Core Graphics Engineering  
**Version:** 1.0 (Phase 7 Track)  
**Date:** 28 October 2026  
**Status:** Approved Technical Brief & Decision Record  

---

## 1. Executive Summary & Problem Formulation

In Indian ethnic retail, the Indian Saree represents an unstitched garment of 5.5 to 9 meters in length, draped with complex geometric pleats at the waist and an asymmetrical pallu falling over the shoulder.

Current 2D virtual try-on pipelines (such as FASHN and Kolors evaluated in Phase 2) perform neural image synthesis. While photorealistic in a static 2D portrait, they do not allow continuous rotational inspection or physical cloth deformation under motion.

Phase 7 defines the research track for **True 3D Real-Time WebGL/WebGPU Rendering** of Indian Sarees, establishing:
1. Fidelity definitions for silk drape, pleat compression, and metallic zari reflectance.
2. Capture pipelines from physical garment to optimized 3D glTF/GLB assets.
3. Realistic kiosk hardware constraints and cost-benefit trade-offs against Phase 6 motion experiences.

---

## 2. Technical Comparison: Phase 6 (Pseudo-3D) vs. Phase 7 (True 3D)

| Dimension | Phase 6: Premium Motion & 2.5D | Phase 7: True 3D Interactive Mesh |
|---|---|---|
| **Representation** | 8-angle turntable frames + 4-sec video clip | Rigged 3D mesh (glTF 2.0) with PBR materials |
| **Viewer Interaction** | Scrub 8 fixed viewpoints + drag reveal slider | Free 360° orbiter, zoom, light positioning |
| **Digitization Cost** | ₹0 per SKU (uses standard high-res photo) | ₹400 – ₹750 per SKU (photogrammetry scan + retopology) |
| **Per-Tryon Cost** | ₹0 (cached turntable) / $0.04 (optional catwalk) | ₹0 server compute (runs client-side WebGL) |
| **Kiosk GPU Requirement** | None (standard HTML5 video / canvas) | Dedicated GPU or Iris Xe (WebGL 2.0 / WebGPU) |
| **Drape Accuracy** | Pixel-accurate to real garment photo | Approximated via cloth simulation / skinned mesh |
| **Fabric Texture Fidelity**| 100% photographic silk texture | PBR texture maps (Albedo, Normal, Roughness, Metallic) |

---

## 3. Garment Modeling & Material Specifications

### 3.1 PBR Material Shading for Indian Textiles
A standard Blinn-Phong or basic PBR shader fails on traditional Indian silk because silk fibers exhibit subsurface scattering, sheen, and anisotropic reflections, while gold/silver zari exhibits specular metallic highlights.

```glsl
// Recommended GLSL Sheen + Anisotropic Specular formulation
vec3 calculateSilkZariBRDF(vec3 normal, vec3 viewDir, vec3 lightDir, vec3 albedo, float metallic, float roughness) {
    // 1. Dielectric Silk Base with Velvet/Sheen term
    vec3 halfVec = normalize(lightDir + viewDir);
    float NdotH = max(dot(normal, halfVec), 0.0);
    float NdotL = max(dot(normal, lightDir), 0.0);
    float NdotV = max(dot(normal, viewDir), 0.0);
    
    // Charlie Sheen model for silk fibers
    float sheen = pow(1.0 - NdotH, 4.0) * 0.45;
    
    // 2. Metallic Zari Highlights (Conductors)
    vec3 F0 = mix(vec3(0.04), albedo, metallic); // Pure Gold/Silver reflection
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(halfVec, viewDir), 0.0), 5.0);
    
    vec3 diffuse = (1.0 - metallic) * albedo * (1.0 / 3.14159) * NdotL;
    vec3 specular = F * (sheen + pow(NdotH, 1.0 / (roughness * roughness)));
    
    return diffuse + specular;
}
```

### 3.2 Mesh Polygon & Texture Budget for 55" Portrait Kiosk
To maintain a stable 60 fps on showroom kiosks:
- **Total Mesh Triangle Count:** <= 45,000 triangles (Mannequin body: 15k, Saree drape: 30k).
- **Texture Maps:** 2048x2048 pixels packed into standard glTF channel format:
  - Red: Ambient Occlusion
  - Green: Roughness
  - Blue: Metallic
- **Normal Map:** 2048x2048 DirectX/OpenGL standard normal with fine zari weave pattern.

---

## 4. Multi-Angle Photogrammetry Pipeline

```text
Physical Saree on Mannequin (Showroom Studio)
   │
   ▼
[Step 1] Multi-Angle 16-Camera Turntable Capture (360° at 22.5° intervals, 2 elevations)
   │
   ▼
[Step 2] Automated Background Removal & Color Correction (D65 Daylight Target)
   │
   ▼
[Step 3] NeRF / Gaussian Splatting -> Point Cloud -> Retopologized Low-Poly Mesh
   │
   ▼
[Step 4] UV Unwrapping & PBR Texture Extraction (Albedo, Normal, Sheen, Metallic)
   │
   ▼
[Step 5] glTF/GLB Export & Validation (Khronos 3D Validator)
```

---

## 5. Decision Record & Commercial Recommendation

### Recommendation: Hybrid "Tiered" Strategy
1. **Tier 1 (Flagship High-Ticket Sarees — Top 50 SKUs):**
   - Provide interactive 3D WebGL viewer using the proven pipeline above.
   - Justified by higher customer conversion margin on items priced > ₹25,000.
2. **Tier 2 (General Catalogue — 500 to 2,000 SKUs):**
   - Deploy Phase 6 multi-angle turntable (8-angle photos) and optional AI catwalk clips.
   - Cost: ₹0 digitization, instant deployment across any standard inventory photography.

### Go / No-Go Criteria for Catalogue-Wide True 3D:
- **Go:** If automated 3D mesh reconstruction cost drops below ₹100 per SKU, and kiosk frame rates consistently exceed 60 fps.
- **Current State:** Authorized for small premium pilot subset; Phase 6 handles the scalable mass volume.
