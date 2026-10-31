"""ASGI entrypoint: ``uvicorn wellora.main:app``."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from wellora.api.router import api_router
from wellora.core.config import settings
from wellora.core.errors import register_exception_handlers
from wellora.core.logging import configure_logging, logger
from wellora.db.seed import init_db


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    init_db()
    logger.info("Wellora API %s ready (db=%s)", settings.app_version, settings.db_path)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_title,
        description=settings.app_description,
        version=settings.app_version,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials="*" not in settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)
    app.include_router(api_router)
    return app


app = create_app()
