"""
WASM-RPG Backend — FastAPI Application Entry Point.

This is the main server that provides:
  - Quiz question management & scoring
  - Dynamic dungeon level generation from quiz failures
  - Student progress tracking
  - CORS for frontend communication
"""

from __future__ import annotations

from collections import defaultdict, deque
import logging
import os
from contextlib import asynccontextmanager
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import close_db
from app.routes import grading, lesson, level, progress, quiz, telemetry


def _parse_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


def _parse_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        parsed = int(raw)
    except ValueError:
        return default
    return parsed if parsed > 0 else default


class InMemorySlidingWindowLimiter:
    """Simple in-memory rate limiter for single-process deployments."""

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._events: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, client_key: str) -> tuple[bool, int]:
        now = time.monotonic()
        history = self._events[client_key]
        cutoff = now - self.window_seconds

        while history and history[0] <= cutoff:
            history.popleft()

        if len(history) >= self.max_requests:
            retry_after = max(1, int(self.window_seconds - (now - history[0])))
            return False, retry_after

        history.append(now)
        return True, 0


ENVIRONMENT = os.getenv("ENV", "development").strip().lower()
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").strip().upper()
LOG_HEALTHCHECKS = _parse_bool("LOG_HEALTHCHECKS", False)

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("wasm_rpg.api")

RATE_LIMIT_ENABLED = _parse_bool("RATE_LIMIT_ENABLED", ENVIRONMENT == "production")
RATE_LIMIT_REQUESTS = _parse_int("RATE_LIMIT_REQUESTS", 120)
RATE_LIMIT_WINDOW_SECONDS = _parse_int("RATE_LIMIT_WINDOW_SECONDS", 60)
RATE_LIMIT_EXEMPT_PATHS = tuple(
    path.strip()
    for path in os.getenv(
        "RATE_LIMIT_EXEMPT_PATHS",
        "/health,/docs,/openapi.json,/redoc",
    ).split(",")
    if path.strip()
)

rate_limiter = InMemorySlidingWindowLimiter(
    max_requests=RATE_LIMIT_REQUESTS,
    window_seconds=RATE_LIMIT_WINDOW_SECONDS,
) if RATE_LIMIT_ENABLED else None


def _resolve_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "").strip()
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _is_exempt_path(path: str) -> bool:
    for prefix in RATE_LIMIT_EXEMPT_PATHS:
        if path == prefix or path.startswith(f"{prefix}/"):
            return True
    return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle handler."""
    yield
    # Cleanup: close DB on shutdown
    await close_db()


app = FastAPI(
    title="WASM-RPG API",
    description=(
        "Backend for the Adaptive Native-Speed Learning Engine. "
        "Serves diagnostic quizzes, generates concept-based dungeon levels, "
        "and tracks student progress."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────
# In development: allow all origins. In production: restrict to specific domains.
if ENVIRONMENT == 'production':
    # Production: restrict CORS to specific frontend domains
    # Configure via CORS_ORIGINS environment variable (comma-separated)
    cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')
    allow_credentials = False  # Don't allow credentials with specific origins unless truly needed
else:
    # Development: more permissive for local testing
    cors_origins = ['*']
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    path = request.url.path
    should_log = LOG_HEALTHCHECKS or path != "/health"
    client_ip = _resolve_client_ip(request)
    request_id = uuid.uuid4().hex[:12]
    started_at = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.perf_counter() - started_at) * 1000
        if should_log:
            logger.exception(
                "request_failed method=%s path=%s client_ip=%s request_id=%s duration_ms=%.2f",
                request.method,
                path,
                client_ip,
                request_id,
                duration_ms,
            )
        raise

    response.headers["X-Request-Id"] = request_id
    duration_ms = (time.perf_counter() - started_at) * 1000
    if should_log:
        logger.info(
            "request method=%s path=%s status=%s client_ip=%s request_id=%s duration_ms=%.2f",
            request.method,
            path,
            response.status_code,
            client_ip,
            request_id,
            duration_ms,
        )
    return response


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if not RATE_LIMIT_ENABLED or rate_limiter is None or _is_exempt_path(request.url.path):
        return await call_next(request)

    client_ip = _resolve_client_ip(request)
    allowed, retry_after = rate_limiter.allow(client_ip)
    if not allowed:
        logger.warning(
            "rate_limited method=%s path=%s client_ip=%s retry_after=%s",
            request.method,
            request.url.path,
            client_ip,
            retry_after,
        )
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Please retry shortly."},
            headers={"Retry-After": str(retry_after)},
        )

    return await call_next(request)

# ── Routes ───────────────────────────────────────────────────────────────
app.include_router(quiz.router)
app.include_router(level.router)
app.include_router(progress.router)
app.include_router(lesson.router)
app.include_router(grading.router)
app.include_router(telemetry.router)


# ── Health / Root ────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "WASM-RPG API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "quiz": "/api/quiz/questions",
            "submit": "/api/quiz/submit",
            "level": "/api/level/generate",
            "preview": "/api/level/preview",
            "lesson": "/api/lesson/generate",
            "progress": "/api/progress/{student_id}",
            "telemetry": "/api/telemetry/events",
            "kpi": "/api/telemetry/kpi/{student_id}",
            "ab_test": "/api/telemetry/ab-test-status",
            "docs": "/docs",
        },
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
