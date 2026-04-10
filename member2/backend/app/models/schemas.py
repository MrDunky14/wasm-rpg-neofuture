"""
Pydantic models for WASM-RPG API request/response validation.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ── Enums ──────────────────────────────────────────────────────────────────

class ConceptTopic(str, Enum):
    STACK = "stack"
    QUEUE = "queue"
    SORTING = "sorting"
    BINARY_SEARCH = "binary_search"
    RECURSION = "recursion"
    LINKED_LIST = "linked_list"
    GRAPH_TRAVERSAL = "graph_traversal"
    MATH_ALGEBRA = "math_algebra"


class Difficulty(int, Enum):
    EASY = 1
    MEDIUM = 2
    HARD = 3


class GenerationMode(str, Enum):
    PROCEDURAL = "procedural"
    HYBRID = "hybrid"
    PREBUILT = "prebuilt"


# ── Quiz Models ────────────────────────────────────────────────────────────

class QuizOption(BaseModel):
    id: str = Field(..., description="Option identifier (a, b, c, d)")
    text: str


class QuizQuestion(BaseModel):
    id: int
    topic: ConceptTopic
    question: str
    options: list[QuizOption]
    correct_option: str = Field(..., pattern=r"^[a-d]$")
    explanation: str = ""


class QuizAnswer(BaseModel):
    question_id: int
    selected_option: str = Field(..., pattern=r"^[a-d]$")


class QuizSubmission(BaseModel):
    student_id: str = "anonymous"
    answers: list[QuizAnswer] = Field(..., min_length=1)


class TopicScore(BaseModel):
    topic: ConceptTopic
    correct: int
    total: int
    passed: bool


class QuizResult(BaseModel):
    student_id: str
    total_score: int
    total_questions: int
    percentage: float
    topic_scores: list[TopicScore]
    failed_topics: list[ConceptTopic]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ── Level / Dungeon Models ─────────────────────────────────────────────────

class Position(BaseModel):
    x: int
    y: int


class EnemyData(BaseModel):
    type: str
    x: int
    y: int
    hp: int = 30
    damage: int = 10
    concept_question: str = ""


class BossData(BaseModel):
    type: str
    hp: int = 100
    damage: int = 20
    mechanic_type: str
    question_sequence: list[str] = Field(default_factory=list)
    damage_per_wrong_answer: int = 25


class ObjectiveData(BaseModel):
    x: int
    y: int
    type: str = "reach_exit"


class LevelPayload(BaseModel):
    level_name: str
    concept: ConceptTopic
    difficulty: Difficulty = Difficulty.MEDIUM
    width: int = Field(default=20, ge=10, le=50)
    height: int = Field(default=15, ge=10, le=50)
    tiles: list[list[int]]
    player_start: Position
    objective: ObjectiveData
    enemies: list[EnemyData] = Field(default_factory=list)
    boss: Optional[BossData] = None


class LevelGenerateRequest(BaseModel):
    failed_topics: list[ConceptTopic] = Field(..., min_length=1)
    difficulty: Difficulty = Difficulty.MEDIUM
    generation_mode: GenerationMode = GenerationMode.PROCEDURAL
    width: Optional[int] = Field(default=None, ge=10, le=50)
    height: Optional[int] = Field(default=None, ge=10, le=50)
    seed: Optional[int] = None


# ── Lesson Models ──────────────────────────────────────────────────────────

class LessonGenerateRequest(BaseModel):
    student_id: str = "anonymous"
    topic: ConceptTopic
    failed_concepts: list[str] = Field(default_factory=list, max_length=8)


class LessonResponse(BaseModel):
    topic: ConceptTopic
    title: str
    explanation: str
    pseudocode: str
    example: str
    checkpoints: list[str] = Field(default_factory=list)
    estimated_time_min: int = Field(default=5, ge=3, le=15)
    source: str = "fallback"


# ── Progress Models ────────────────────────────────────────────────────────

class ProgressSave(BaseModel):
    student_id: str
    level_name: str
    concept: ConceptTopic
    completed: bool = False
    time_seconds: int = Field(default=0, ge=0)
    score: int = Field(default=0, ge=0)
    boss_defeated: bool = False


class ProgressRecord(ProgressSave):
    id: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ProgressHistory(BaseModel):
    student_id: str
    records: list[ProgressRecord]
    total_levels_completed: int
    total_bosses_defeated: int


# ── Telemetry & Analytics Models ──────────────────────────────────────────

class TelemetryEvent(BaseModel):
    """Base event for analytics and A/B testing."""
    event_type: str  # quiz_started, quiz_completed, dungeon_started, dungeon_completed, boss_defeated, etc.
    student_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    session_id: str = Field(default="", description="Unique session identifier")
    data: dict = Field(default_factory=dict, description="Event-specific metadata")


class QuizCompletedEvent(TelemetryEvent):
    """Fired when student completes quiz."""
    event_type: str = "quiz_completed"
    total_score: float
    topic_scores: dict[str, float]  # {"stack": 0.8, "queue": 0.5, ...}
    failed_topics: list[str]
    time_seconds: int


class DungeonStartedEvent(TelemetryEvent):
    """Fired when student enters dungeon."""
    event_type: str = "dungeon_started"
    concept: ConceptTopic
    difficulty: int  # 1=Easy, 2=Medium, 3=Hard
    level_seed: int


class DungeonCompletedEvent(TelemetryEvent):
    """Fired when student completes or quits dungeon."""
    event_type: str = "dungeon_completed"
    concept: ConceptTopic
    difficulty: int
    completed: bool
    time_seconds: int
    boss_defeated: bool
    quality_score: float = Field(default=0.0, description="Dungeon quality (0-100)")


class BossDefeatedEvent(TelemetryEvent):
    """Fired when student defeats boss."""
    event_type: str = "boss_defeated"
    concept: ConceptTopic
    correct_answers: int
    total_questions: int
    time_seconds: int


class KPIMetric(BaseModel):
    """Computed KPI for student performance on concept."""
    concept: ConceptTopic
    accuracy: float  # 0.0-1.0
    speed: float  # avg seconds per question
    attempts: int  # number of times attempted
    mastery_score: float  # weighted: accuracy * (speed_bonus) * (attempts_bonus)
