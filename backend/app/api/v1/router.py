from fastapi import APIRouter
from backend.app.api.v1.endpoints import health, catalog, tryon, admin, auth

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["Catalogue"])
api_router.include_router(tryon.router, prefix="/tryon", tags=["Virtual Try-On"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin Dashboard"])
