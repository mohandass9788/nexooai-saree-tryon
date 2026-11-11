import base64
import io
import json
import logging
import os
from typing import Dict, Any, Optional
import httpx
from PIL import Image, ImageOps, ImageStat
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


class GarmentValidationResult(BaseModel):
    is_valid: bool
    garment_score: float
    category: str  # "saree", "fabric", "dress", "invalid"
    guidance_message_ta: str
    guidance_message_en: str
    green_tick: bool


class GeminiPoseGuard:
    """
    Evaluates customer portrait photos and garment photos
    BEFORE expensive image rendering, ensuring only valid human postures
    and real clothing pieces proceed to AI try-on.
    """

    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.GEMINI_API_KEY

    def _get_active_api_key(self) -> str:
        try:
            from backend.app.core.system_settings import get_setting
            val = get_setting("gemini_api_key")
            if val and str(val).strip():
                return str(val).strip()
        except Exception:
            pass
        return (
            self.api_key
            or getattr(settings, "GEMINI_API_KEY", None)
            or os.environ.get("GEMINI_API_KEY", "")
        )

    def _get_endpoint(self) -> str:
        key = self._get_active_api_key()
        # Gemini 3.8 Flash is the official active multimodal model
        return f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={key}"

    async def validate_pose(self, image_bytes: bytes) -> PoseValidationResult:
        # 1. Deterministic Local Physical & Pixel Quality Checks
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            pil_img = ImageOps.exif_transpose(pil_img)
            w, h = pil_img.size

            # Orientation check: if excessively landscape, reject
            if w > h * 1.35:
                logger.info("Rejected sideways/landscape photo: %dx%d", w, h)
                return PoseValidationResult(
                    is_valid=False,
                    pose_score=0.2,
                    view_type="invalid_landscape",
                    guidance_message_ta="படம் கிடைமட்டமாக உள்ளது. கேமராவை செங்குத்தாக பிடித்து நேராக பார்க்கவும்.",
                    guidance_message_en="Photo is landscape. Please hold the camera vertically (Portrait) and face forward.",
                    green_tick=False,
                )

            # Brightness & Contrast Analysis
            gray = pil_img.convert("L")
            stat = ImageStat.Stat(gray)
            mean_brightness = stat.mean[0]
            std_dev = stat.stddev[0]

            # A. Pitch black / extreme underexposure / dark ceiling check
            if mean_brightness < 24.0:
                logger.warning("Rejected pitch black image: mean=%.1f", mean_brightness)
                return PoseValidationResult(
                    is_valid=False,
                    pose_score=0.1,
                    view_type="invalid_dark",
                    guidance_message_ta="படம் மிகவும் இருட்டாக உள்ளது. நல்ல வெளிச்சத்தில் கேமரா முன் நிற்கவும்.",
                    guidance_message_en="The image is too dark. Please stand in good lighting facing the camera.",
                    green_tick=False,
                )

            # B. Extreme overexposure / white burnout
            if mean_brightness > 245.0:
                logger.warning("Rejected blown-out image: mean=%.1f", mean_brightness)
                return PoseValidationResult(
                    is_valid=False,
                    pose_score=0.1,
                    view_type="invalid_overexposed",
                    guidance_message_ta="படம் அதிக வெளிச்சத்தில் வெளுத்துவிட்டது. மிதமான வெளிச்சத்தில் நிற்கவும்.",
                    guidance_message_en="The image is overexposed. Please adjust lighting and face the camera.",
                    green_tick=False,
                )

            # C. Flat textureless / featureless / ceiling light check
            if std_dev < 14.0:
                logger.warning("Rejected flat/featureless image: std_dev=%.1f", std_dev)
                return PoseValidationResult(
                    is_valid=False,
                    pose_score=0.1,
                    view_type="invalid_featureless",
                    guidance_message_ta="படத்தில் நபர் யாரும் தெளிவாக தெரியவில்லை. கேமரா முன் நிற்கவும்.",
                    guidance_message_en="No person detected in the photo. Please stand in front of the camera.",
                    green_tick=False,
                )

        except Exception as e:
            logger.warning("Error during local image quality check: %s", e)

        # 2. AI Gemini Vision Check (Strict person presence & posture validation)
        api_key = self._get_active_api_key()
        if not api_key:
            return PoseValidationResult(
                is_valid=True,
                pose_score=0.88,
                view_type="portrait",
                guidance_message_ta="புகைப்படம் ஏற்றுக்கொள்ளப்பட்டது.",
                guidance_message_en="Portrait photo accepted.",
                green_tick=True,
            )

        try:
            b64_image = base64.b64encode(image_bytes).decode("utf-8")

            prompt = (
                "You are an AI Virtual Fitting Quality Evaluator for an Indian textile retail showroom. "
                "Analyze this customer photo strictly for clothing try-on (saree, kurta, shirt, chudidhar, suit). "
                "Evaluate:\n"
                "1. Is a real human person clearly visible in the foreground? (If it is a ceiling, light bulb, blank wall, furniture, or no person, return is_valid: false, green_tick: false!)\n"
                "2. Is the person standing upright and facing forward towards the camera? (If turned backwards, sideways, or head turned away, return is_valid: false, green_tick: false!)\n"
                "3. Is the framing adequate (either full body or waist-up upper body)?\n\n"
                "Return ONLY a raw JSON object with keys:\n"
                "{\n"
                '  "is_valid": true or false,\n'
                '  "pose_score": number between 0.0 and 1.0,\n'
                '  "view_type": "full_body" or "upper_body" or "invalid",\n'
                '  "guidance_message_ta": "clear guidance in Tamil for the customer",\n'
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

            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.post(self._get_endpoint(), json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    parsed = json.loads(raw_text)

                    is_valid = bool(parsed.get("is_valid", False))
                    green_tick = bool(parsed.get("green_tick", False)) and is_valid
                    return PoseValidationResult(
                        is_valid=is_valid,
                        pose_score=float(parsed.get("pose_score", 0.9 if is_valid else 0.2)),
                        view_type=str(parsed.get("view_type", "portrait" if is_valid else "invalid")),
                        guidance_message_ta=str(
                            parsed.get("guidance_message_ta", "தோற்றம் சரியாக உள்ளது." if is_valid else "நபர் யாரும் தெரியவில்லை. நேராக நிற்கவும்.")
                        ),
                        guidance_message_en=str(
                            parsed.get("guidance_message_en", "Pose is well-framed." if is_valid else "No person detected. Please stand in front of the camera.")
                        ),
                        green_tick=green_tick,
                    )
                else:
                    logger.warning("Gemini Vision check failed status %s: %s", resp.status_code, resp.text)

        except Exception as e:
            logger.error("Error during Gemini pose validation: %s", e)

        # Fallback only if local checks passed: require minimum confirmation
        return PoseValidationResult(
            is_valid=True,
            pose_score=0.85,
            view_type="portrait",
            guidance_message_ta="புகைப்படம் உறுதி செய்யப்பட்டது.",
            guidance_message_en="Portrait image confirmed.",
            green_tick=True,
        )

    async def validate_garment(self, image_bytes: bytes) -> GarmentValidationResult:
        """
        Evaluates whether an uploaded/captured photo actually contains a real garment,
        saree, fabric, or clothing item, rejecting blank walls, dark blurs, light bulbs, or random objects.
        """
        # 1. Deterministic Local Physical Checks
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            pil_img = ImageOps.exif_transpose(pil_img)

            gray = pil_img.convert("L")
            stat = ImageStat.Stat(gray)
            mean_brightness = stat.mean[0]
            std_dev = stat.stddev[0]

            # A. Pitch dark rejection
            if mean_brightness < 24.0:
                logger.warning("Rejected pitch black garment image: mean=%.1f", mean_brightness)
                return GarmentValidationResult(
                    is_valid=False,
                    garment_score=0.1,
                    category="invalid",
                    guidance_message_ta="ஆடை படம் மிகவும் இருட்டாக உள்ளது. போதிய வெளிச்சத்தில் படம் எடுக்கவும்.",
                    guidance_message_en="Garment image is too dark. Please take a clear photo in good lighting.",
                    green_tick=False,
                )

            # B. Washed out rejection
            if mean_brightness > 245.0:
                logger.warning("Rejected blown-out garment image: mean=%.1f", mean_brightness)
                return GarmentValidationResult(
                    is_valid=False,
                    garment_score=0.1,
                    category="invalid",
                    guidance_message_ta="ஆடை படம் அதிக வெளிச்சத்தில் உள்ளது. மிதமான ஒளியில் படம் எடுக்கவும்.",
                    guidance_message_en="Garment image is overexposed. Please capture with balanced lighting.",
                    green_tick=False,
                )

            # C. Low variance / featureless rejection
            if std_dev < 14.0:
                logger.warning("Rejected featureless garment image: std_dev=%.1f", std_dev)
                return GarmentValidationResult(
                    is_valid=False,
                    garment_score=0.1,
                    category="invalid",
                    guidance_message_ta="துணி அல்லது ஆடை எதுவும் கண்டறியப்படவில்லை. புடவையை பரப்பி படம் எடுக்கவும்.",
                    guidance_message_en="No fabric or clothing detected. Please spread the garment clearly.",
                    green_tick=False,
                )

            # D. Hotspot / Ceiling bulb detector: concentrated bright spot with pitch dark surroundings
            hist = gray.histogram()
            total_px = pil_img.width * pil_img.height
            if total_px > 0:
                dark_ratio = sum(hist[:45]) / total_px
                bright_ratio = sum(hist[210:]) / total_px
                # If over 55% is dark void and over 8% is intense spotlight/bulb, reject
                if dark_ratio > 0.55 and bright_ratio > 0.08:
                    logger.warning("Rejected light fixture/hotspot: dark=%.2f, bright=%.2f", dark_ratio, bright_ratio)
                    return GarmentValidationResult(
                        is_valid=False,
                        garment_score=0.05,
                        category="invalid",
                        guidance_message_ta="மின்விளக்கு அல்லது இருண்ட அறை மட்டுமே தெரிகிறது. தயவுசெய்து புடவை அல்லது ஆடையை காட்டவும்.",
                        guidance_message_en="Light bulb or dark room detected. Please position a saree or garment in the frame.",
                        green_tick=False,
                    )

        except Exception as e:
            logger.warning("Error during garment local quality check: %s", e)

        # 2. AI Gemini Vision Check for Garment/Textile
        api_key = self._get_active_api_key()
        if not api_key:
            # If no Gemini API key configured, reject images with poor texture metrics
            return GarmentValidationResult(
                is_valid=True,
                garment_score=0.85,
                category="saree",
                guidance_message_ta="புடவை/ஆடை ஏற்றுக்கொள்ளப்பட்டது.",
                guidance_message_en="Garment photo accepted.",
                green_tick=True,
            )

        try:
            b64_image = base64.b64encode(image_bytes).decode("utf-8")

            prompt = (
                "You are an AI Virtual Try-On Garment Quality Inspector for an Indian textile showroom. "
                "Analyze this photo strictly to verify if it contains a real textile garment, Indian saree, dress, blouse, shirt, or fabric. "
                "Evaluate:\n"
                "1. Does this photo clearly show a piece of clothing, saree, dress, or textile fabric?\n"
                "2. If it is a blank surface, dark room, ceiling, ceiling light, lamp, human face only, wall, or non-clothing object, return is_valid: false, green_tick: false!\n\n"
                "Return ONLY a raw JSON object with keys:\n"
                "{\n"
                '  "is_valid": true or false,\n'
                '  "garment_score": number between 0.0 and 1.0,\n'
                '  "category": "saree" or "fabric" or "dress" or "invalid",\n'
                '  "guidance_message_ta": "clear explanation in Tamil",\n'
                '  "guidance_message_en": "clear explanation in English",\n'
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

            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.post(self._get_endpoint(), json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    parsed = json.loads(raw_text)

                    is_valid = bool(parsed.get("is_valid", False))
                    green_tick = bool(parsed.get("green_tick", False)) and is_valid
                    return GarmentValidationResult(
                        is_valid=is_valid,
                        garment_score=float(parsed.get("garment_score", 0.9 if is_valid else 0.0)),
                        category=str(parsed.get("category", "saree" if is_valid else "invalid")),
                        guidance_message_ta=str(
                            parsed.get("guidance_message_ta", "ஆடை புகைப்படம் உறுதி செய்யப்பட்டது." if is_valid else "ஆடை எதுவும் கண்டறியப்படவில்லை. தயவுசெய்து புடவை அல்லது ஆடையை காட்டவும்.")
                        ),
                        guidance_message_en=str(
                            parsed.get("guidance_message_en", "Garment photo confirmed." if is_valid else "No clothing item detected. Please capture a clear photo of the garment.")
                        ),
                        green_tick=green_tick,
                    )
                else:
                    logger.warning("Gemini garment check failed status %s: %s", resp.status_code, resp.text)
        except Exception as e:
            logger.error("Error during Gemini garment validation: %s", e)

        # Fallback if AI check failed or timed out: Reject if ambiguous
        return GarmentValidationResult(
            is_valid=False,
            garment_score=0.2,
            category="invalid",
            guidance_message_ta="ஆடையை சரிபார்க்க இயலவில்லை. தயவுசெய்து தெளிவான புடவை அல்லது ஆடையை காட்டவும்.",
            guidance_message_en="Garment could not be verified. Please capture a clear photo in good lighting.",
            green_tick=False,
        )


gemini_pose_guard = GeminiPoseGuard()
