# ---------- runtime image ----------
FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    WELLORA_DB_PATH=/data/wellora.db
WORKDIR /app

# tzdata lets the TZ env var control what "today" means for daily summaries and dose reminders.
RUN apt-get update && apt-get install -y --no-install-recommends tzdata && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home --uid 10001 wellora && mkdir -p /data && chown wellora:wellora /data

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY wellora ./wellora

USER wellora
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health').status == 200 else 1)"
CMD ["uvicorn", "wellora.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]

# ---------- test image (lint + unit/API tests) ----------
FROM runtime AS test
USER root
COPY requirements-dev.txt pyproject.toml ./
RUN pip install -r requirements-dev.txt
COPY tests ./tests
USER wellora
CMD ["sh", "-c", "ruff check . && ruff format --check . && pytest --cov=wellora --cov-report=term"]
