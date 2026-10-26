import os
import time
import uuid
import base64
import asyncio
import logging
from typing import Dict, Any, Optional
import httpx
from backend.app.core.config import settings
from backend.app.core.system_settings import get_setting
from backend.app.services.tryon.base import BaseTryOnEngine, TryOnEngineResult

logger = logging.getLogger("tryon.cloud_engine")


class CloudApiTryOnEngine(BaseTryOnEngine):
    """
    Hosted Cloud Virtual Try-On API Adapter.
    Supports fal.ai (FASHN v1.6, Kling Kolors v1.5), Replicate, and direct cloud endpoints with:
    - Clean payload mapping for both models.
    - Exponential backoff retries avoiding duplicate billing on client errors.
    - Safe error categorization without secret leakage.
    - Processing duration & estimated cost tracking.
    """

    PROVIDER_COST_MAP = {
        "fal-fashn": 0.075,
        "fal-kolors": 0.070,
        "fashn": 0.075,
        "fal": 0.075,
        "replicate": 0.035,
        "cloud": 0.03,
    }

    PROVIDER_DEFAULT_URL_MAP = {
        "fal-fashn": "https://fal.run/fal-ai/fashn/tryon/v1.6",
        "fal-kolors": "https://fal.run/fal-ai/kling/v1-5/kolors-virtual-try-on",
        "fashn": "https://fal.run/fal-ai/fashn/tryon/v1.6",
        "replicate": "https://api.replicate.com/v1/predictions",
    }

    def __init__(
        self,
        provider_name: str = "fal-fashn",
        api_key: Optional[str] = None,
        api_url: Optional[str] = None,
        timeout: Optional[int] = None,
        max_retries: Optional[int] = None,
    ):
        self.provider_name = provider_name.lower().strip()

        # 1. Resolve API Key safely from parameters, settings, or environment
        if api_key is not None:
            self.api_key = api_key
        elif self.provider_name in ("fal-fashn", "fal-kolors", "fal", "fashn"):
            self.api_key = (
                getattr(settings, "FAL_KEY", "")
                or settings.AI_TRYON_API_KEY
                or os.getenv("FAL_KEY", "")
                or os.getenv("AI_TRYON_API_KEY", "")
            )
        else:
            self.api_key = settings.AI_TRYON_API_KEY or os.getenv("AI_TRYON_API_KEY", "")

        # 2. Resolve API Endpoint
        if api_url is not None:
            self.api_url = api_url
        elif settings.AI_TRYON_API_URL:
            self.api_url = settings.AI_TRYON_API_URL
        else:
            self.api_url = self.PROVIDER_DEFAULT_URL_MAP.get(self.provider_name, "")

        self.timeout = timeout or settings.AI_TRYON_TIMEOUT_SECONDS
        self.max_retries = max_retries or settings.AI_TRYON_MAX_RETRIES

    def _get_estimated_cost(self) -> float:
        return self.PROVIDER_COST_MAP.get(self.provider_name, 0.03)

    def _prepare_payload(
        self, person_image_bytes: bytes, saree_image_bytes: bytes, options: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Formats the payload according to the specific vendor API schema.
        Encodes images safely to base64 data URIs.
        """
        person_b64 = base64.b64encode(person_image_bytes).decode("utf-8")
        saree_b64 = (
            base64.b64encode(saree_image_bytes).decode("utf-8")
            if saree_image_bytes
            else ""
        )

        if self.provider_name in ("fal-fashn", "fashn"):
            # Autonomous category resolution for Indian attire & Western apparel
            category = options.get("category", "")
            garment_title = options.get("name_en", "")
            combined_text = f"{category} {garment_title}".lower()

            if any(k in combined_text for k in ("saree", "silk", "dhoti", "chudi", "pavadai", "dress", "suit", "bridal", "one-piece", "gown")):
                fashn_category = "one-pieces"
            elif any(k in combined_text for k in ("pant", "trouser", "skirt", "bottom", "veshti")):
                fashn_category = "bottoms"
            elif any(k in combined_text for k in ("shirt", "top", "kurta", "blazer", "t-shirt")):
                fashn_category = "tops"
            else:
                fashn_category = "auto"

            # Check if using direct FASHN.ai API (with fa-... key or direct URL)
            is_direct_fashn = bool(self.api_key and self.api_key.startswith("fa-")) or "api.fashn.ai" in (self.api_url or "")

            if is_direct_fashn:
                is_tryon_max = str(get_setting("feature_tryon_max", "false")).lower() == "true" or options.get("model_name") == "tryon-max"
                is_privacy_b64 = str(get_setting("feature_privacy_base64", "false")).lower() == "true"
                is_portrait_916 = str(get_setting("feature_portrait_916", "true")).lower() == "true"
                saree_prompt = str(get_setting("saree_pleat_prompt", "traditional Indian silk saree drape, pleated pallu pinned neatly over left shoulder, crisp zari border, matching blouse"))
                resolution = str(get_setting("fashn_resolution", "1k"))
                gen_mode = str(get_setting("fashn_generation_mode", "balanced"))

                if is_tryon_max:
                    # FASHN OpenAPI 3.1.1: TryOnMaxRequest
                    inputs = {
                        "model_image": f"data:image/jpeg;base64,{person_b64}",
                        "product_image": f"data:image/jpeg;base64,{saree_b64}" if saree_b64 else "",
                        "prompt": saree_prompt,
                        "resolution": resolution,
                        "generation_mode": gen_mode,
                        "output_format": "png",
                        "return_base64": is_privacy_b64,
                    }
                    if is_portrait_916:
                        inputs["aspect_ratio"] = "9:16"
                    return {
                        "model_name": "tryon-max",
                        "inputs": inputs,
                    }
                else:
                    # FASHN OpenAPI 3.1.1: TryOnRequest (tryon-v1.6)
                    return {
                        "model_name": "tryon-v1.6",
                        "inputs": {
                            "model_image": f"data:image/jpeg;base64,{person_b64}",
                            "garment_image": f"data:image/jpeg;base64,{saree_b64}" if saree_b64 else "",
                            "category": fashn_category,
                            "mode": options.get("mode", "performance"),
                            "segmentation_free": True,
                            "moderation_level": "permissive",
                            "output_format": "png",
                            "return_base64": is_privacy_b64,
                        },
                    }

            # Otherwise, proxy format for fal.ai
            return {
                "model_image": f"data:image/jpeg;base64,{person_b64}",
                "garment_image": f"data:image/jpeg;base64,{saree_b64}" if saree_b64 else "",
                "category": fashn_category,
                "mode": options.get("mode", "performance"),
                "nsfw_filter": True,
                "cover_feet": True,
                "adjust_hands": True,
            }

        elif self.provider_name in ("fal-kolors", "kolors"):
            return {
                "human_image_url": f"data:image/jpeg;base64,{person_b64}",
                "garment_image_url": f"data:image/jpeg;base64,{saree_b64}" if saree_b64 else "",
            }

        elif self.provider_name == "replicate":
            return {
                "input": {
                    "human_img": f"data:image/jpeg;base64,{person_b64}",
                    "garm_img": f"data:image/jpeg;base64,{saree_b64}" if saree_b64 else "",
                    "garment_des": options.get("saree_description", "Indian silk saree"),
                }
            }

        else:
            # Generic cloud adapter schema
            return {
                "person_image": person_b64,
                "garment_image": saree_b64,
                "garment_type": "saree",
                "options": options,
            }

    async def process_tryon(
        self,
        person_image_bytes: bytes,
        saree_image_bytes: bytes,
        options: Optional[Dict[str, Any]] = None,
    ) -> TryOnEngineResult:
        start_time = time.time()
        options = options or {}

        # 1. Credential Check
        if not self.api_key or not self.api_url:
            return TryOnEngineResult(
                status="failed",
                provider_name=self.provider_name,
                provider_job_id=f"cfg_err_{uuid.uuid4().hex[:8]}",
                error_code="PROVIDER_CREDENTIALS_MISSING",
                error_message="Hosted AI Try-On provider API key or URL is not configured.",
                processing_time_ms=int((time.time() - start_time) * 1000),
            )

        payload = self._prepare_payload(person_image_bytes, saree_image_bytes, options)

        # fal.ai uses Authorization: Key YOUR_KEY, while direct fashn.ai uses Bearer fa-...
        if self.api_key.startswith("fa-"):
            auth_header = f"Bearer {self.api_key}"
            if not self.api_url or "fal.run" in self.api_url:
                self.api_url = "https://api.fashn.ai/v1/run"
        elif self.provider_name.startswith("fal") or self.provider_name == "fashn":
            auth_header = f"Key {self.api_key}"
        else:
            auth_header = f"Bearer {self.api_key}"

        headers = {
            "Authorization": auth_header,
            "Content-Type": "application/json",
            "User-Agent": "NeXooAi-TryOn/1.0",
        }

        # 2. Execution with Exponential Backoff Retries
        attempts = 0
        backoff_delay = 1.0

        while attempts <= self.max_retries:
            attempts += 1
            try:
                async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
                    response = await client.post(self.api_url, json=payload, headers=headers)

                    # Successful response (200 / 201)
                    if response.status_code in (200, 201):
                        try:
                            data = response.json()
                        except Exception:
                            return TryOnEngineResult(
                                status="failed",
                                provider_name=self.provider_name,
                                provider_job_id=f"malformed_{uuid.uuid4().hex[:8]}",
                                error_code="MALFORMED_PROVIDER_RESPONSE",
                                error_message="AI provider returned non-JSON response payload.",
                                processing_time_ms=int((time.time() - start_time) * 1000),
                            )

                        job_id = (
                            data.get("id")
                            or data.get("job_id")
                            or data.get("request_id")
                            or f"{self.provider_name}_{uuid.uuid4().hex[:12]}"
                        )

                        # Support direct FASHN.ai async status polling (OpenAPI 3.1.1 spec)
                        # When POST /v1/run succeeds, it returns { "id": "...", "error": null }
                        # Poll /v1/status/{id} until status is "completed" or "failed"
                        if "id" in data and ("output" not in data or not data["output"]):
                            poll_url = f"https://api.fashn.ai/v1/status/{job_id}"
                            poll_start = time.time()
                            while time.time() - poll_start < float(self.timeout):
                                await asyncio.sleep(2.0)
                                try:
                                    poll_resp = await client.get(poll_url, headers=headers)
                                    if poll_resp.status_code == 200:
                                        poll_data = poll_resp.json()
                                        current_status = poll_data.get("status")
                                        if current_status == "completed":
                                            data = poll_data
                                            break
                                        elif current_status in ("failed", "canceled", "time_out"):
                                            err_details = poll_data.get("error") or {}
                                            err_msg = err_details.get("message") if isinstance(err_details, dict) else str(err_details)
                                            return TryOnEngineResult(
                                                status="failed",
                                                provider_name=self.provider_name,
                                                provider_job_id=job_id,
                                                error_code="PROVIDER_PROCESSING_FAILED",
                                                error_message=err_msg or "FASHN.ai virtual try-on processing failed.",
                                                processing_time_ms=int((time.time() - start_time) * 1000),
                                            )
                                except Exception as poll_err:
                                    logger.warning("Fashn status poll error: %s", poll_err)

                        result_bytes = None
                        output_url = None
                        output_b64 = None

                        # Check FASHN direct list output: {"output": ["https://..."] or ["data:image/..."]}
                        if "output" in data and isinstance(data["output"], list) and len(data["output"]) > 0:
                            raw_out = data["output"][0]
                            if raw_out.startswith("data:image/"):
                                output_b64 = raw_out
                            else:
                                output_url = raw_out

                        # Check FASHN schema: {"images": [{"url": "https://..."}]}
                        if not output_url and not output_b64 and "images" in data and isinstance(data["images"], list) and len(data["images"]) > 0:
                            first_img = data["images"][0]
                            if isinstance(first_img, dict):
                                output_url = first_img.get("url")
                            elif isinstance(first_img, str):
                                if first_img.startswith("data:image/"):
                                    output_b64 = first_img
                                elif first_img.startswith("http"):
                                    output_url = first_img
                                else:
                                    output_b64 = first_img

                        # Check Kolors schema: {"image": {"url": "https://..."}}
                        if not output_url and not output_b64 and "image" in data:
                            img_val = data["image"]
                            if isinstance(img_val, dict):
                                output_url = img_val.get("url")
                            elif isinstance(img_val, str):
                                if img_val.startswith("http"):
                                    output_url = img_val
                                else:
                                    output_b64 = img_val

                        # Check generic schema: {"output": "..."} or {"result_image": "..."}
                        if not output_url and not output_b64:
                            val = data.get("output") or data.get("result_image")
                            if isinstance(val, str):
                                if val.startswith("http"):
                                    output_url = val
                                else:
                                    output_b64 = val

                        # Decode Base64 image
                        if output_b64:
                            try:
                                if "," in output_b64:
                                    output_b64 = output_b64.split(",")[1]
                                result_bytes = base64.b64decode(output_b64)
                            except Exception as b64_err:
                                logger.warning("Could not decode base64 output: %s", b64_err)

                        # Fetch image bytes if URL returned
                        elif output_url:
                            try:
                                async with httpx.AsyncClient(timeout=30.0) as img_client:
                                    img_resp = await img_client.get(output_url)
                                    if img_resp.status_code == 200:
                                        result_bytes = img_resp.content
                                    else:
                                        logger.warning("Failed to fetch generated image from URL %s (status %s)", output_url, img_resp.status_code)
                            except Exception as fetch_err:
                                logger.warning("Error downloading output image: %s", fetch_err)

                        if not result_bytes:
                            return TryOnEngineResult(
                                status="failed",
                                provider_name=self.provider_name,
                                provider_job_id=job_id,
                                error_code="MALFORMED_PROVIDER_RESPONSE",
                                error_message="AI provider response did not contain a valid image output.",
                                processing_time_ms=int((time.time() - start_time) * 1000),
                            )

                        duration_ms = int((time.time() - start_time) * 1000)
                        return TryOnEngineResult(
                            status="completed",
                            provider_name=self.provider_name,
                            provider_job_id=job_id,
                            result_image_bytes=result_bytes,
                            processing_time_ms=duration_ms,
                            estimated_cost_usd=self._get_estimated_cost(),
                        )

                    # Handle 401 Unauthorized / 403 Forbidden: DO NOT RETRY (client authentication error)
                    elif response.status_code == 401:
                        return TryOnEngineResult(
                            status="failed",
                            provider_name=self.provider_name,
                            provider_job_id=f"auth_err_{uuid.uuid4().hex[:8]}",
                            error_code="PROVIDER_AUTHENTICATION_ERROR",
                            error_message="Authentication failed for AI try-on provider. Please check FAL_KEY.",
                            processing_time_ms=int((time.time() - start_time) * 1000),
                        )
                    elif response.status_code == 403:
                        return TryOnEngineResult(
                            status="failed",
                            provider_name=self.provider_name,
                            provider_job_id=f"perm_err_{uuid.uuid4().hex[:8]}",
                            error_code="PROVIDER_PERMISSION_DENIED",
                            error_message="Access denied to AI model endpoint. Please check your fal.ai plan permissions.",
                            processing_time_ms=int((time.time() - start_time) * 1000),
                        )

                    # Handle 402 Payment Required / Insufficient Credits: DO NOT RETRY
                    elif response.status_code == 402:
                        return TryOnEngineResult(
                            status="failed",
                            provider_name=self.provider_name,
                            provider_job_id=f"credit_err_{uuid.uuid4().hex[:8]}",
                            error_code="PROVIDER_INSUFFICIENT_CREDITS",
                            error_message="Insufficient balance or credits on fal.ai account.",
                            processing_time_ms=int((time.time() - start_time) * 1000),
                        )

                    # Handle 400 Bad Request / 422 Validation Error: DO NOT RETRY
                    elif response.status_code in (400, 422):
                        return TryOnEngineResult(
                            status="failed",
                            provider_name=self.provider_name,
                            provider_job_id=f"bad_req_{uuid.uuid4().hex[:8]}",
                            error_code="INVALID_IMAGE_PAYLOAD",
                            error_message="Image or payload could not be processed by virtual try-on provider.",
                            processing_time_ms=int((time.time() - start_time) * 1000),
                        )

                    # Handle Rate Limits (429): Retry with backoff
                    elif response.status_code == 429:
                        if attempts <= self.max_retries:
                            await asyncio.sleep(backoff_delay)
                            backoff_delay *= 2
                            continue
                        return TryOnEngineResult(
                            status="failed",
                            provider_name=self.provider_name,
                            provider_job_id=f"rate_limit_{uuid.uuid4().hex[:8]}",
                            error_code="PROVIDER_RATE_LIMIT",
                            error_message="AI provider rate limit reached. Please retry shortly.",
                            processing_time_ms=int((time.time() - start_time) * 1000),
                        )

                    # Server error (5xx): Retry with backoff
                    else:
                        if attempts <= self.max_retries:
                            await asyncio.sleep(backoff_delay)
                            backoff_delay *= 2
                            continue
                        return TryOnEngineResult(
                            status="failed",
                            provider_name=self.provider_name,
                            provider_job_id=f"server_err_{uuid.uuid4().hex[:8]}",
                            error_code=f"PROVIDER_HTTP_{response.status_code}",
                            error_message="AI provider service encountered a server error.",
                            processing_time_ms=int((time.time() - start_time) * 1000),
                        )

            except httpx.TimeoutException:
                if attempts <= self.max_retries:
                    await asyncio.sleep(backoff_delay)
                    backoff_delay *= 2
                    continue
                return TryOnEngineResult(
                    status="failed",
                    provider_name=self.provider_name,
                    provider_job_id=f"timeout_{uuid.uuid4().hex[:8]}",
                    error_code="PROVIDER_TIMEOUT",
                    error_message=f"Request to {self.provider_name} timed out after {self.timeout}s.",
                    processing_time_ms=int((time.time() - start_time) * 1000),
                )
            except Exception as e:
                return TryOnEngineResult(
                    status="failed",
                    provider_name=self.provider_name,
                    provider_job_id=f"err_{uuid.uuid4().hex[:8]}",
                    error_code="PROVIDER_CONNECTION_ERROR",
                    error_message=str(e),
                    processing_time_ms=int((time.time() - start_time) * 1000),
                )

        return TryOnEngineResult(
            status="failed",
            provider_name=self.provider_name,
            provider_job_id=f"exhausted_{uuid.uuid4().hex[:8]}",
            error_code="MAX_RETRIES_EXCEEDED",
            error_message="Maximum retry attempts exceeded connecting to AI provider.",
            processing_time_ms=int((time.time() - start_time) * 1000),
        )

    async def generate_runway_video(self, image_source: str, duration: int = 5) -> Dict[str, Any]:
        """
        Generates a 5-second fashion runway catwalk video clip using FASHN OpenAPI 3.1.1 'image-to-video'.
        Accepts a public URL or data:image/png;base64,... string.
        """
        if not self.api_key:
            return {"success": False, "error": "FASHN API credentials are not configured"}

        auth_header = f"Bearer {self.api_key}" if self.api_key.startswith("fa-") else f"Key {self.api_key}"
        headers = {
            "Authorization": auth_header,
            "Content-Type": "application/json",
            "User-Agent": "NeXooAi-TryOn/1.0",
        }
        payload = {
            "model_name": "image-to-video",
            "inputs": {
                "image": image_source,
                "duration": duration,
                "resolution": "720p",
            },
        }

        api_url = "https://api.fashn.ai/v1/run"
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(api_url, json=payload, headers=headers)
                if resp.status_code not in (200, 201):
                    return {"success": False, "error": f"FASHN API error {resp.status_code}: {resp.text[:200]}"}

                res_data = resp.json()
                job_id = res_data.get("id")
                if not job_id:
                    return {"success": False, "error": "FASHN did not return a prediction ID for video generation."}

                poll_url = f"https://api.fashn.ai/v1/status/{job_id}"
                poll_start = time.time()
                while time.time() - poll_start < 90.0:
                    await asyncio.sleep(2.5)
                    poll_resp = await client.get(poll_url, headers=headers)
                    if poll_resp.status_code == 200:
                        p_data = poll_resp.json()
                        st = p_data.get("status")
                        if st == "completed":
                            outputs = p_data.get("output", [])
                            if outputs and len(outputs) > 0:
                                return {"success": True, "video_url": outputs[0], "job_id": job_id}
                        elif st in ("failed", "canceled", "time_out"):
                            err_dict = p_data.get("error", {})
                            msg = err_dict.get("message") if isinstance(err_dict, dict) else str(err_dict)
                            return {"success": False, "error": msg or "Runway video synthesis failed."}

                return {"success": False, "error": "Runway video synthesis timed out (exceeded 90s)."}
        except Exception as e:
            logger.error("Runway video generation exception: %s", e)
            return {"success": False, "error": str(e)}

