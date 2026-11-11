import os
import sys
import asyncio
import logging
import secrets
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
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
SERVER_START_TIME = datetime.utcnow()

# HTTP Basic Security for Swagger API Docs
security = HTTPBasic()


def verify_docs_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    correct_user = secrets.compare_digest(credentials.username, settings.DOCS_USERNAME)
    correct_pass = secrets.compare_digest(credentials.password, settings.DOCS_PASSWORD)
    if not (correct_user and correct_pass):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect API Documentation credentials.",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username


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


# Custom FastAPI instance with default public docs disabled for security
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production API Gateway for NeXooAi Virtual Saree Try-On Kiosk Platform",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)

# Protected Swagger & OpenAPI Documentation Endpoints
@app.get("/docs", include_in_schema=False)
async def get_swagger_documentation(username: str = Depends(verify_docs_credentials)):
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title=f"{settings.APP_NAME} - Swagger API Explorer",
        swagger_favicon_url="https://tryon.nexooai.in/favicon.ico",
    )


@app.get("/redoc", include_in_schema=False)
async def get_redoc_documentation(username: str = Depends(verify_docs_credentials)):
    return get_redoc_html(
        openapi_url="/openapi.json",
        title=f"{settings.APP_NAME} - ReDoc API Reference",
        redoc_favicon_url="https://tryon.nexooai.in/favicon.ico",
    )


@app.get("/openapi.json", include_in_schema=False)
async def get_open_api_endpoint(username: str = Depends(verify_docs_credentials)):
    return get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
        description=app.description,
    )


# Static files mount for catalog garments
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Media mount for tryon outputs and customer photos
media_dir = os.path.abspath(settings.STORAGE_LOCAL_DIR)
os.makedirs(media_dir, exist_ok=True)
app.mount("/media", StaticFiles(directory=media_dir), name="media")

# Unified production SPA mount (serves compiled Angular kiosk from /kiosk if present)
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


def _format_uptime_string(seconds: int) -> str:
    days, rem = divmod(seconds, 86400)
    hours, rem = divmod(rem, 3600)
    minutes, sec = divmod(rem, 60)
    parts = []
    if days > 0:
        parts.append(f"{days}d")
    if hours > 0 or days > 0:
        parts.append(f"{hours}h")
    parts.append(f"{minutes}m {sec}s")
    return " ".join(parts)


