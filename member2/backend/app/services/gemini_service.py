"""AI-backed lesson generation (Gemini/OpenRouter) with safe fallbacks."""

from __future__ import annotations

import asyncio
import json
import os
from typing import Any
from urllib import request as urlrequest


DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
DEFAULT_OPENROUTER_MODEL = "google/gemini-2.5-flash"
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_OPENROUTER_HTTP_TIMEOUT_SECONDS = 6
DEFAULT_PROVIDER_TIMEOUT_SECONDS = 5
DEFAULT_OPENROUTER_MAX_CANDIDATES = 2

DEFAULT_OPENROUTER_FALLBACK_MODELS = (
    "google/gemma-3-27b-it:free",
    "google/gemma-3-12b-it:free",
    "openai/gpt-oss-20b:free",
    "qwen/qwen3-coder:free",
    "meta-llama/llama-3.2-3b-instruct:free",
)

SUPPORTED_AI_PROVIDERS = {"auto", "gemini", "openrouter"}
FALLBACK_GEMINI_MODELS = (
    "gemini-2.5-flash",
    "models/gemini-2.5-flash",
    "models/gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "models/gemini-2.0-flash",
    "models/gemini-2.0-flash-lite",
)

DEFAULT_LESSONS: dict[str, dict[str, Any]] = {
    "stack": {
        "title": "Stack Fundamentals: Last In, First Out",
        "explanation": (
            "A stack works like a pile of plates. The last item you place is the first item you remove. "
            "The two core actions are push (add on top) and pop (remove from top). "
            "Stacks are useful for undo history, function call tracking, and expression parsing."
        ),
        "pseudocode": (
            "1) Start with an empty container.\n"
            "2) push(x): place x on top.\n"
            "3) pop(): remove and return top item if not empty.\n"
            "4) peek(): view top item without removing it."
        ),
        "example": "push 2, push 7, push 9, pop returns 9, peek returns 7.",
        "checkpoints": [
            "I can explain LIFO in one sentence.",
            "I can predict push/pop outcomes.",
            "I know where stacks appear in real systems.",
        ],
        "estimated_time_min": 5,
    },
    "queue": {
        "title": "Queue Basics: First In, First Out",
        "explanation": (
            "A queue is like a line at a ticket counter. The first person in line is served first. "
            "Core operations are enqueue (add to back) and dequeue (remove from front). "
            "Queues model scheduling, buffering, and breadth-first graph traversal."
        ),
        "pseudocode": (
            "1) Start empty.\n"
            "2) enqueue(x): add x to back.\n"
            "3) dequeue(): remove and return front item if available.\n"
            "4) front(): view next item without removing it."
        ),
        "example": "enqueue A, enqueue B, dequeue returns A, front returns B.",
        "checkpoints": [
            "I can explain FIFO.",
            "I can track front and rear mentally.",
            "I can identify queue use-cases.",
        ],
        "estimated_time_min": 5,
    },
    "sorting": {
        "title": "Sorting Fundamentals: Bringing Order",
        "explanation": (
            "Sorting arranges data into a chosen order, usually ascending. "
            "Common algorithms differ in speed and memory usage. "
            "When data is sorted, searching and reporting become much faster and easier."
        ),
        "pseudocode": (
            "Bubble-style idea:\n"
            "1) Compare neighboring values.\n"
            "2) Swap when left is greater than right.\n"
            "3) Repeat passes until no swaps happen."
        ),
        "example": "[5, 2, 8, 1] -> [2, 5, 8, 1] -> [2, 5, 1, 8] -> [2, 1, 5, 8] -> [1, 2, 5, 8].",
        "checkpoints": [
            "I can explain why sorting helps search.",
            "I can perform one pass of Bubble Sort.",
            "I understand what sorted output should look like.",
        ],
        "estimated_time_min": 6,
    },
    "binary_search": {
        "title": "Binary Search: Halving the Space",
        "explanation": (
            "Binary search works only on sorted data. "
            "At each step, check the middle value. If the target is smaller, go left; if larger, go right. "
            "This halves the search space each time, giving logarithmic performance."
        ),
        "pseudocode": (
            "1) Set low=0, high=n-1.\n"
            "2) While low <= high: mid=(low+high)//2.\n"
            "3) If arr[mid] == target, done.\n"
            "4) If target < arr[mid], high=mid-1 else low=mid+1."
        ),
        "example": "Find 19 in [3, 8, 12, 19, 27]: mid=12, then search right, then hit 19.",
        "checkpoints": [
            "I know data must be sorted first.",
            "I can update low/high correctly.",
            "I can estimate O(log n) behavior.",
        ],
        "estimated_time_min": 6,
    },
    "recursion": {
        "title": "Recursion: Solve Smaller Versions",
        "explanation": (
            "Recursion means a function calls itself on a smaller subproblem. "
            "Every recursive solution needs a base case that stops the calls. "
            "Without a base case, recursion overflows the call stack."
        ),
        "pseudocode": (
            "1) Define base case(s) with direct answer.\n"
            "2) Define recursive case that moves toward base case.\n"
            "3) Combine returned results if needed."
        ),
        "example": "factorial(4)=4*factorial(3)=4*3*2*1.",
        "checkpoints": [
            "I can identify base case.",
            "I can trace one recursive call chain.",
            "I know why stack depth matters.",
        ],
        "estimated_time_min": 6,
    },
    "linked_list": {
        "title": "Linked List: Nodes Connected by References",
        "explanation": (
            "A linked list stores items in nodes, where each node points to the next node. "
            "Insertion and deletion can be efficient when you already have a reference to the position. "
            "Random access is slower than arrays because traversal is sequential."
        ),
        "pseudocode": (
            "Node = {value, next}.\n"
            "Insert at head: new.next=head; head=new.\n"
            "Delete head: head=head.next."
        ),
        "example": "10 -> 20 -> 30. Insert 5 at head gives 5 -> 10 -> 20 -> 30.",
        "checkpoints": [
            "I can draw node + next pointer.",
            "I know head insertion steps.",
            "I understand why nth lookup is O(n).",
        ],
        "estimated_time_min": 6,
    },
    "graph_traversal": {
        "title": "Graph Traversal: BFS vs DFS",
        "explanation": (
            "Traversal explores vertices and edges in a graph. "
            "BFS explores level by level and typically uses a queue. "
            "DFS explores deep paths first and uses a stack or recursion."
        ),
        "pseudocode": (
            "BFS:\n"
            "1) push start to queue and mark visited.\n"
            "2) pop front, visit neighbors, enqueue unseen neighbors.\n"
            "DFS:\n"
            "1) visit node, mark visited.\n"
            "2) recursively visit unseen neighbors."
        ),
        "example": "For shortest steps in an unweighted graph, BFS is usually preferred.",
        "checkpoints": [
            "I can pick BFS vs DFS by goal.",
            "I know visited tracking is required.",
            "I can explain queue vs stack behavior.",
        ],
        "estimated_time_min": 6,
    },
    "math_algebra": {
        "title": "Algebra Patterns for Fast Problem Solving",
        "explanation": (
            "Algebra helps model unknown values and transform equations into solvable forms. "
            "In algorithmic thinking, this supports complexity analysis and formula-based reasoning. "
            "Focus on isolating variables and preserving equation balance."
        ),
        "pseudocode": (
            "1) Move constants to one side.\n"
            "2) Divide or multiply both sides consistently.\n"
            "3) Verify the result by substitution."
        ),
        "example": "3x - 9 = 0 -> 3x = 9 -> x = 3.",
        "checkpoints": [
            "I can isolate x in one-variable equations.",
            "I can verify solutions quickly.",
            "I can map word problems to equations.",
        ],
        "estimated_time_min": 5,
    },
}


