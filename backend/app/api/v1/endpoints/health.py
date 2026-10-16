from fastapi import APIRouter
from backend.app.core.config import settings

router = APIRouter()


@router.get("/health", summary="Service Health & Diagnostic Status")
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "ai_provider": settings.AI_TRYON_PROVIDER,
        "kiosk_default_language": settings.KIOSK_DEFAULT_LANGUAGE,
    }
