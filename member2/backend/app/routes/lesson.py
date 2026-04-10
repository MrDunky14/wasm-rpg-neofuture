"""Lesson API routes for AI-generated micro-learning content."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.models.schemas import ConceptTopic, LessonGenerateRequest, LessonResponse
from app.services.gemini_service import generate_lesson

router = APIRouter(prefix="/api/lesson", tags=["Lessons"])

_lesson_cache: dict[str, LessonResponse] = {}


def _safe_fallback_payload(topic: ConceptTopic) -> dict:
    readable_topic = topic.value.replace("_", " ")
    return {
        "title": f"{readable_topic.title()} quick lesson",
        "explanation": (
            f"This is a fallback lesson for {readable_topic}. "
            "Focus on the core definition, one worked example, and one checkpoint question."
        ),
        "pseudocode": "1) Define the concept\n2) Apply it once\n3) Check your understanding",
        "example": f"Work a small {readable_topic} example from start to finish.",
        "checkpoints": [
            "I can explain this concept in one sentence.",
            "I can solve one simple example.",
            "I can identify when to use this concept.",
        ],
        "estimated_time_min": 5,
        "source": "fallback",
    }


def _cache_key(student_id: str, topic: ConceptTopic) -> str:
    safe_student = student_id.strip().lower()[:50] or "anonymous"
    return f"{safe_student}:{topic.value}"


def _build_response(topic: ConceptTopic, payload: dict) -> LessonResponse:
    checkpoints = payload.get("checkpoints")
    if not isinstance(checkpoints, list):
        checkpoints = []

    return LessonResponse(
        topic=topic,
        title=str(payload.get("title", f"{topic.value.title()} Lesson")),
        explanation=str(payload.get("explanation", "")),
        pseudocode=str(payload.get("pseudocode", "")),
        example=str(payload.get("example", "")),
        checkpoints=[str(item) for item in checkpoints][:6],
        estimated_time_min=int(payload.get("estimated_time_min", 5)),
        source=str(payload.get("source", "fallback")),
    )


@router.post("/generate", response_model=LessonResponse)
async def generate_topic_lesson(request: LessonGenerateRequest):
    """Generate and cache a lesson for a student+topic pair."""
    student_id = request.student_id.strip()[:50] or "anonymous"
    key = _cache_key(student_id, request.topic)

    cached = _lesson_cache.get(key)
    if cached:
        return cached

    try:
        payload = await generate_lesson(request.topic.value, request.failed_concepts)
    except Exception:
        payload = _safe_fallback_payload(request.topic)

    lesson = _build_response(request.topic, payload)
    _lesson_cache[key] = lesson
    return lesson


@router.get("/{topic}", response_model=LessonResponse)
async def get_topic_lesson(topic: ConceptTopic, student_id: str = Query("anonymous")):
    """Get an existing lesson from cache or generate a fresh lesson."""
    key = _cache_key(student_id, topic)

    cached = _lesson_cache.get(key)
    if cached:
        return cached

    try:
        payload = await generate_lesson(topic.value, [])
    except Exception:
        payload = _safe_fallback_payload(topic)

    lesson = _build_response(topic, payload)
    _lesson_cache[key] = lesson
    return lesson
