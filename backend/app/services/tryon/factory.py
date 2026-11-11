import os
import logging
from typing import Optional
from backend.app.core.config import settings
from backend.app.core.system_settings import get_setting
from backend.app.services.tryon.base import BaseTryOnEngine
from backend.app.services.tryon.mock_engine import MockTryOnEngine
from backend.app.services.tryon.cloud_engine import CloudApiTryOnEngine

logger = logging.getLogger("tryon.factory")

PLAN_TIER_AI_MAP = {
    "platinum": "fal-fashn",    # Ultra-HD Luxury Saree Drape (FASHN v1.6)
    "gold": "fal-kolors",       # High Realism Kling Kolors
    "silver": "fal-catvton",    # Fast & Budget (~₹2) CatVTON
    "trial": "mock",            # Zero-cost demo trial
}

def resolve_provider_for_shop(
    shop_id: Optional[str] = None,
    plan_tier: Optional[str] = None,
    ai_provider: Optional[str] = None,
) -> str:
    """
    Resolves the effective AI provider:
    1. If specific manual provider given (not 'auto_by_plan'), use it (Type 2: Manual override).
    2. Else if plan_tier given, resolve via PLAN_TIER_AI_MAP (Type 1: Plan-based auto).
    3. Else fall back to global platform setting.
    """
    if ai_provider and ai_provider.strip().lower() not in ("auto_by_plan", "default", ""):
        return ai_provider.strip().lower()

    if plan_tier:
        tier_clean = plan_tier.strip().lower()
        if tier_clean in PLAN_TIER_AI_MAP:
            return PLAN_TIER_AI_MAP[tier_clean]

    return str(get_setting("ai_provider") or settings.AI_TRYON_PROVIDER or "mock").lower().strip()


def get_tryon_engine(
    shop_id: Optional[str] = None,
    plan_tier: Optional[str] = None,
    ai_provider: Optional[str] = None,
    custom_api_key: Optional[str] = None,
) -> BaseTryOnEngine:
    """
    Factory function returning the configured virtual try-on engine instance,
    resolving dynamically from:
    - Customer Manual Override (Type 2)
    - Customer Plan Tier Auto-Assignment (Type 1)
    - Global Platform Settings (Fallback)
    """
    provider = resolve_provider_for_shop(shop_id=shop_id, plan_tier=plan_tier, ai_provider=ai_provider)
    logger.info(f"Resolved AI Try-On Engine: '{provider}' for shop_id='{shop_id}', plan_tier='{plan_tier}'")

    if provider in ("hf", "huggingface", "idm-vton", "idmvton"):
        try:
            from backend.app.services.tryon.hf_engine import HuggingFaceVTONEngine
            return HuggingFaceVTONEngine()
        except Exception as e:
            logger.warning("HF engine unavailable, falling back to mock: %s", e)
            return MockTryOnEngine()
    elif provider in ("gemini", "google", "nano"):
        from backend.app.services.tryon.gemini_engine import GeminiTryOnEngine
        gemini_key = custom_api_key or get_setting("gemini_api_key") or getattr(settings, "GEMINI_API_KEY", "")
        return GeminiTryOnEngine(api_key=gemini_key)
    elif provider in ("openai", "chatgpt", "dalle", "gpt4"):
        from backend.app.services.tryon.openai_engine import OpenAITryOnEngine
        openai_key = custom_api_key or get_setting("openai_api_key") or os.getenv("OPENAI_API_KEY", "")
        return OpenAITryOnEngine(api_key=openai_key)
    elif provider in ("fal-fashn", "fashn-fal", "fal_fashn", "fal"):
        fal_key = custom_api_key or get_setting("fal_key") or getattr(settings, "FAL_KEY", "") or get_setting("fashn_api_key")
        return CloudApiTryOnEngine(provider_name="fal-fashn", api_key=fal_key)
    elif provider in ("fal-kolors", "kolors-fal", "fal_kolors", "kolors"):
        kolors_key = custom_api_key or get_setting("fal_key") or getattr(settings, "FAL_KEY", "") or get_setting("fashn_api_key")
        return CloudApiTryOnEngine(provider_name="fal-kolors", api_key=kolors_key)
    elif provider in ("fal-catvton", "catvton", "fal_catvton"):
        cat_key = custom_api_key or get_setting("fal_key") or getattr(settings, "FAL_KEY", "") or get_setting("fashn_api_key")
        return CloudApiTryOnEngine(provider_name="fal-catvton", api_key=cat_key)
    elif provider in ("fal-leffa", "leffa", "fal_leffa"):
        leffa_key = custom_api_key or get_setting("fal_key") or getattr(settings, "FAL_KEY", "") or get_setting("fashn_api_key")
        return CloudApiTryOnEngine(provider_name="fal-leffa", api_key=leffa_key)
    elif provider in ("fal-vton", "fal_vton"):
        vton_key = custom_api_key or get_setting("fal_key") or getattr(settings, "FAL_KEY", "") or get_setting("fashn_api_key")
        return CloudApiTryOnEngine(provider_name="fal-vton", api_key=vton_key)
    elif provider in ("fashn", "direct-fashn", "fashn-ai"):
        direct_fashn_key = custom_api_key or get_setting("fashn_api_key") or getattr(settings, "FASHN_API_KEY", "")
        return CloudApiTryOnEngine(provider_name="fashn", api_key=direct_fashn_key)
    elif provider in ("replicate", "cloud"):
        key = custom_api_key or get_setting("fashn_api_key") or getattr(settings, "FAL_KEY", "") or getattr(settings, "AI_TRYON_API_KEY", "")
        return CloudApiTryOnEngine(provider_name=provider, api_key=key)
    else:
        return MockTryOnEngine()
