"""
Level generation API routes.

Endpoints:
  POST /api/level/generate     → Generate dungeon level(s) from failed topics
  GET  /api/level/preview      → Quick preview of a single topic's dungeon
  GET  /api/level/prebuilt     → Return a handcrafted pre-built level (reliable for demos)
  GET  /api/level/list-prebuilt → List all available pre-built levels
"""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    ConceptTopic,
    Difficulty,
    GenerationMode,
    LevelGenerateRequest,
    LevelPayload,
)
from app.services.level_generator import generate_level

router = APIRouter(prefix="/api/level", tags=["Level Generation"])

# Pre-built levels directory
LEVELS_DIR = Path(__file__).resolve().parent.parent.parent / "levels"

# Map of topic → pre-built JSON filename
PREBUILT_LEVELS: dict[str, str] = {
    "stack": "stack_dungeon.json",
    "queue": "queue_dungeon.json",
    "sorting": "sorting_dungeon.json",
}


def _load_prebuilt(topic: str) -> dict | None:
    """Load a pre-built level JSON file for the given topic."""
    filename = PREBUILT_LEVELS.get(topic)
    if not filename:
        return None
    filepath = LEVELS_DIR / filename
    if not filepath.exists():
        return None
    with open(filepath, "r") as f:
        return json.load(f)


def _derive_topic_seed(base_seed: int | None, index: int, topic: ConceptTopic) -> int | None:
    """Build a deterministic per-topic seed from one base seed."""
    if base_seed is None:
        return None
    topic_salt = sum((i + 1) * ord(ch) for i, ch in enumerate(topic.value))
    return int(base_seed) + (index * 7919) + topic_salt


@router.post("/generate", response_model=list[LevelPayload])
async def generate_levels(request: LevelGenerateRequest):
    """
    Generate dungeon levels based on the student's failed quiz topics.

    Default mode is procedural-first for better variety.
    Modes:
      - procedural: always procedural generation
      - hybrid: pre-built when available, procedural fallback
      - prebuilt: attempt pre-built first, procedural fallback if missing
    """
    width = request.width or 20
    height = request.height or 15
    mode = request.generation_mode

    levels = []
    for idx, topic in enumerate(request.failed_topics):
        level_seed = _derive_topic_seed(request.seed, idx, topic)

        use_prebuilt = mode in (GenerationMode.HYBRID, GenerationMode.PREBUILT)
        prebuilt = _load_prebuilt(topic.value) if use_prebuilt else None

        if prebuilt is not None:
            levels.append(prebuilt)
            continue

        level = generate_level(
            topic,
            request.difficulty,
            width=width,
            height=height,
            seed=level_seed,
        )
        levels.append(level.model_dump())
    return levels


@router.get("/preview")
async def preview_level(
    topic: ConceptTopic = Query(..., description="Topic to preview"),
    difficulty: Difficulty = Query(Difficulty.MEDIUM, description="Difficulty level"),
    width: int = Query(20, ge=10, le=50),
    height: int = Query(15, ge=10, le=50),
    seed: int | None = Query(None, description="Random seed for reproducible layouts"),
    use_prebuilt: bool = Query(True, description="Use pre-built level if available"),
):
    """
    Preview a single dungeon level. Uses pre-built level by default (for demos),
    set use_prebuilt=false for procedurally generated levels.
    """
    if use_prebuilt:
        prebuilt = _load_prebuilt(topic.value)
        if prebuilt:
            return prebuilt
    return generate_level(topic, difficulty, width, height, seed)


@router.get("/prebuilt/{topic}")
async def get_prebuilt_level(topic: str):
    """Return a specific pre-built handcrafted level by topic name."""
    data = _load_prebuilt(topic)
    if not data:
        available = list(PREBUILT_LEVELS.keys())
        raise HTTPException(
            status_code=404,
            detail=f"No pre-built level for topic '{topic}'. Available: {available}",
        )
    return data


@router.get("/list-prebuilt")
async def list_prebuilt_levels():
    """List all available pre-built levels."""
    available = []
    for topic, filename in PREBUILT_LEVELS.items():
        filepath = LEVELS_DIR / filename
        available.append({
            "topic": topic,
            "filename": filename,
            "exists": filepath.exists(),
        })
    return {"levels": available}
