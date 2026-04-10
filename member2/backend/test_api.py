"""Extended API test — validates all endpoints including new improvements."""
from collections import deque
import json
import urllib.request

BASE = "http://localhost:8000"

def get(path):
    r = urllib.request.urlopen(f"{BASE}{path}")
    return json.loads(r.read())

def post(path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers={"Content-Type": "application/json"})
    r = urllib.request.urlopen(req)
    return json.loads(r.read())


def _is_reachable(level):
    tiles = level["tiles"]
    width = level["width"]
    height = level["height"]
    start = level["player_start"]
    objective = level["objective"]

    sx, sy = start["x"], start["y"]
    ox, oy = objective["x"], objective["y"]

    if not (0 <= sx < width and 0 <= sy < height):
        return False
    if not (0 <= ox < width and 0 <= oy < height):
        return False

    walkable = {0, 2, 3, 4}
    if tiles[sy][sx] not in walkable or tiles[oy][ox] not in walkable:
        return False

    seen = {(sx, sy)}
    q = deque([(sx, sy)])
    while q:
        x, y = q.popleft()
        if (x, y) == (ox, oy):
            return True
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= width or ny >= height:
                continue
            if (nx, ny) in seen:
                continue
            if tiles[ny][nx] not in walkable:
                continue
            seen.add((nx, ny))
            q.append((nx, ny))

    return False


def _level_signature(level):
    enemies = sorted((e["x"], e["y"], e.get("type", "")) for e in level.get("enemies", []))
    return json.dumps(
        {
            "width": level["width"],
            "height": level["height"],
            "tiles": level["tiles"],
            "player_start": level["player_start"],
            "objective": level["objective"],
            "enemies": enemies,
        },
        sort_keys=True,
    )

passed = 0
failed = 0

def test(name, condition):
    global passed, failed
    if condition:
        print(f"  PASS: {name}")
        passed += 1
    else:
        print(f"  FAIL: {name}")
        failed += 1

print("=" * 60)

# Test 1: Root
print("\nTEST 1: GET /")
root = get("/")
test("status is running", root["status"] == "running")

# Test 2: All questions
print("\nTEST 2: GET /api/quiz/questions")
questions = get("/api/quiz/questions")
test("24 questions returned", len(questions) == 24)
test("answers NOT leaked", "correct_option" not in questions[0])
test("explanation NOT leaked", "explanation" not in questions[0])

# Test 3: Questions by topic
print("\nTEST 3: GET /api/quiz/questions/stack")
stack_qs = get("/api/quiz/questions/stack")
test("3 stack questions", len(stack_qs) == 3)

# Test 4: Questions WITH answers (admin mode)
print("\nTEST 4: GET /api/quiz/questions?include_answers=true")
admin_qs = get("/api/quiz/questions?include_answers=true")
test("answers included when requested", "correct_option" in admin_qs[0])

# Test 5: Quiz submission
print("\nTEST 5: POST /api/quiz/submit")
result = post("/api/quiz/submit", {
    "student_id": "tester",
    "answers": [
        {"question_id": 1, "selected_option": "a"},
        {"question_id": 2, "selected_option": "c"},
        {"question_id": 7, "selected_option": "b"},
    ]
})
test("score calculated", result["total_score"] >= 0)
test("failed_topics is list", isinstance(result["failed_topics"], list))

# Test 6: Demo quiz
print("\nTEST 6: GET /api/quiz/demo")
demo = get("/api/quiz/demo")
test("demo has questions", len(demo["questions"]) == 6)
test("demo has preset_answers", len(demo["preset_answers"]) == 6)
test("demo has instructions", "instructions" in demo)

# Test 7: Demo auto-submit
print("\nTEST 7: POST /api/quiz/demo/submit")
demo_result = post("/api/quiz/demo/submit", {})
test("demo student is demo_player", demo_result["student_id"] == "demo_player")
test("demo fails stack", "stack" in demo_result["failed_topics"])
test("demo passes sorting", "sorting" not in demo_result["failed_topics"])

