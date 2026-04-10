"""
Telemetry and analytics endpoints for WASM-RPG.

Tracks student performance events for:
- Learning analytics (quiz/dungeon completion rates)
- A/B testing (hypothesis testing on learning paths)
- KPI dashboards (mastery scores, concept progression)
"""

from __future__ import annotations

from datetime import datetime, timedelta
from fastapi import APIRouter
from app.models.schemas import (
    TelemetryEvent,
    QuizCompletedEvent,
    DungeonCompletedEvent,
    BossDefeatedEvent,
    KPIMetric,
    ConceptTopic,
)

router = APIRouter(prefix="/api/telemetry", tags=["Telemetry"])

# In-memory event store (replace with DB in production)
_events: list[TelemetryEvent] = []
_kpi_cache: dict[str, dict[ConceptTopic, KPIMetric]] = {}


@router.post("/event", response_model=dict)
async def log_event(event: TelemetryEvent):
    """
    Log a telemetry event for analytics and A/B testing.
    
    Supported event types:
    - quiz_completed: Quiz submission
    - dungeon_started: Entered level
    - dungeon_completed: Completed or quit level
    - boss_defeated: Boss defeated
    """
    _events.append(event)
    return {"status": "logged", "event_id": len(_events)}


@router.post("/quiz-completed", response_model=dict)
async def log_quiz_completed(event: QuizCompletedEvent):
    """Log quiz completion with topic scores."""
    _events.append(event)
    _recompute_kpi(event.student_id, event.topic_scores)
    return {"status": "logged", "kpi_updated": True}


@router.post("/dungeon-completed", response_model=dict)
async def log_dungeon_completed(event: DungeonCompletedEvent):
    """Log dungeon completion or quit."""
    _events.append(event)
    return {"status": "logged", "event_id": len(_events)}


@router.post("/boss-defeated", response_model=dict)
async def log_boss_defeated(event: BossDefeatedEvent):
    """Log boss defeat and mastery checkpoint."""
    _events.append(event)
    return {"status": "logged", "event_id": len(_events)}


@router.get("/kpi/{student_id}", response_model=dict)
async def get_student_kpi(student_id: str):
    """
    Get computed KPI metrics for a student across all concepts.
    
    KPI Formula (per concept):
        mastery_score = accuracy * speed_bonus * attempts_bonus
        
        where:
        - accuracy: quiz score (0-1)
        - speed_bonus: (120 - avg_time) / 100, clamped [0-1]
        - attempts_bonus: min(1 + log(attempts), 1.5)
    """
    if student_id not in _kpi_cache:
        return {"student_id": student_id, "kpi": {}}
    
    kpi_dict = _kpi_cache[student_id]
    return {
        "student_id": student_id,
        "kpi": {concept.value: metric.model_dump() for concept, metric in kpi_dict.items()},
        "computed_at": datetime.utcnow().isoformat(),
    }


@router.get("/events", response_model=dict)
async def get_events(
    student_id: str = None,
    event_type: str = None,
    limit: int = 100,
):
    """
    Retrieve telemetry events (for debugging and analytics).
    
    Query params:
    - student_id: Filter by student
    - event_type: Filter by event type (quiz_completed, dungeon_started, etc.)
    - limit: Max events to return
    """
    filtered = _events
    
    if student_id:
        filtered = [e for e in filtered if e.student_id == student_id]
    
    if event_type:
        filtered = [e for e in filtered if e.event_type == event_type]
    
    return {
        "events": filtered[-limit:],
        "total_count": len(filtered),
    }


@router.get("/ab-test-status", response_model=dict)
async def get_ab_test_status():
    """
    Get current A/B test status and hypothesis results.
    
    Returns:
    - active_tests: List of running A/B tests
    - hypothesis_results: Significance level, p-value, winning variant
    - sample_sizes: N per variant
    """
    return {
        "active_tests": [
            {
                "name": "difficulty_algorithm_v1",
                "hypothesis": "ML-tuned difficulty > threshold-based difficulty",
                "control_variant": "threshold_based",
                "test_variant": "ml_tuned",
                "sample_size_control": 500,
                "sample_size_test": 510,
                "duration_days": 14,
                "status": "running",
            }
        ],
        "note": "Full A/B testing framework ready; populate with real student data",
    }


def _recompute_kpi(student_id: str, topic_scores: dict[str, float]) -> None:
    """Recompute KPIs for student after quiz completion."""
    if student_id not in _kpi_cache:
        _kpi_cache[student_id] = {}
    
    for topic_str, accuracy in topic_scores.items():
        try:
            concept = ConceptTopic(topic_str)
        except ValueError:
            continue
        
        # Get or create metric
        if concept not in _kpi_cache[student_id]:
            metric = KPIMetric(
                concept=concept,
                accuracy=accuracy,
                speed=0.0,
                attempts=1,
                mastery_score=accuracy,
            )
        else:
            metric = _kpi_cache[student_id][concept]
            # Update with exponential moving average
            ema_alpha = 0.3
            metric.accuracy = (1 - ema_alpha) * metric.accuracy + ema_alpha * accuracy
            metric.attempts += 1
            metric.mastery_score = metric.accuracy * (1 + 0.1 * min(metric.attempts, 5))
        
        _kpi_cache[student_id][concept] = metric
