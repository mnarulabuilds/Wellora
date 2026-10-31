"""Application settings, loaded from environment variables.

Settings are read once at import time into a mutable singleton so that tests
can point the app at a throwaway database by assigning ``settings.db_path``.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_list(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


@dataclass
class Settings:
    app_title: str = "Wellora API"
    app_description: str = (
        "Holistic health assistant API: nutrition & macro tracking, sleep and recovery, "
        "habits, weight, vitals, medication reminders, weekly reports and an NLP coach."
    )
    app_version: str = "3.0.0"
    db_path: Path = field(
        default_factory=lambda: Path(os.getenv("WELLORA_DB_PATH", str(BACKEND_DIR / "wellora.db")))
    )
    cors_origins: list[str] = field(default_factory=lambda: _env_list("CORS_ORIGINS", "*"))
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO").upper())
    seed_demo_data: bool = field(default_factory=lambda: _env_bool("WELLORA_SEED_DEMO", False))


settings = Settings()