# Test 8: List pre-built levels
print("\nTEST 8: GET /api/level/list-prebuilt")
prebuilt_list = get("/api/level/list-prebuilt")
test("3 pre-built levels", len(prebuilt_list["levels"]) == 3)
topics = [l["topic"] for l in prebuilt_list["levels"]]
test("stack in prebuilt", "stack" in topics)
test("queue in prebuilt", "queue" in topics)
test("sorting in prebuilt", "sorting" in topics)

# Test 9: Get pre-built level
print("\nTEST 9: GET /api/level/prebuilt/stack")
stack_level = get("/api/level/prebuilt/stack")
test("level name correct", stack_level["level_name"] == "The Tower of LIFO")
test("has tiles", len(stack_level["tiles"]) > 0)
test("has boss", stack_level["boss"] is not None)

# Test 10: Generate level from failed topics (procedural-first)
print("\nTEST 10: POST /api/level/generate (procedural-first)")
base_payload = {
    "failed_topics": ["stack"],
    "difficulty": 2,
    "width": 26,
    "height": 18,
    "seed": 42,
}
levels = post("/api/level/generate", base_payload)
test("1 level generated", len(levels) == 1)
test("procedural dimensions honored", levels[0]["width"] == 26 and levels[0]["height"] == 18)
test("objective reachable", _is_reachable(levels[0]))

# Test 10b: Deterministic generation with the same seed
print("\nTEST 10b: Deterministic generation with seed")
levels_same_seed = post("/api/level/generate", base_payload)
test(
    "same seed produces same layout",
    _level_signature(levels_same_seed[0]) == _level_signature(levels[0]),
)

# Test 10c: Different seed should alter layout
print("\nTEST 10c: Different seed variation")
levels_diff_seed = post("/api/level/generate", {**base_payload, "seed": 43})
test(
    "different seed changes layout",
    _level_signature(levels_diff_seed[0]) != _level_signature(levels[0]),
)

# Test 10d: Prebuilt mode can still be requested explicitly
print("\nTEST 10d: POST /api/level/generate (prebuilt mode)")
prebuilt_mode = post("/api/level/generate", {
    "failed_topics": ["stack"],
    "difficulty": 2,
    "generation_mode": "prebuilt",
    "width": 26,
    "height": 18,
    "seed": 42,
})
test("prebuilt mode returns one level", len(prebuilt_mode) == 1)
test("prebuilt mode returns curated stack level", prebuilt_mode[0]["level_name"] == "The Tower of LIFO")

# Test 11: Level preview
print("\nTEST 11: GET /api/level/preview?topic=queue")
preview = get("/api/level/preview?topic=queue")
test("queue prebuilt used", preview["level_name"] == "The Queue Caverns")

# Test 12: Level preview (procedural fallback)
print("\nTEST 12: GET /api/level/preview?topic=recursion&use_prebuilt=false")
proc = get("/api/level/preview?topic=recursion&use_prebuilt=false")
test("procedural fallback works", proc["level_name"] == "The Infinite Descent")
test("preview layout is reachable", _is_reachable(proc))

# Test 13: Progress save
print("\nTEST 13: POST /api/progress/save")
save_r = post("/api/progress/save", {
    "student_id": "tester",
    "level_name": "The Tower of LIFO",
    "concept": "stack",
    "completed": True,
    "time_seconds": 120,
    "score": 900,
    "boss_defeated": True
})
test("save successful", save_r["status"] == "saved")

# Test 14: Progress history
print("\nTEST 14: GET /api/progress/tester")
history = get("/api/progress/tester")
test("has records", len(history["records"]) > 0)
test("level completed counted", history["total_levels_completed"] >= 1)

# Test 15: Shared level schema exists
print("\nTEST 15: Shared level schema")
import os
schema_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "shared", "level_schema.json")
test("level_schema.json exists", os.path.isfile(schema_path))

print("\n" + "=" * 60)
print(f"RESULTS: {passed} passed, {failed} failed out of {passed + failed} tests")
if failed == 0:
    print("ALL TESTS PASSED!")
else:
    print("SOME TESTS FAILED!")
    exit(1)
