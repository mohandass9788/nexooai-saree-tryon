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
