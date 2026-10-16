import os
import time
import uuid
import base64
import logging
from typing import Dict, Any, Optional
import httpx

from backend.app.core.config import settings
from backend.app.core.system_settings import get_setting
from backend.app.services.tryon.base import BaseTryOnEngine, TryOnEngineResult
from backend.app.services.tryon.prompts import generate_openai_tryon_prompt

logger = logging.getLogger("tryon.openai_engine")


class OpenAITryOnEngine(BaseTryOnEngine):
    """
    Virtual Try-On Engine adapter using OpenAI GPT-4o Multimodal Vision & DALL-E Image Generation.
    Provides fallback / dual-image synthesis when configured.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or get_setting("openai_api_key") or os.getenv("OPENAI_API_KEY", "")

    async def process_tryon(
        self,
        person_image_bytes: bytes,
        saree_image_bytes: bytes,
        options: Optional[Dict[str, Any]] = None,
    ) -> TryOnEngineResult:
        start_time = time.time()
        options = options or {}
        name_en = options.get("name_en", "Indian Silk Saree")
        category = options.get("category", "Bridal Silk")

        if not self.api_key:
            return TryOnEngineResult(
                status="failed",
                provider_name="openai",
                provider_job_id=f"openai_cfg_{uuid.uuid4().hex[:8]}",
                error_code="PROVIDER_CREDENTIALS_MISSING",
                error_message="OpenAI API Key is not configured. Please enter your API key in Admin Settings.",
                processing_time_ms=int((time.time() - start_time) * 1000),
            )

        try:
            # We can use OpenAI DALL-E 3 image edit or multimodal response
            # Prepare payload for OpenAI image generation/edit
            person_b64 = base64.b64encode(person_image_bytes).decode("utf-8")
            saree_b64 = base64.b64encode(saree_image_bytes).decode("utf-8") if saree_image_bytes else ""

            prompt = generate_openai_tryon_prompt(options)

            # Test connection / generate image via DALL-E 3 endpoint
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": "dall-e-3",
                "prompt": prompt,
                "n": 1,
                "size": "1024x1024",
                "response_format": "b64_json",
            }

            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post("https://api.openai.com/v1/images/generations", headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    b64_out = data["data"][0]["b64_json"]
                    result_bytes = base64.b64decode(b64_out)
                    duration_ms = int((time.time() - start_time) * 1000)
                    return TryOnEngineResult(
                        status="completed",
                        provider_name="openai",
                        provider_job_id=f"openai_{uuid.uuid4().hex[:10]}",
                        result_image_bytes=result_bytes,
                        processing_time_ms=duration_ms,
                        estimated_cost_usd=0.040,
                    )
                else:
                    err_msg = resp.text
                    try:
                        err_json = resp.json()
                        err_msg = err_json.get("error", {}).get("message", resp.text)
                    except Exception:
                        pass
                    return TryOnEngineResult(
                        status="failed",
                        provider_name="openai",
                        provider_job_id=f"openai_err_{uuid.uuid4().hex[:8]}",
                        error_code="OPENAI_API_ERROR",
                        error_message=f"OpenAI error: {err_msg}",
                        processing_time_ms=int((time.time() - start_time) * 1000),
                    )

        except Exception as e:
            logger.exception("Error in OpenAI Try-On processing: %s", e)
            return TryOnEngineResult(
                status="failed",
                provider_name="openai",
                provider_job_id=f"openai_exc_{uuid.uuid4().hex[:8]}",
                error_code="OPENAI_EXECUTION_ERROR",
                error_message=str(e),
                processing_time_ms=int((time.time() - start_time) * 1000),
            )
