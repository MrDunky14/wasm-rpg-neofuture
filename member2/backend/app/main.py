"""
WASM-RPG Backend — FastAPI Application Entry Point.

This is the main server that provides:
  - Quiz question management & scoring
  - Dynamic dungeon level generation from quiz failures
  - Student progress tracking
  - CORS for frontend communication
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import close_db
from app.routes import grading, lesson, level, progress, quiz, telemetry


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
env = os.getenv('ENV', 'development').lower()
if env == 'production':
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