def _extract_json_object(raw_text: str) -> str | None:
    text = raw_text.strip()
    if text.startswith("```"):
        lines = [line for line in text.splitlines() if not line.strip().startswith("```")]
        text = "\n".join(lines).strip()

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    return text[start : end + 1]


def _clean_text(value: Any, fallback: str) -> str:
    if isinstance(value, str):
        cleaned = value.strip()
        if cleaned:
            return cleaned
    return fallback


def _clean_list(value: Any, fallback: list[str]) -> list[str]:
    if not isinstance(value, list):
        return fallback

    cleaned_items: list[str] = []
    for item in value:
        if isinstance(item, str):
            normalized = item.strip()
            if normalized:
                cleaned_items.append(normalized)

    return cleaned_items[:6] if cleaned_items else fallback


def _build_default_lesson(topic: str, failed_concepts: list[str] | None = None) -> dict[str, Any]:
    base = DEFAULT_LESSONS.get(topic, DEFAULT_LESSONS["sorting"]).copy()
    focus = [concept.replace("_", " ") for concept in (failed_concepts or []) if concept]
    if focus:
        base["explanation"] = (
            f"{base['explanation']} Focus now on: {', '.join(focus[:3])}."
        )
    base["source"] = "fallback"
    return base


def _normalize_generated_lesson(
    parsed: dict[str, Any],
    default_lesson: dict[str, Any],
    source: str,
) -> dict[str, Any]:
    estimated = parsed.get("estimated_time_min", default_lesson["estimated_time_min"])
    try:
        estimated_int = int(estimated)
    except (TypeError, ValueError):
        estimated_int = int(default_lesson["estimated_time_min"])

    return {
        "title": _clean_text(parsed.get("title"), default_lesson["title"]),
        "explanation": _clean_text(parsed.get("explanation"), default_lesson["explanation"]),
        "pseudocode": _clean_text(parsed.get("pseudocode"), default_lesson["pseudocode"]),
        "example": _clean_text(parsed.get("example"), default_lesson["example"]),
        "checkpoints": _clean_list(parsed.get("checkpoints"), default_lesson["checkpoints"]),
        "estimated_time_min": max(3, min(15, estimated_int)),
        "source": source,
    }


