"""
NeXooAi Virtual Saree Try-On — Unified Production Server Launcher
Serves both Backend API (/api/v1/*) and Compiled Touchscreen Angular Kiosk (/kiosk/)
"""
import os
import sys
import uvicorn
from backend.app.core.config import settings

def main():
    print("=" * 65)
    print("  NeXooAi Virtual Saree Try-On — PRODUCTION LAUNCHER")
    print("=" * 65)
    print(f"  Environment  : {settings.APP_ENV}")
    print(f"  Debug Mode   : {settings.DEBUG}")
    print(f"  Host:Port    : {settings.HOST}:{settings.PORT}")
    print(f"  Database     : {settings.DATABASE_URL}")
    print(f"  AI Provider  : {settings.AI_TRYON_PROVIDER}")
    print(f"  Media Storage: {settings.STORAGE_LOCAL_DIR}")
    print("-" * 65)

    frontend_dist = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "frontend", "dist", "frontend", "browser")
    )
    if os.path.exists(frontend_dist):
        print(f"  [OK] Compiled Angular Kiosk SPA detected.")
        print(f"  [URL] Touchscreen Kiosk: http://127.0.0.1:{settings.PORT}/kiosk/")
        print(f"  [URL] API Docs (Swagger): http://127.0.0.1:{settings.PORT}/docs")
    else:
        print("  [INFO] To build frontend for production, run: cd frontend && npm run build")

    print("=" * 65)
    print("Starting Uvicorn Server...")

    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        workers=1,
        log_level="info",
        access_log=True,
    )

if __name__ == "__main__":
    main()
