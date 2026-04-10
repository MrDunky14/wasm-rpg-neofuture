"""
WASM-RPG Backend — FastAPI Application Entry Point.

This is the main server that provides:
  - Quiz question management & scoring
  - Dynamic dungeon level generation from quiz failures
  - Student progress tracking
  - CORS for frontend communication
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import close_db
from app.routes import level, progress, quiz


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
# Allow all origins in development. In production, restrict to your domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ───────────────────────────────────────────────────────────────
app.include_router(quiz.router)
app.include_router(level.router)
app.include_router(progress.router)


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
            "progress": "/api/progress/{student_id}",
            "docs": "/docs",
        },
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
