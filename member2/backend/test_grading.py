"""Test script for AI-powered answer grading endpoint."""

import asyncio
import json
import os
from pathlib import Path

# Load environment variables from .env file
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()

from app.services.gemini_service import grade_answer_with_ai


async def test_grading():
    """Test the grade_answer_with_ai function."""
    
    test_cases = [
        {
            "question": "What does LIFO mean in the context of stacks?",
            "answer": "Last In First Out",
        },
        {
            "question": "Explain push and pop operations on a stack.",
            "answer": "Push adds an element to the top, pop removes from the top",
        },
        {
            "question": "What is a queue and how does FIFO apply?",
            "answer": "A queue follows First-In-First-Out order, like a line",
        },
        {
            "question": "Describe binary search.",
            "answer": "Search algorithm that requires data to be sorted, halves search space each time",
        },
    ]
    
    print("Testing AI answer grading...\n")
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"Test {i}:")
        print(f"  Question: {test_case['question']}")
        print(f"  Answer: {test_case['answer']}")
        
        result = await grade_answer_with_ai(
            question=test_case['question'],
            student_answer=test_case['answer'],
        )
        
        print(f"  Result: {json.dumps(result, indent=2)}")
        print()


if __name__ == "__main__":
    asyncio.run(test_grading())
