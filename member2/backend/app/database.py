"""
Async SQLite database layer with WAL mode for concurrent access.
"""

from __future__ import annotations

import json
from pathlib import Path

import aiosqlite

DB_PATH = Path(__file__).resolve().parent.parent / "database.db"
_db: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        _db = await aiosqlite.connect(str(DB_PATH))
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _init_tables(_db)
    return _db


async def close_db() -> None:
    global _db
    if _db is not None:
        await _db.close()
        _db = None


async def _init_tables(db: aiosqlite.Connection) -> None:
    await db.executescript("""
        CREATE TABLE IF NOT EXISTS quiz_results (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id  TEXT    NOT NULL DEFAULT 'anonymous',
            total_score INTEGER NOT NULL,
            total_q     INTEGER NOT NULL,
            percentage  REAL    NOT NULL,
            failed_topics TEXT  NOT NULL DEFAULT '[]',
            created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS progress (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id    TEXT    NOT NULL,
            level_name    TEXT    NOT NULL,
            concept       TEXT    NOT NULL,
            completed     INTEGER NOT NULL DEFAULT 0,
            time_seconds  INTEGER NOT NULL DEFAULT 0,
            score         INTEGER NOT NULL DEFAULT 0,
            boss_defeated INTEGER NOT NULL DEFAULT 0,
            created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_progress_student ON progress(student_id);
        CREATE INDEX IF NOT EXISTS idx_quiz_student ON quiz_results(student_id);
    """)
    await db.commit()


async def save_quiz_result(
    student_id: str, total_score: int, total_questions: int,
    percentage: float, failed_topics: list[str],
) -> int:
    db = await get_db()
    cursor = await db.execute(
        "INSERT INTO quiz_results (student_id, total_score, total_q, percentage, failed_topics) VALUES (?, ?, ?, ?, ?)",
        (student_id, total_score, total_questions, percentage, json.dumps(failed_topics)),
    )
    await db.commit()
    return cursor.lastrowid


async def save_progress(
    student_id: str, level_name: str, concept: str,
    completed: bool, time_seconds: int, score: int, boss_defeated: bool,
) -> int:
    db = await get_db()
    cursor = await db.execute(
        "INSERT INTO progress (student_id, level_name, concept, completed, time_seconds, score, boss_defeated) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (student_id, level_name, concept, int(completed), time_seconds, score, int(boss_defeated)),
    )
    await db.commit()
    return cursor.lastrowid


async def get_progress(student_id: str) -> list[dict]:
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM progress WHERE student_id = ? ORDER BY created_at DESC",
        (student_id,),
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]
