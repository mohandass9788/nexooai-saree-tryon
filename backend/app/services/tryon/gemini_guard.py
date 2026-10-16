import base64
import json
import logging
from typing import Dict, Any
import httpx
from pydantic import BaseModel
from backend.app.core.config import settings

logger = logging.getLogger("tryon.gemini_guard")


class PoseValidationResult(BaseModel):
    is_valid: bool
    pose_score: float
    view_type: str  # "full_body", "upper_body", "invalid"
    guidance_message_ta: str
    guidance_message_en: str
    green_tick: bool


class GeminiPoseGuard:
    """
    Evaluates customer portrait photos using Gemini 3.8 Flash Vision
    BEFORE expensive image rendering, preventing token and cost waste.
    """

    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={self.api_key}"
        )

    async def validate_pose(self, image_bytes: bytes) -> PoseValidationResult:
        import io
        from PIL import Image, ImageOps

        # Check physical image orientation (EXIF transpose & aspect ratio)
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            pil_img = ImageOps.exif_transpose(pil_img)
            w, h = pil_img.size
            if w > h:
                logger.info("Rejected sideways/landscape photo: %dx%d", w, h)
                return PoseValidationResult(
                    is_valid=False,
                    pose_score=0.25,
                    view_type="invalid_landscape",
                    guidance_message_ta="⚠️ புகைப்படம் பக்கவாட்டில் (கிடைமட்டமாக) உள்ளது. தயவுசெய்து கேமராவை செங்குத்தாக (Portrait) வைத்து நேராகப் படம் எடுக்கவும்.",
                    guidance_message_en="⚠️ Photo is sideways or landscape. Please hold the camera vertically (Portrait) and face forward.",
                    green_tick=False,
                )
        except Exception as e:
            logger.warning("Could not pre-check image orientation: %s", e)

        if not self.api_key:
            # Fallback if key missing: accept with standard score
            return PoseValidationResult(
                is_valid=True,
                pose_score=0.90,
                view_type="portrait",
                guidance_message_ta="போர்ட்ரெய்ட் படம் ஏற்கப்பட்டது.",
                guidance_message_en="Portrait photo accepted.",
                green_tick=True,
            )

        try:
            b64_image = base64.b64encode(image_bytes).decode("utf-8")

            prompt = (
                "You are an AI Virtual Fitting Quality Evaluator for an Indian textile retail showroom. "
                "Analyze this customer photo strictly for clothing try-on (saree, kurta, shirt, chudidhar, suit). "
                "Evaluate:\n"
                "1. Is a real human person clearly visible?\n"
                "2. Is the person standing upright vertically and FACING FORWARD towards the camera? (If turned backwards, sideways, tilted horizontal, upside-down, or head turned away, mark is_valid: false, green_tick: false!)\n"
                "3. Is the framing adequate (either full body or waist-up upper body)?\n"
                "4. Is the lighting acceptable (not pitch black or completely blurry)?\n\n"
                "Return ONLY a raw JSON object with keys:\n"
                "{\n"
                '  "is_valid": true or false,\n'
                '  "pose_score": number between 0.0 and 1.0,\n'
                '  "view_type": "full_body" or "upper_body" or "invalid",\n'
                '  "guidance_message_ta": "clear guidance in Tamil for the customer (e.g. if back-facing, tell them in Tamil to face the camera directly)",\n'
                '  "guidance_message_en": "clear guidance in English for the customer",\n'
                '  "green_tick": true or false\n'
                "}"
            )

            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": b64_image,
                                }
                            },
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.1,
                    "response_mime_type": "application/json",
                },
            }

            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(self.endpoint, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    parsed = json.loads(raw_text)

                    return PoseValidationResult(
                        is_valid=bool(parsed.get("is_valid", True)),
                        pose_score=float(parsed.get("pose_score", 0.9)),
                        view_type=str(parsed.get("view_type", "portrait")),
                        guidance_message_ta=str(
                            parsed.get("guidance_message_ta", "தோற்றம் சரியாக உள்ளது.")
                        ),
                        guidance_message_en=str(
                            parsed.get("guidance_message_en", "Pose is well-framed.")
                        ),
                        green_tick=bool(parsed.get("green_tick", True)),
                    )
                else:
                    logger.warning("Gemini Vision check failed status %s: %s", resp.status_code, resp.text)

        except Exception as e:
            logger.error("Error during Gemini pose validation: %s", e)

        # Resilient fallback: allow tryon to proceed if network glitch
        return PoseValidationResult(
            is_valid=True,
            pose_score=0.88,
            view_type="portrait",
            guidance_message_ta="போர்ட்ரெய்ட் படம் ஏற்கப்பட்டது.",
            guidance_message_en="Portrait image confirmed.",
            green_tick=True,
        )


gemini_pose_guard = GeminiPoseGuard()
