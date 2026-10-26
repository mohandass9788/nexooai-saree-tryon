import os
import sys
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.core.config import settings
from backend.app.api.v1.router import api_router

if sys.platform == "win32":
    import io
    if hasattr(sys.stdout, "buffer"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "buffer"):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

logger = logging.getLogger("main")


async def retention_purge_worker():
    """Background task to purge expired customer media and jobs every hour."""
    from backend.app.services.storage.local_storage import storage_service
    while True:
        try:
            await asyncio.sleep(3600)  # run once every hour
            purged = await storage_service.purge_expired()
            if purged > 0:
                print(f"[Retention Daemon] Purged {purged} expired customer try-on media files.")
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[Retention Daemon] Error during scheduled purge: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    from backend.app.db.init_db import init_database
    try:
        await init_database()
    except Exception as e:
        logger.warning("Database init note: %s", e)

    purge_task = asyncio.create_task(retention_purge_worker())
    yield
    purge_task.cancel()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for NeXooAi Virtual Saree Try-On Kiosk Platform",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Static files mount for catalog garments
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Media mount for tryon outputs and customer photos
media_dir = os.path.abspath(settings.STORAGE_LOCAL_DIR)
os.makedirs(media_dir, exist_ok=True)
app.mount("/media", StaticFiles(directory=media_dir), name="media")

# Unified production SPA mount (serves compiled Angular kiosk from /kiosk)
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist", "frontend", "browser"))
if os.path.exists(frontend_dist):
    app.mount("/kiosk", StaticFiles(directory=frontend_dist, html=True), name="kiosk_spa")

# CORS configuration for touchscreen kiosk, tablets & admin panel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.DEBUG else settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 routes
app.include_router(api_router)


from fastapi.responses import RedirectResponse

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/kiosk/")
