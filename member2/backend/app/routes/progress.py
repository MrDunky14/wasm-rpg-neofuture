"""
Progress tracking API routes.

Endpoints:
  POST /api/progress/save       → Save game completion data
  GET  /api/progress/{student}  → Get progress history for a student
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.database import get_progress, save_progress
from app.models.schemas import ProgressHistory, ProgressRecord, ProgressSave

router = APIRouter(prefix="/api/progress", tags=["Progress"])


@router.post("/save", response_model=dict)
async def save_game_progress(data: ProgressSave):
    """Save a progress record after a dungeon run."""
    row_id = await save_progress(
        student_id=data.student_id,
        level_name=data.level_name,
        concept=data.concept.value,
        completed=data.completed,
        time_seconds=data.time_seconds,
        score=data.score,
        boss_defeated=data.boss_defeated,
    )
    return {"status": "saved", "id": row_id}


@router.get("/{student_id}", response_model=ProgressHistory)
async def get_student_progress(student_id: str):
    """Retrieve full progress history for a student."""
    rows = await get_progress(student_id)

    records = []
    for row in rows:
        records.append(
            ProgressRecord(
                id=row["id"],
                student_id=row["student_id"],
                level_name=row["level_name"],
                concept=row["concept"],
                completed=bool(row["completed"]),
                time_seconds=row["time_seconds"],
                score=row["score"],
                boss_defeated=bool(row["boss_defeated"]),
            )
        )

    return ProgressHistory(
        student_id=student_id,
        records=records,
        total_levels_completed=sum(1 for r in records if r.completed),
        total_bosses_defeated=sum(1 for r in records if r.boss_defeated),
    )
