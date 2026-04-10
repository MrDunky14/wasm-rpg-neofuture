"""
Quiz API routes.

Endpoints:
  GET  /api/quiz/questions          → Fetch all quiz questions
  GET  /api/quiz/questions/{topic}  → Fetch questions for a specific topic
  POST /api/quiz/submit             → Submit answers and get scored result
"""

from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, HTTPException

from app.data.questions import QUESTION_BANK
from app.database import save_quiz_result
from app.models.schemas import (
    ConceptTopic,
    QuizQuestion,
    QuizResult,
    QuizSubmission,
    TopicScore,
)

router = APIRouter(prefix="/api/quiz", tags=["Quiz"])

# Pass threshold: student must get >= this fraction correct per topic to pass
PASS_THRESHOLD = 0.5


def _strip_answers(questions: list[dict]) -> list[dict]:
    """Remove correct_option and explanation from questions to prevent cheating."""
    return [
        {k: v for k, v in q.items() if k not in ("correct_option", "explanation")}
        for q in questions
    ]


@router.get("/questions")
async def get_all_questions(include_answers: bool = False):
    """Return all quiz questions. Answers are stripped unless include_answers=true (for admin/debug)."""
    if include_answers:
        return QUESTION_BANK
    return _strip_answers(QUESTION_BANK)


@router.get("/questions/{topic}")
async def get_questions_by_topic(topic: ConceptTopic, include_answers: bool = False):
    """Return quiz questions filtered by topic."""
    filtered = [q for q in QUESTION_BANK if q["topic"] == topic.value]
    if not filtered:
        raise HTTPException(status_code=404, detail=f"No questions found for topic: {topic}")
    if include_answers:
        return filtered
    return _strip_answers(filtered)


@router.post("/submit", response_model=QuizResult)
async def submit_quiz(submission: QuizSubmission):
    """
    Evaluate a quiz submission.

    Scores each answer, computes per-topic breakdown, and returns
    which topics the student failed (below PASS_THRESHOLD).
    """
    # Sanitize student_id
    submission.student_id = submission.student_id.strip()[:50] or "anonymous"

    # Build lookup: question_id → question data
    question_map = {q["id"]: q for q in QUESTION_BANK}

    # Validate: no duplicate question_ids in submission
    seen_ids = set()
    for answer in submission.answers:
        if answer.question_id in seen_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Duplicate question_id in submission: {answer.question_id}",
            )
        seen_ids.add(answer.question_id)
        if answer.question_id not in question_map:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid question_id: {answer.question_id}",
            )

    # Score each answer, grouped by topic
    topic_results: dict[str, dict[str, int]] = defaultdict(lambda: {"correct": 0, "total": 0})

    for answer in submission.answers:
        q = question_map[answer.question_id]
        topic = q["topic"]
        topic_results[topic]["total"] += 1
        if answer.selected_option == q["correct_option"]:
            topic_results[topic]["correct"] += 1

    # Build per-topic scores
    topic_scores: list[TopicScore] = []
    failed_topics: list[ConceptTopic] = []

    for topic_str, scores in topic_results.items():
        topic_enum = ConceptTopic(topic_str)
        ratio = scores["correct"] / scores["total"] if scores["total"] > 0 else 0
        passed = ratio >= PASS_THRESHOLD

        topic_scores.append(
            TopicScore(
                topic=topic_enum,
                correct=scores["correct"],
                total=scores["total"],
                passed=passed,
            )
        )

        if not passed:
            failed_topics.append(topic_enum)

    total_correct = sum(s.correct for s in topic_scores)
    total_questions = sum(s.total for s in topic_scores)
    percentage = (total_correct / total_questions * 100) if total_questions > 0 else 0

    # Persist result
    await save_quiz_result(
        student_id=submission.student_id,
        total_score=total_correct,
        total_questions=total_questions,
        percentage=percentage,
        failed_topics=[t.value for t in failed_topics],
    )

    return QuizResult(
        student_id=submission.student_id,
        total_score=total_correct,
        total_questions=total_questions,
        percentage=round(percentage, 1),
        topic_scores=topic_scores,
        failed_topics=failed_topics,
    )


# ── Demo Endpoints (Improvement #9 — reliable demo flow) ─────────────────

# Curated demo: 3 stack Qs (student will fail) + 3 sorting Qs (student will pass)
DEMO_QUESTION_IDS = [1, 2, 3, 7, 8, 9]

# Pre-set demo answers: wrong on stack, right on sorting → triggers Stack dungeon
DEMO_ANSWERS_FAIL_STACK = [
    {"question_id": 1, "selected_option": "a"},  # wrong (stack)
    {"question_id": 2, "selected_option": "a"},  # wrong (stack)
    {"question_id": 3, "selected_option": "b"},  # wrong (stack)
    {"question_id": 7, "selected_option": "b"},  # correct (sorting)
    {"question_id": 8, "selected_option": "c"},  # correct (sorting)
    {"question_id": 9, "selected_option": "b"},  # correct (sorting)
]


@router.get("/demo")
async def get_demo_quiz():
    """
    Return a curated 6-question demo quiz designed for live presentation.
    
    The demo is designed so the student fails 'stack' and passes 'sorting',
    triggering the handcrafted Stack dungeon for a reliable live demo.
    """
    question_map = {q["id"]: q for q in QUESTION_BANK}
    demo_questions = [question_map[qid] for qid in DEMO_QUESTION_IDS if qid in question_map]
    return {
        "questions": _strip_answers(demo_questions),
        "instructions": "Answer wrong on Stack questions, right on Sorting → triggers Stack dungeon",
        "preset_answers": DEMO_ANSWERS_FAIL_STACK,
        "expected_result": "Fails on 'stack' topic → generates The Tower of LIFO dungeon",
    }


@router.post("/demo/submit")
async def submit_demo_quiz():
    """
    Auto-submit the demo quiz with preset answers that fail on 'stack'.
    
    Use this for instant demo flow: call this → get result → immediately generate level.
    No user input needed.
    """
    from app.models.schemas import QuizAnswer
    demo_submission = QuizSubmission(
        student_id="demo_player",
        answers=[QuizAnswer(**a) for a in DEMO_ANSWERS_FAIL_STACK],
    )
    return await submit_quiz(demo_submission)

