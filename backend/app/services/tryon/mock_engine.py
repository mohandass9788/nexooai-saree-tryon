import io
import time
import uuid
from typing import Dict, Any, Optional
from pathlib import Path
from PIL import Image, ImageDraw
from backend.app.services.tryon.base import BaseTryOnEngine, TryOnEngineResult


class MockTryOnEngine(BaseTryOnEngine):
    """
    Mock Try-On Engine for local development and automated testing.
    Uses local benchmark test/demo assets when available to provide realistic
    try-on previews without invoking external AI APIs or incurring costs.
    """

    def __init__(self, simulate_latency_sec: float = 0.2):
        self.simulate_latency_sec = simulate_latency_sec

    async def process_tryon(
        self,
        person_image_bytes: bytes,
        saree_image_bytes: bytes,
        options: Optional[Dict[str, Any]] = None,
    ) -> TryOnEngineResult:
        start_time = time.time()

        try:
            # Check for local fal.ai benchmark demo assets
            options_dict = options or {}
            category = options_dict.get("category", "").lower()
            name_en = options_dict.get("name_en", "").lower()
            combined = f"{category} {name_en}"

            # Locate local benchmark output assets across candidate locations
            resolved_p = Path(__file__).resolve()
            search_dirs = [
                resolved_p.parents[4] / "media" / "shootout",
                resolved_p.parents[3] / "media" / "shootout",
                Path("media/shootout").resolve(),
                Path("./media/shootout").resolve(),
            ]
            base_dir = next((d for d in search_dirs if d.is_dir()), None)
            result_bytes = None

            # If saree_image_bytes is provided, dynamically render realistic virtual drape
            # using the customer's actual photo and the selected/uploaded saree colors & pattern
            if saree_image_bytes and len(saree_image_bytes) > 0:
                from backend.app.services.image.drape_renderer import render_realistic_tryon_drape
                garment_title = options_dict.get("name_en") or options_dict.get("name_ta") or "Showroom Saree"
                garment_price = options_dict.get("price") or "Showroom Collection"
                result_bytes = render_realistic_tryon_drape(
                    person_image_bytes=person_image_bytes,
                    saree_image_bytes=saree_image_bytes,
                    category=category,
                    garment_name=garment_title,
                    price=garment_price,
                )

            # Fallback to local fal.ai benchmark demo assets only if no saree image bytes provided
            if result_bytes is None and base_dir:
                import re
                words = set(re.findall(r"\b\w+\b", combined.lower()))
                western_keywords = {"shirt", "shirts", "top", "tops", "men", "mens", "western", "kurta", "chambray"}
                is_western = bool(words & western_keywords)
                candidates = (
                    ["kolors_western_shirt.jpg", "fashn_western_shirt.jpg"]
                    if is_western
                    else ["kolors_kanchipuram_saree.jpg", "fashn_kanchipuram_saree.jpg"]
                )
                for cand_name in candidates:
                    target_file = base_dir / cand_name
                    if target_file.is_file():
                        with open(target_file, "rb") as cf:
                            result_bytes = cf.read()
                        if result_bytes:
                            break

            if result_bytes is None:
                # Load person image
                person_img = Image.open(io.BytesIO(person_image_bytes)).convert("RGB")
                width, height = person_img.size

                # Draw a simulated styling preview banner on image
                draw = ImageDraw.Draw(person_img)
                banner_height = max(40, int(height * 0.08))
                draw.rectangle(
                    [(0, height - banner_height), (width, height)],
                    fill=(20, 20, 20)
                )
                draw.text(
                    (20, height - banner_height + 10),
                    "NeXooAi Virtual Saree Preview [SIMULATED]",
                    fill=(255, 215, 0)
                )

                # Export back to JPEG bytes
                output_buffer = io.BytesIO()
                person_img.save(output_buffer, format="JPEG", quality=90)
                result_bytes = output_buffer.getvalue()

            duration_ms = int((time.time() - start_time) * 1000)

            return TryOnEngineResult(
                status="completed",
                provider_name="mock",
                provider_job_id=f"mock_{uuid.uuid4().hex[:12]}",
                result_image_bytes=result_bytes,
                processing_time_ms=duration_ms,
                estimated_cost_usd=0.0,
            )

        except Exception as e:
            return TryOnEngineResult(
                status="failed",
                provider_name="mock",
                provider_job_id=f"mock_err_{uuid.uuid4().hex[:8]}",
                error_code="MOCK_PROCESSING_ERROR",
                error_message=str(e),
                processing_time_ms=int((time.time() - start_time) * 1000),
            )
