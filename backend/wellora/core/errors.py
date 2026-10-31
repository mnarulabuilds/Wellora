"""Domain errors and the FastAPI handlers that turn them into a uniform JSON shape.

Every error response looks like ``{"status": "error", "message": str, "detail"?: [...]}``.
"""

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from wellora.core.logging import logger


class WelloraError(Exception):
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class NotFoundError(WelloraError):
    status_code = status.HTTP_404_NOT_FOUND


class ConflictError(WelloraError):
    status_code = status.HTTP_409_CONFLICT


def _error(status_code: int, message: str, detail: list[str] | None = None) -> JSONResponse:
    body: dict = {"status": "error", "message": message}
    if detail:
        body["detail"] = detail
    return JSONResponse(status_code=status_code, content=body)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(WelloraError)
    async def _domain(_: Request, exc: WelloraError):
        return _error(exc.status_code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError):
        detail = []
        for err in exc.errors():
            loc = " -> ".join(str(part) for part in err["loc"] if part not in ("body", "query"))
            detail.append(f"{loc}: {err['msg']}" if loc else err["msg"])
        message = detail[0] if len(detail) == 1 else "Some fields are invalid."
        return _error(422, message, detail)

    @app.exception_handler(HTTPException)
    async def _http(_: Request, exc: HTTPException):
        return _error(exc.status_code, str(exc.detail))

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception):
        logger.error("Unhandled exception: %s", exc, exc_info=True)
        return _error(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Something went wrong on our side. Please try again.",
        )
