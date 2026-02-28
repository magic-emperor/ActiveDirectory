"""
main.py — FastAPI application entry point
Run with: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from config import app_config, ad_config, gemini_config
from routes.users import router as users_router
from routes.ai_chat import router as ai_router
from routes.ad_info import router as ad_info_router

# ── Logging setup ─────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO if app_config.env == "development" else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# ── FastAPI app ───────────────────────────────────────────────────
app = FastAPI(
    title="AD User Creator",
    description="AI-assisted Active Directory User Management API",
    version="1.0.0",
    docs_url="/docs" if app_config.env == "development" else None,
    redoc_url="/redoc" if app_config.env == "development" else None,
)

# ── CORS — allow frontend dev server ─────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_config.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routes ───────────────────────────────────────────────
app.include_router(users_router)
app.include_router(ai_router)
app.include_router(ad_info_router)


# ── Startup event — print configuration summary ───────────────────
@app.on_event("startup")
async def startup():
    logger.info("=" * 60)
    logger.info("  AD User Creator starting up")
    logger.info("  Environment : %s", app_config.env)
    logger.info("  AD Server   : %s:%s", ad_config.server, ad_config.port)
    logger.info("  AD Domain   : %s", ad_config.domain)
    logger.info("  Dry Run     : %s", ad_config.dry_run)
    logger.info("  TLS         : %s", ad_config.use_tls)
    logger.info("  AI (Gemini) : %s", "Configured" if gemini_config.api_key else "NOT configured (fallback mode)")
    logger.info("  CORS Origins: %s", app_config.cors_origins)
    logger.info("=" * 60)

    if ad_config.dry_run:
        logger.warning("[WARNING] DRY RUN MODE ACTIVE -- No actual AD changes will be made")
        logger.warning("   Set AD_DRY_RUN=false in .env when ready for real AD operations")

    # Print startup config
    print("\n" + "="*60)
    print("  AD USER CREATOR — STARTUP CONFIGURATION")
    print("="*60)
    print(f"  Environment : {app_config.env}")
    print(f"  AD Server   : {ad_config.server}:{ad_config.port}")
    print(f"  AD Domain   : {ad_config.domain}")
    print(f"  Base DN     : {ad_config.base_dn}")
    print(f"  Admin User  : {ad_config.admin_username}")
    print(f"  Dry Run     : {'YES [WARNING]' if ad_config.dry_run else 'NO (LIVE MODE)'}")
    print(f"  TLS/LDAPS   : {ad_config.use_tls}")
    print(f"  AI Ready    : {'YES' if gemini_config.api_key else 'NO (no API key)'}")
    print(f"  Docs        : http://localhost:8080/docs")
    print("="*60 + "\n")


# ── Root health check ─────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "service": "AD User Creator API",
        "version": "1.0.0",
        "status": "running",
        "dry_run": ad_config.dry_run,
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "dry_run": ad_config.dry_run}


# ── Global exception handler ──────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", str(exc), exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "message": str(exc)}
    )