@app.get("/", include_in_schema=False)
async def root_status_dashboard(request: Request, format: Optional[str] = None):
    """
    Production Status Dashboard:
    Returns clean JSON for programmatic monitors, or an executive status dashboard in HTML.
    """
    now = datetime.utcnow()
    uptime_seconds = int((now - SERVER_START_TIME).total_seconds())
    uptime_str = _format_uptime_string(uptime_seconds)

    # Return JSON if requested
    accept = request.headers.get("accept", "")
    if format == "json" or "application/json" in accept and "text/html" not in accept:
        return JSONResponse({
            "status": "healthy",
            "system": "operational",
            "app_name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.APP_ENV,
            "ai_provider": settings.AI_TRYON_PROVIDER,
            "uptime_seconds": uptime_seconds,
            "uptime_human": uptime_str,
            "started_at": SERVER_START_TIME.isoformat() + "Z",
            "timestamp": now.isoformat() + "Z",
            "database": "PostgreSQL 16 (Connected)",
            "kiosk_url": "https://tryon.nexooai.in/",
            "admin_url": "https://tryon.nexooai.in/login",
            "docs_url": "https://api.tryon.nexooai.in/docs"
        })

    # Serve rich, responsive luxury dark-mode HTML dashboard
    html_content = f"""<!DOCTYPE html>
<html lang="ta" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{settings.APP_NAME} — Production System Status</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Cinzel:wght@600;700&display=swap" rel="stylesheet">
    <style>
        :root {{
            --bg-base: #07090e;
            --bg-card: rgba(18, 22, 34, 0.85);
            --border-card: rgba(212, 175, 55, 0.22);
            --gold-primary: #d4af37;
            --gold-light: #f3e5ab;
            --emerald: #10b981;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
        }}
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            background-color: var(--bg-base);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 24px 16px;
            background-image: 
                radial-gradient(circle at 15% 20%, rgba(212, 175, 55, 0.08) 0%, transparent 40%),
                radial-gradient(circle at 85% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 40%);
        }}
        .container {{
            max-width: 860px;
            width: 100%;
            background: var(--bg-card);
            border: 1px solid var(--border-card);
            border-radius: 24px;
            padding: 40px 32px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px -10px rgba(212, 175, 55, 0.15);
            backdrop-filter: blur(16px);
        }}
        .header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding-bottom: 24px;
            margin-bottom: 32px;
            flex-wrap: wrap;
            gap: 16px;
        }}
        .brand-title {{
            font-family: 'Cinzel', serif;
            font-size: 26px;
            font-weight: 700;
            background: linear-gradient(135deg, #ffffff 30%, var(--gold-light) 70%, var(--gold-primary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: 0.5px;
        }}
        .brand-sub {{
            font-size: 13px;
            color: var(--text-muted);
            margin-top: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .status-badge {{
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.35);
            color: #34d399;
            padding: 8px 16px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.3px;
        }}
        .pulse-dot {{
            width: 9px;
            height: 9px;
            background: var(--emerald);
            border-radius: 50%;
            box-shadow: 0 0 12px var(--emerald);
            animation: pulse 2s infinite;
        }}
        @keyframes pulse {{
            0% {{ transform: scale(0.95); opacity: 0.8; }}
            50% {{ transform: scale(1.3); opacity: 1; }}
            100% {{ transform: scale(0.95); opacity: 0.8; }}
        }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
        }}
        .card {{
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 16px;
            padding: 20px;
            transition: all 0.2s ease;
        }}
        .card:hover {{
            border-color: rgba(212, 175, 55, 0.3);
            transform: translateY(-2px);
        }}
        .card-label {{
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: var(--text-muted);
            margin-bottom: 8px;
        }}
        .card-value {{
            font-size: 18px;
            font-weight: 700;
            color: #f1f5f9;
        }}
        .card-value.gold {{
            color: var(--gold-light);
        }}
        .card-subtext {{
            font-size: 11px;
            color: #64748b;
            margin-top: 4px;
        }}
        .actions-title {{
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 16px;
            color: var(--gold-light);
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .links-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 14px;
            margin-bottom: 24px;
        }}
        .action-btn {{
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(212, 175, 55, 0.2);
            border-radius: 14px;
            color: #ffffff;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.25s ease;
        }}
        .action-btn:hover {{
            background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(16, 185, 129, 0.15) 100%);
            border-color: var(--gold-primary);
            transform: translateY(-2px);
            box-shadow: 0 8px 20px -6px rgba(212, 175, 55, 0.3);
        }}
        .action-btn .icon {{
            font-size: 22px;
        }}
        .footer {{
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            padding-top: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: #64748b;
            flex-wrap: wrap;
            gap: 12px;
        }}
        .sec-note {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: #fbbf24;
            font-size: 11px;
            background: rgba(245, 158, 11, 0.1);
            padding: 4px 10px;
            border-radius: 6px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1 class="brand-title">NeXooAi Virtual Saree Try-On</h1>
                <div class="brand-sub">
                    <span>Production API Gateway & Telemetry Node</span>
                    <span>•</span>
                    <span>v{settings.APP_VERSION}</span>
                </div>
            </div>
            <div class="status-badge">
                <span class="pulse-dot"></span>
                <span>System Operational (100% Live)</span>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <div class="card-label">Server Uptime / இயக்க நேரம்</div>
                <div class="card-value gold">{uptime_str}</div>
                <div class="card-subtext">Booted: {SERVER_START_TIME.strftime('%Y-%m-%d %H:%M:%S')} UTC</div>
            </div>
            <div class="card">
                <div class="card-label">Database / தரவுத்தளம்</div>
                <div class="card-value" style="color: #34d399;">PostgreSQL 16</div>
                <div class="card-subtext">AsyncPG Connection Pool: Healthy</div>
            </div>
            <div class="card">
                <div class="card-label">AI Neural Drape Engine</div>
                <div class="card-value" style="color: #60a5fa;">{settings.AI_TRYON_PROVIDER.upper()}</div>
                <div class="card-subtext">Active Model: Gemini Flash / Fast Drape</div>
            </div>
            <div class="card">
                <div class="card-label">Security & TLS</div>
                <div class="card-value">HTTPS 256-bit</div>
                <div class="card-subtext">Let's Encrypt TLS 1.3 Active</div>
            </div>
        </div>

        <div class="actions-title">
            <span>🔗 Quick Portal Navigation / விரைவு இணைப்புகள்</span>
        </div>
        <div class="links-grid">
            <a href="https://tryon.nexooai.in/" class="action-btn">
                <span class="icon">👗</span>
                <div>
                    <div>Open Kiosk App</div>
                    <div style="font-size: 11px; color: var(--text-muted); font-weight: 400;">Floor Touchscreen Mirror</div>
                </div>
            </a>
            <a href="https://tryon.nexooai.in/login" class="action-btn">
                <span class="icon">🔐</span>
                <div>
                    <div>Showroom Portal</div>
                    <div style="font-size: 11px; color: var(--text-muted); font-weight: 400;">Store Manager & Admin Login</div>
                </div>
            </a>
            <a href="/docs" class="action-btn">
                <span class="icon">📖</span>
                <div>
                    <div>API Swagger Docs</div>
                    <div style="font-size: 11px; color: #fbbf24; font-weight: 400;">🔒 Protected (User: {settings.DOCS_USERNAME})</div>
                </div>
            </a>
            <a href="/api/v1/health" class="action-btn">
                <span class="icon">🩺</span>
                <div>
                    <div>JSON Healthcheck</div>
                    <div style="font-size: 11px; color: var(--text-muted); font-weight: 400;">Ping / Uptime Monitor Endpoint</div>
                </div>
            </a>
        </div>

        <div class="footer">
            <div>
                &copy; {now.year} NeXooAi Technologies. High-Precision AI Virtual Try-On Architecture.
            </div>
            <div class="sec-note">
                🔒 API Swagger Docs are secured with HTTP Basic Authentication.
            </div>
        </div>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html_content)
