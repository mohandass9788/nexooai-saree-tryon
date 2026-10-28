import os
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy import select

from backend.app.core.config import settings

logger = logging.getLogger("system_settings")

# Default in-memory cache initialized from settings
_CACHE: Dict[str, Any] = {
    "ai_provider": None,
    "fashn_api_key": None,
    "gemini_api_key": None,
    "openai_api_key": None,
    "photo_retention_minutes": None,
    "idle_attract_timeout_seconds": 180,
    "idle_attract_video_url": "https://www.youtube.com/watch?v=scL_y2_p8c8",
    "attract_video_urls": "https://www.youtube.com/watch?v=scL_y2_p8c8",
    "attract_mode_type": "both",  # 'both', 'video', 'feed'
    "idle_attract_enabled": "true",
    "idle_attract_title": "NeXooAi Luxury Saree Try-On",
    "idle_attract_subtitle": "தொட்டுத் தொடங்குங்கள் — விரல் தொட்டதும் அழகிய பட்டுப் புடவை உங்களுக்கான தோற்றத்தில்!",
    "kiosk_staff_pin": "5521",
    "kiosk_staff_session_hours": 24,
    "kiosk_admin_pin": "849201",
    "custom_ai_prompt_template": "Virtual saree try-on portrait: Gracefully drape the {garment_name} ({category}, {fabric}, {color}) onto the person. Preserve facial identity, hair, skin tone, and body pose with authentic waist pleats and ornate pallu over left shoulder.",
    # B2B Client Feature Toggles (Client Add-on Packages)
    "feature_tryon_max": "false",
    "feature_runway_video": "false",
    "feature_selfie_mode": "false",
    "feature_privacy_base64": "false",
    "feature_split_slider": "true",
    "feature_portrait_916": "true",
    "fashn_resolution": "1k",
    "fashn_generation_mode": "balanced",
    "saree_pleat_prompt": "traditional Indian silk saree drape, pleated pallu pinned neatly over left shoulder, crisp zari borders, matching blouse",
    # Showroom Brand Identity & Promotional Media
    "custom_store_name": "NeXooAi Luxury Silks",
    "custom_store_tagline": "Traditional Handloom Silk Sarees & Kanchipuram Weaves",
    "custom_store_logo_url": "",
    "custom_store_ad_video_url": "",
    "store_contact_phone": "+91 98401 23456",
    "store_city": "Chennai",
    # Showroom Watermark on Generated Portraits
    "watermark_enabled": "true",
    "watermark_text": "NeXooAi Luxury Silks",
    "watermark_subtext": "Exclusively Styled at Showroom",
    "watermark_position": "bottom_banner",  # 'bottom_banner', 'bottom_right', 'crest_overlay'
    # Showroom Dynamic WhatsApp Gateway (No Hardcoding!)
    "whatsapp_enabled": "false",
    "whatsapp_provider": "meta_cloud",  # 'meta_cloud', 'wati', 'twilio', 'webhook'
    "whatsapp_phone_number_id": "",
    "whatsapp_business_account_id": "",
    "whatsapp_access_token": "",
    "whatsapp_template_name": "saree_tryon_delivery",
    "whatsapp_sales_desk_phone": "+91 98401 23456",
    # Floor Counter Slip / POS Token Settings
    "counter_token_enabled": "true",
    "counter_auto_notify_sales": "true",
    # Live POS / ERP Billing Webhook Integration
    "pos_webhook_enabled": "false",
    "pos_webhook_url": "",
    "pos_webhook_auth_header": "",
    "pos_system_type": "generic",  # 'generic', 'tally', 'sap', 'zoho'
    "pos_auto_sync_tokens": "true",
    # AI Cost Cap & Idempotency Safeguards
    "ai_daily_budget_usd": 15.0,
    "ai_cost_cap_enabled": "true",
}


async def load_settings_from_db(db_session) -> Dict[str, Any]:
    """Populates in-memory cache with values stored in SQLite database."""
    global _CACHE
    try:
        from backend.app.db.models import SystemSettingModel
        stmt = select(SystemSettingModel)
        result = await db_session.execute(stmt)
        records = result.scalars().all()
        for r in records:
            _CACHE[r.key] = r.value
    except Exception as e:
        logger.warning("Could not load system settings from DB, using defaults: %s", e)
    return _CACHE


def get_setting(key: str, default: Any = None) -> Any:
    val = _CACHE.get(key)
    if val is None:
        return default
    return val


async def set_setting(key: str, value: Any, db_session=None) -> None:
    global _CACHE
    str_val = str(value)
    _CACHE[key] = str_val

    if db_session:
        try:
            from backend.app.db.models import SystemSettingModel
            stmt = select(SystemSettingModel).where(SystemSettingModel.key == key)
            res = await db_session.execute(stmt)
            existing = res.scalar_one_or_none()
            if existing:
                existing.value = str_val
                existing.updated_at = datetime.utcnow()
            else:
                db_session.add(SystemSettingModel(key=key, value=str_val, updated_at=datetime.utcnow()))
            await db_session.commit()
        except Exception as e:
            logger.warning("Failed saving setting '%s' to database: %s", key, e)
            await db_session.rollback()


def mask_key(k: str) -> str:
    if not k:
        return ""
    if len(k) <= 8:
        return "***"
    return f"{k[:4]}...{k[-4:]}"
