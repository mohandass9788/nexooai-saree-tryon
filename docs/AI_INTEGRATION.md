# AI Try-On Integration Strategy — NeXooAi Virtual Saree Try-On

## 1. Overview & Hardware Rationale
Virtual Try-On (VTON) models (e.g. IDM-VTON, CatVTON, OOTDiffusion) are deep diffusion pipelines that require at least 8 GB to 16 GB+ VRAM for acceptable inference speed and high-resolution clothing drape.

Because the development environment is an **NVIDIA GTX 1650 with 4 GB VRAM**, local execution of heavy diffusion models is not feasible without extreme memory thrashing. 

Therefore, NeXooAi employs an **Adapter Architecture**:
1. **Initial / Production Default**: Hosted Cloud Virtual Try-On API (Fashn.ai, Replicate, Fal.ai, or dedicated cloud GPU server).
2. **Local Testing / Development**: In-memory `MockTryOnEngine` generating composite test images with latency simulation.
3. **Future Extensibility**: In-house microservice on dedicated multi-GPU cloud hardware (e.g., A10G / A100), pluggable via the same interface.

---

## 2. Adapter Pattern Implementation
All AI providers implement the abstract class `BaseTryOnEngine`:

```python
from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseTryOnEngine(ABC):
    @abstractmethod
    async def process_tryon(
        self,
        person_image_bytes: bytes,
        saree_image_bytes: bytes,
        options: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Receives raw image bytes and returns a dictionary containing:
        - status: "completed" | "processing" | "failed"
        - result_image_bytes: Optional[bytes]
        - provider_job_id: str
        - processing_time_ms: int
        - estimated_cost: float
        """
        pass
```

### Supported / Planned Engines
- `mock`: Instant or delayed composite generator for UI/API testing without external API costs.
- `fashn`: High-fidelity garment try-on API with garment-category mapping (`tops`, `bottoms`, `one-pieces`).
- `replicate`: Open-source IDM-VTON / CatVTON deployed on serverless GPUs.
- `custom_cloud`: Private dedicated FastAPI inference server running optimized diffusion weights.

---

## 3. Input Validation & Preprocessing
To minimize API provider rejections and costs, the backend validates:
- **Image Format**: JPEG, PNG, WEBP only.
- **Max File Size**: 10 MB per image.
- **Resolution**: Resized automatically to standard inference aspect ratios (e.g., 768x1024 or 1024x1024) using Pillow.
- **Aspect Ratio**: Warning issued if extreme panoramic images are submitted.
