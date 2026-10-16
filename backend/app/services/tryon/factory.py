import os
from backend.app.core.config import settings
from backend.app.core.system_settings import get_setting
from backend.app.services.tryon.base import BaseTryOnEngine
from backend.app.services.tryon.mock_engine import MockTryOnEngine
from backend.app.services.tryon.cloud_engine import CloudApiTryOnEngine
from backend.app.services.tryon.gemini_engine import GeminiTryOnEngine
from backend.app.services.tryon.hf_engine import HuggingFaceVTONEngine
from backend.app.services.tryon.openai_engine import OpenAITryOnEngine


def get_tryon_engine() -> BaseTryOnEngine:
    """
    Factory function returning the configured virtual try-on engine instance,
    resolving dynamically from runtime system settings or environment.
    """
    provider = str(get_setting("ai_provider") or settings.AI_TRYON_PROVIDER or "mock").lower().strip()

    if provider in ("hf", "huggingface", "idm-vton", "idmvton"):
        return HuggingFaceVTONEngine()
    elif provider in ("gemini", "google", "nano"):
        gemini_key = get_setting("gemini_api_key") or getattr(settings, "GEMINI_API_KEY", "")
        return GeminiTryOnEngine(api_key=gemini_key)
    elif provider in ("openai", "chatgpt", "dalle", "gpt4"):
        openai_key = get_setting("openai_api_key") or os.getenv("OPENAI_API_KEY", "")
        return OpenAITryOnEngine(api_key=openai_key)
    elif provider in ("fal-fashn", "fashn-fal", "fal_fashn"):
        fashn_key = get_setting("fashn_api_key") or getattr(settings, "FAL_KEY", "")
        return CloudApiTryOnEngine(provider_name="fal-fashn", api_key=fashn_key)
    elif provider in ("fal-kolors", "kolors-fal", "fal_kolors", "kolors"):
        kolors_key = get_setting("fashn_api_key") or getattr(settings, "FAL_KEY", "")
        return CloudApiTryOnEngine(provider_name="fal-kolors", api_key=kolors_key)
    elif provider in ("fashn", "replicate", "fal", "cloud"):
        fashn_key = get_setting("fashn_api_key") or getattr(settings, "FAL_KEY", "") or getattr(settings, "AI_TRYON_API_KEY", "")
        return CloudApiTryOnEngine(provider_name=provider, api_key=fashn_key)
    else:
        return MockTryOnEngine()


