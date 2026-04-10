"""
Answer grading routes — AI-powered evaluation of student responses.

Endpoints:
  POST /api/grade/answer  → Grade a free-text student answer using AI
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.gemini_service import grade_answer_with_ai

router = APIRouter(prefix="/api/grade", tags=["Grading"])


class GradeAnswerRequest(BaseModel):
    """Request to grade a student answer."""
    question: str = Field(..., description="The question/prompt")
    student_answer: str = Field(..., description="Student's response")
    correct_answer: str | None = Field(None, description="Optional reference answer")


class GradeAnswerResponse(BaseModel):
    """AI grading response with verdict and confidence."""
    is_correct: bool = Field(..., description="Whether the answer is correct")
    confidence: float = Field(..., description="Confidence score (0.0-1.0)")
    reasoning: str = Field(..., description="Brief explanation of the grade")
    source: str = Field(..., description="Grading source (e.g., openrouter:model_name or fallback:reason)")


@router.post("/answer", response_model=GradeAnswerResponse)
async def grade_student_answer(request: GradeAnswerRequest) -> dict:
    """
    Grade a free-text student answer using AI.
    
    This endpoint evaluates student responses to DSA concept questions using
    OpenRouter's AI models. Falls back to lenient validation if AI is unavailable.
    
    Args:
        request.question: The question the student answered
        request.student_answer: The student's response
        request.correct_answer: Optional reference answer for context
    
    Returns:
        GradeAnswerResponse with is_correct, confidence, and reasoning
    """
    if not request.student_answer.strip():
        raise HTTPException(status_code=400, detail="Student answer cannot be empty")
    
    result = await grade_answer_with_ai(
        question=request.question,
        student_answer=request.student_answer,
        correct_answer=request.correct_answer,
    )
    
    return result
