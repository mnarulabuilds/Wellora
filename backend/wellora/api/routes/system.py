from fastapi import APIRouter

from wellora.core.config import settings
from wellora.core.dates import now_iso
from wellora.db.connection import get_connection

router = APIRouter(tags=["System"])


@router.get("/")
def root():
    return {
        "message": "Welcome to the Wellora Health Assistant API",
        "version": settings.app_version,
        "status": "ok",
    }


@router.get("/health")
def health_check():
    database = "connected"
    try:
        with get_connection() as conn:
            conn.execute("SELECT 1")
    except Exception:  # pragma: no cover - only when the disk is broken
        database = "unavailable"
    return {
        "status": "healthy" if database == "connected" else "degraded",
        "timestamp": now_iso(),
        "database": database,
        "version": settings.app_version,
    }