async def _generate_with_gemini(prompt: str, default_lesson: dict[str, Any]) -> dict[str, Any] | None:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    try:
        import google.generativeai as genai
    except Exception:
        return None

    model_name = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL).strip() or DEFAULT_GEMINI_MODEL
    genai.configure(api_key=api_key)

    candidates = [model_name, *FALLBACK_GEMINI_MODELS]
    seen: set[str] = set()

    for candidate_model in candidates:
        if candidate_model in seen:
            continue
        seen.add(candidate_model)

        try:
            model = genai.GenerativeModel(model_name=candidate_model)
            response = await asyncio.to_thread(model.generate_content, prompt)
            raw_text = getattr(response, "text", "") or ""
            json_payload = _extract_json_object(raw_text)
            if not json_payload:
                continue

            parsed = json.loads(json_payload)
            return _normalize_generated_lesson(parsed, default_lesson, f"gemini:{candidate_model}")
        except Exception:
            continue

    return None


def _extract_openrouter_text(content: Any) -> str:
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts: list[str] = []
        for chunk in content:
            if isinstance(chunk, dict):
                text = chunk.get("text")
                if isinstance(text, str) and text.strip():
                    parts.append(text)
        return "\n".join(parts)

    return ""


async def _generate_with_openrouter(prompt: str, default_lesson: dict[str, Any]) -> dict[str, Any] | None:
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        return None

    model = os.getenv("OPENROUTER_MODEL", DEFAULT_OPENROUTER_MODEL).strip() or DEFAULT_OPENROUTER_MODEL
    configured_fallbacks = [
        candidate.strip()
        for candidate in os.getenv("OPENROUTER_FALLBACK_MODELS", "").split(",")
        if candidate.strip()
    ]

    candidate_models: list[str] = []
    seen_candidates: set[str] = set()
    for candidate in (model, *configured_fallbacks, *DEFAULT_OPENROUTER_FALLBACK_MODELS):
        if not candidate or candidate in seen_candidates:
            continue
        seen_candidates.add(candidate)
        candidate_models.append(candidate)

    app_name = os.getenv("OPENROUTER_APP_NAME", "wasm-rpg-neofuture").strip() or "wasm-rpg-neofuture"
    site_url = os.getenv("OPENROUTER_SITE_URL", "").strip()
    http_timeout_seconds = float(
        os.getenv("OPENROUTER_HTTP_TIMEOUT_SECONDS", str(DEFAULT_OPENROUTER_HTTP_TIMEOUT_SECONDS))
    )

    max_candidates = int(os.getenv("OPENROUTER_MAX_CANDIDATES", str(DEFAULT_OPENROUTER_MAX_CANDIDATES)))
    if max_candidates < 1:
        max_candidates = 1
    candidate_models = candidate_models[:max_candidates]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "X-Title": app_name,
    }
    if site_url:
        headers["HTTP-Referer"] = site_url

    def _send_request(model_name: str) -> dict[str, Any]:
        payload = {
            "model": model_name,
            "messages": [
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
        req = urlrequest.Request(
            OPENROUTER_API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        with urlrequest.urlopen(req, timeout=http_timeout_seconds) as response:
            raw = response.read().decode("utf-8")
        return json.loads(raw)

    for candidate_model in candidate_models:
        try:
            response_payload = await asyncio.to_thread(_send_request, candidate_model)
            choices = response_payload.get("choices")
            if not isinstance(choices, list) or not choices:
                continue

            first_choice = choices[0] if isinstance(choices[0], dict) else {}
            message = first_choice.get("message") if isinstance(first_choice, dict) else {}
            content = message.get("content") if isinstance(message, dict) else ""
            raw_text = _extract_openrouter_text(content)
            if not raw_text.strip():
                continue

            json_payload = _extract_json_object(raw_text)
            if not json_payload:
                continue

            parsed = json.loads(json_payload)
            return _normalize_generated_lesson(parsed, default_lesson, f"openrouter:{candidate_model}")
        except Exception:
            continue

    return None


async def generate_lesson(topic: str, failed_concepts: list[str] | None = None) -> dict[str, Any]:
    """Generate a short lesson using configured AI provider, with deterministic fallback content."""
    default_lesson = _build_default_lesson(topic, failed_concepts)

    requested_provider = os.getenv("LESSON_AI_PROVIDER", "auto").strip().lower()
    if requested_provider not in SUPPORTED_AI_PROVIDERS:
        requested_provider = "auto"

    focus_text = ", ".join(failed_concepts[:4]) if failed_concepts else "core fundamentals"

    prompt = (
        "Create a beginner-friendly DSA mini-lesson in strict JSON. "
        f"Topic: {topic}. Learner is weak in: {focus_text}. "
        "Use simple language and no markdown. "
        "Return ONLY this JSON shape: "
        "{"
        '"title": string, '
        '"explanation": string, '
        '"pseudocode": string, '
        '"example": string, '
        '"checkpoints": string array, '
        '"estimated_time_min": integer'
        "}."
    )

    provider_timeout_seconds = float(
        os.getenv("LESSON_PROVIDER_TIMEOUT_SECONDS", str(DEFAULT_PROVIDER_TIMEOUT_SECONDS))
    )

    async def run_provider_with_timeout(provider) -> dict[str, Any] | None:
        try:
            return await asyncio.wait_for(
                provider(prompt, default_lesson),
                timeout=provider_timeout_seconds,
            )
        except Exception:
            return None

    if requested_provider == "gemini":
        generated = await run_provider_with_timeout(_generate_with_gemini)
        return generated or default_lesson

    if requested_provider == "openrouter":
        generated = await run_provider_with_timeout(_generate_with_openrouter)
        return generated or default_lesson

    # auto mode: prefer OpenRouter when key is present (helps when Gemini quota is exhausted)
    providers = []
    if os.getenv("OPENROUTER_API_KEY", "").strip():
        providers.append(_generate_with_openrouter)
    if os.getenv("GEMINI_API_KEY", "").strip():
        providers.append(_generate_with_gemini)

    for provider in providers:
        generated = await run_provider_with_timeout(provider)
        if generated:
            return generated

    return default_lesson


async def grade_answer_with_ai(question: str, student_answer: str, correct_answer: str | None = None) -> dict[str, Any]:
    """
    Grade a free-text student answer using AI via OpenRouter.
    Includes retry logic for rate limiting (429 errors) with exponential backoff.
    GUARANTEES: is_correct is always returned as a boolean (safe for damage logic).
    
    Args:
        question: The question/prompt the student answered
        student_answer: The student's response
        correct_answer: Optional reference answer for context
    
    Returns:
        {
            "is_correct": bool (guaranteed - never confused with errors),
            "confidence": float (0.0-1.0),
            "reasoning": str,
            "source": str ("openrouter", "fallback:reason")
        }
    """
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        # Fallback: conservative verdict when AI is unavailable.
        return {
            "is_correct": False,
            "confidence": 0.0,
            "reasoning": "AI grading unavailable; unable to verify answer right now",
            "source": "fallback:no_api_key",
        }

    model = os.getenv("OPENROUTER_MODEL", DEFAULT_OPENROUTER_MODEL).strip() or DEFAULT_OPENROUTER_MODEL
    http_timeout_seconds = float(
        os.getenv("OPENROUTER_HTTP_TIMEOUT_SECONDS", str(DEFAULT_OPENROUTER_HTTP_TIMEOUT_SECONDS))
    )
    provider_timeout_seconds = float(
        os.getenv("GRADE_PROVIDER_TIMEOUT_SECONDS", "3")
    )

    app_name = os.getenv("OPENROUTER_APP_NAME", "wasm-rpg-neofuture").strip() or "wasm-rpg-neofuture"
    site_url = os.getenv("OPENROUTER_SITE_URL", "").strip()

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "X-Title": app_name,
    }
    if site_url:
        headers["HTTP-Referer"] = site_url

    # Build grading prompt
    reference_text = f"\nReference answer (if provided): {correct_answer}" if correct_answer else ""
    grading_prompt = (
        f"You are a strict but fair DSA (Data Structures & Algorithms) grading assistant. "
        f"Grade this student answer and provide a JSON response.\n\n"
        f"Question: {question}\n"
        f"Student Answer: {student_answer}"
        f"{reference_text}\n\n"
        f"Respond with ONLY this JSON (no markdown, no explanation):\n"
        f"{{\n"
        f'  "is_correct": boolean,\n'
        f'  "confidence": number between 0.0 and 1.0,\n'
        f'  "reasoning": "brief explanation (1-2 sentences)"\n'
        f"}}"
    )

    def _send_grading_request(model_name: str) -> dict[str, Any]:
        payload = {
            "model": model_name,
            "messages": [
                {"role": "user", "content": grading_prompt},
            ],
            "temperature": 0.1,  # Low temp for consistent grading
            "max_tokens": 150,
        }
        req = urlrequest.Request(
            OPENROUTER_API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with urlrequest.urlopen(req, timeout=http_timeout_seconds) as response:
                raw = response.read().decode("utf-8")
            return {"status": "success", "data": json.loads(raw)}
        except Exception as e:
            # Capture HTTP errors including 429
            return {"status": "error", "error": e}

    def _normalize_is_correct(value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return value != 0
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"true", "1", "yes", "y"}:
                return True
            if normalized in {"false", "0", "no", "n", ""}:
                return False
        return False

    # Retry logic with exponential backoff for rate limiting (429 errors)
    max_retries = 3
    base_wait_seconds = 1
    
    for attempt in range(max_retries):
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(_send_grading_request, model),
                timeout=provider_timeout_seconds,
            )
            
            if result["status"] == "error":
                error = result["error"]
                # Check for 429 (Too Many Requests) from urllib
                if hasattr(error, 'code') and error.code == 429:
                    if attempt < max_retries - 1:
                        # Exponential backoff: wait 1s, 2s, 4s before retry
                        wait_seconds = base_wait_seconds * (2 ** attempt)
                        await asyncio.sleep(wait_seconds)
                        continue
                    else:
                        # Final retry failed, return conservative fallback.
                        return {
                            "is_correct": False,
                            "confidence": 0.0,
                            "reasoning": "AI rate-limited; unable to verify answer right now",
                            "source": "fallback:rate_limit",
                        }
                else:
                    # Other errors - propagate
                    raise error
            
            # Success - process response
            response_payload = result["data"]
            choices = response_payload.get("choices", [])
            if not choices:
                return {
                    "is_correct": False,
                    "confidence": 0.0,
                    "reasoning": "No response from AI",
                    "source": "fallback:no_response",
                }

            first_choice = choices[0] if isinstance(choices[0], dict) else {}
            message = first_choice.get("message", {}) if isinstance(first_choice, dict) else {}
            content = message.get("content", "") if isinstance(message, dict) else ""
            
            if not isinstance(content, str):
                content = ""
            
            raw_text = _extract_openrouter_text(content)
            
            json_payload = _extract_json_object(raw_text)
            if not json_payload:
                return {
                    "is_correct": False,
                    "confidence": 0.0,
                    "reasoning": "Invalid AI response format",
                    "source": "fallback:parse_error",
                }

            parsed = json.loads(json_payload)
            
            # Validate and normalize response - GUARANTEE: is_correct is always bool
            is_correct = _normalize_is_correct(parsed.get("is_correct", False))
            try:
                confidence = float(parsed.get("confidence", 0.5))
            except (TypeError, ValueError):
                confidence = 0.5
            confidence = max(0.0, min(1.0, confidence))  # Clamp to [0, 1]
            reasoning = str(parsed.get("reasoning", "")).strip()[:200]
            
            return {
                "is_correct": is_correct,
                "confidence": confidence,
                "reasoning": reasoning,
                "source": f"openrouter:{model}",
            }
            
        except asyncio.TimeoutError:
            if attempt < max_retries - 1:
                wait_seconds = base_wait_seconds * (2 ** attempt)
                await asyncio.sleep(wait_seconds)
                continue
            return {
                "is_correct": False,
                "confidence": 0.0,
                "reasoning": "AI grading timeout; consider answer incorrect",
                "source": "fallback:timeout",
            }
        except Exception as e:
            if attempt < max_retries - 1:
                wait_seconds = base_wait_seconds * (2 ** attempt)
                await asyncio.sleep(wait_seconds)
                continue
            return {
                "is_correct": False,
                "confidence": 0.0,
                "reasoning": f"AI grading error: {str(e)[:50]}",
                "source": "fallback:error",
            }
