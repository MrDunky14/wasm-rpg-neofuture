# WASM-RPG — Design Answers & Architecture Document

> **Generated:** 2026-04-11
> **Scope:** Answers to all 8 design prompts from `CLAUDE_OPUS_PROMPTS.md`
> **Architecture:** FastAPI (Python 3.12) + React 18/TypeScript + Vite + Gemini/OpenRouter AI

---

## Table of Contents

1. [Level Architecture System](#1-level-architecture-system)
2. [Dungeon Quality Score (0–100)](#2-dungeon-quality-score-0100)
3. [Adaptive Difficulty Engine](#3-adaptive-difficulty-engine)
4. [Boss Question Pipeline](#4-boss-question-pipeline)
5. [Multi-Provider Reliability Pipeline](#5-multi-provider-reliability-pipeline)
6. [Learning Loop UX & Dropout Prevention](#6-learning-loop-ux--dropout-prevention)
7. [Telemetry, Analytics & A/B Testing](#7-telemetry-analytics--ab-testing)
8. [Technical Debt & Refactoring Roadmap](#8-technical-debt--refactoring-roadmap)

---

## 1. Level Architecture System

### 1.1 Five Dungeon Templates

#### Template A: Linear Chain
```
[Start] → [Room 2] → [Room 3] → [Room 4] → [Boss Arena]
```
- **Room graph:** Strictly sequential, 4–6 rooms in a line with 1 optional side branch
- **Feel:** Tight, focused, "gauntlet" pacing—student always feels forward momentum
- **Enemy pacing:** Gradual ramp — 1 enemy in room 1, 2 in room 2, mini-boss in room 4, boss in final
- **Objective placement:** End of chain (classic). Optional mini-objective in side branch
- **Difficulty scaling:**
  - **Easy:** 4 rooms, wide corridors, 1 side branch for health pickup
  - **Medium:** 5 rooms, narrower corridors, enemies block doorways
  - **Hard:** 6 rooms, dead-end traps, locked doors requiring key pickups

#### Template B: Central Hub
```
         [Wing 1]
            ↑
[Wing 4] ← [HUB] → [Wing 2]
            ↓
         [Wing 3 (Boss)]
```
- **Room graph:** 1 large central room with 3–5 radial wings, each wing 1–3 rooms deep
- **Feel:** Open, exploratory—student chooses order, rewards non-linear play
- **Enemy pacing:** Hub has 0 enemies (safe zone). Each wing has escalating difficulty. Student can retreat to hub
- **Objective placement:** Primary objective in deepest wing. Mini-objectives scattered (one per wing tip)
- **Difficulty scaling:**
  - **Easy:** 3 wings, 1 room each, hub has health regen zone
  - **Medium:** 4 wings, 2 rooms deep, one wing requires key from another
  - **Hard:** 5 wings, 2–3 rooms deep, hub has roaming enemies after 2 wings cleared

#### Template C: Branching Tree
```
              [Start]
             /       \
        [Branch A]  [Branch B]
        /    \          |
    [Leaf]  [Leaf]  [Boss Arena]
```
- **Room graph:** Binary-tree-like. Start at root, player chooses left/right at each fork
- **Feel:** Decision-heavy—every fork matters. Some branches are dead-ends with rewards
- **Enemy pacing:** Spread evenly. Dead-end branches have treasure + 1 strong enemy (risk/reward)
- **Objective placement:** Boss arena at a random leaf (not always deepest). Mini-objectives at other leaves
- **Difficulty scaling:**
  - **Easy:** Depth 2, binary splits, dead-ends clearly marked
  - **Medium:** Depth 3, some branches loop back, hidden rooms
  - **Hard:** Depth 3–4, dead-end traps (enemies + no reward), unmarked paths

#### Template D: Diamond / Ring
```
        [Start]
       /       \
   [Left]     [Right]
       \       /
        [Merge]
          |
        [Boss]
```
- **Room graph:** Two parallel paths converge at a merge point before the boss
- **Feel:** Strategic—student must choose a path. Each path has different challenge type (combat vs puzzle)
- **Enemy pacing:** Left path: many weak enemies. Right path: few strong enemies. Merge room has mini-boss
- **Objective placement:** Merge room is primary checkpoint. Boss after merge. Mini-objectives per path
- **Difficulty scaling:**
  - **Easy:** 2-room paths, both paths equally difficult
  - **Medium:** 3-room paths, one path harder but has better rewards
  - **Hard:** 3-room paths + optional secret branch off one side, merge room has ambush

#### Template E: Open Hall (Arena)
```
[Start] → [Large Open Room with Zones] → [Boss Corner]
```
- **Room graph:** 1–2 massive rooms divided into tile zones (not separate rooms, but zoned areas)
- **Feel:** Chaotic, arcade-like—good for action-focused concepts. Less exploration, more combat
- **Enemy pacing:** Waves spawn as student moves through zones. Boss appears after clearing X enemies
- **Objective placement:** Boss in far corner, but must clear 3 sub-zones first. Mini-objectives scattered as pickups
- **Difficulty scaling:**
  - **Easy:** 2 zones, enemies spawn in waves of 2, health pickups abundant
  - **Medium:** 3 zones, enemies spawn in waves of 3–4, limited health
  - **Hard:** 4 zones, enemies spawn continuously until sub-objective solved, no health pickups

### 1.2 Template Selection Logic

```python
def select_template(concept: str, difficulty: str, student_history: list, seed: int) -> str:
    """
    Select dungeon template based on concept + variety.
    Avoids repeating same template within last 3 dungeons.
    """
    TEMPLATES = ["linear_chain", "hub", "branching_tree", "diamond", "open_hall"]

    CONCEPT_TEMPLATE_WEIGHTS = {
        "sorting": {"linear_chain": 0.3, "diamond": 0.3, "open_hall": 0.2, "hub": 0.1, "branching_tree": 0.1},
        "recursion": {"branching_tree": 0.4, "hub": 0.2, "diamond": 0.2, "linear_chain": 0.1, "open_hall": 0.1},
        "graph_traversal": {"hub": 0.3, "branching_tree": 0.3, "diamond": 0.2, "linear_chain": 0.1, "open_hall": 0.1},
        "dynamic_programming": {"diamond": 0.3, "linear_chain": 0.3, "branching_tree": 0.2, "hub": 0.1, "open_hall": 0.1},
        "searching": {"linear_chain": 0.3, "branching_tree": 0.3, "hub": 0.2, "diamond": 0.1, "open_hall": 0.1},
    }

    weights = CONCEPT_TEMPLATE_WEIGHTS.get(concept, {t: 0.2 for t in TEMPLATES})

    # Penalize recently-used templates
    recent_templates = [h["template"] for h in student_history[-3:]]
    for t in recent_templates:
        if t in weights:
            weights[t] *= 0.1  # 90% penalty

    # Weighted random selection with seed
    rng = Random(seed)
    return rng.choices(list(weights.keys()), weights=list(weights.values()), k=1)[0]
```

### 1.3 Generation Function Signature

```python
def generate_dungeon(
    template_type: str,       # "linear_chain" | "hub" | "branching_tree" | "diamond" | "open_hall"
    width: int,               # Tile grid width (e.g., 64)
    height: int,              # Tile grid height (e.g., 64)
    difficulty: str,          # "easy" | "medium" | "hard"
    seed: int,                # Deterministic seed
    concept: str = "",        # Algorithm concept for theming
) -> DungeonPayload:
    """
    Control flow:
    1. Select room count from template config (e.g., hub=5-9, linear=4-6)
    2. Generate room graph structure per template rules
    3. Place rooms on tile grid (no overlap, minimum spacing)
    4. Connect rooms via MST backbone + template-specific extra edges
    5. Place start position (varies by template, not always top-left)
    6. Place primary objective (varies by template)
    7. Place enemies using template pacing strategy
    8. Place boss in template-designated arena
    9. Place mini-objectives (0-3 based on template)
    10. Validate reachability (BFS from start to all objectives + boss)
    11. Calculate quality score (see Section 2)
    12. If score < 40, regenerate (max 3 attempts)
    13. Return DungeonPayload(tiles, enemies, boss, objectives, metadata)
    """
    pass

@dataclass
class DungeonPayload:
    tiles: list[list[int]]          # 2D grid: 0=floor, 1=wall, 2=door, 3=enemy_spawn, 4=objective
    enemies: list[EnemyData]        # [{type, hp, damage, position, behavior}]
    boss: BossData                  # {type, hp, damage, position, concept_question_id}
    objectives: list[ObjectiveData] # [{type, position, required}]
    start_position: tuple[int, int]
    template_type: str
    quality_score: float
    seed: int
    metadata: dict                  # {room_count, path_length, generation_time_ms}
```

### 1.4 Reachability Guarantee

All templates maintain BFS-validated reachability:
- After room placement + corridor generation, run BFS from start tile
- All objective tiles, boss tile, and enemy spawn tiles must be reachable
- If unreachable, add corridor links until connected (max 3 bridge corridors)
- If still unreachable after 3 attempts, regenerate layout with same seed+1

---

## 2. Dungeon Quality Score (0–100)

### 2.1 Category Breakdown

#### Category 1: Exploration (0–25 points, weight: 25%)

| Metric | Measurement | Good Range | Score Formula |
|--------|-------------|------------|---------------|
| **Path length ratio** | BFS shortest path from start to objective ÷ dungeon diagonal | 0.4–1.2 | `min(path_ratio / 1.2 * 10, 10)` |
| **Dead-end ratio** | Rooms with exactly 1 exit ÷ total rooms | 0.1–0.35 | `10 if 0.1 ≤ ratio ≤ 0.35 else 10 - abs(ratio - 0.225) * 40` |
| **Decision points** | Rooms with 3+ exits ÷ total rooms | 0.15–0.4 | `5 if 0.15 ≤ ratio ≤ 0.4 else 0` |

```python
def score_exploration(tiles, rooms, start, objective) -> float:
    path_length = bfs_shortest_path(tiles, start, objective)
    diagonal = math.sqrt(len(tiles)**2 + len(tiles[0])**2)
    path_ratio = path_length / diagonal

    path_score = min(path_ratio / 1.2, 1.0) * 10

    dead_ends = sum(1 for r in rooms if r.exit_count == 1)
    dead_end_ratio = dead_ends / len(rooms)
    dead_end_score = 10 if 0.1 <= dead_end_ratio <= 0.35 else max(0, 10 - abs(dead_end_ratio - 0.225) * 40)

    decision_rooms = sum(1 for r in rooms if r.exit_count >= 3)
    decision_ratio = decision_rooms / len(rooms)
    decision_score = 5 if 0.15 <= decision_ratio <= 0.4 else max(0, 5 - abs(decision_ratio - 0.275) * 20)

    return path_score + dead_end_score + decision_score  # Max 25
```

#### Category 2: Pacing (0–20 points, weight: 20%)

| Metric | Measurement | Good Range | Score Formula |
|--------|-------------|------------|---------------|
| **Enemy spacing** | Avg tile distance between consecutive enemies along path | 8–20 tiles | `7 if 8 ≤ spacing ≤ 20 else max(0, 7 - abs(spacing-14)*0.5)` |
| **Difficulty ramp** | Correlation between room_distance_from_start and enemy_strength | r > 0.3 | `7 if corr > 0.3 else max(0, corr/0.3 * 7)` |
| **Boss differential** | Boss HP relative to strongest non-boss enemy | 1.5x–3x | `6 if 1.5 ≤ ratio ≤ 3 else max(0, 6 - abs(ratio-2.25)*3)` |

```python
def score_pacing(enemies, boss, rooms, start) -> float:
    # Enemy spacing along primary path
    enemy_positions = sorted(enemies, key=lambda e: bfs_dist(start, e.position))
    spacings = [dist(enemy_positions[i], enemy_positions[i+1]) for i in range(len(enemy_positions)-1)]
    avg_spacing = mean(spacings) if spacings else 0
    spacing_score = 7 if 8 <= avg_spacing <= 20 else max(0, 7 - abs(avg_spacing - 14) * 0.5)

    # Difficulty progression
    distances = [bfs_dist(start, e.position) for e in enemies]
    strengths = [e.hp * e.damage for e in enemies]
    corr = pearson_correlation(distances, strengths) if len(enemies) > 2 else 0
    ramp_score = 7 if corr > 0.3 else max(0, (corr / 0.3) * 7)

    # Boss differential
    max_enemy_hp = max(e.hp for e in enemies) if enemies else 1
    boss_ratio = boss.hp / max_enemy_hp
    boss_score = 6 if 1.5 <= boss_ratio <= 3 else max(0, 6 - abs(boss_ratio - 2.25) * 3)

    return spacing_score + ramp_score + boss_score  # Max 20
```

#### Category 3: Layout (0–20 points, weight: 20%)

| Metric | Measurement | Good Range | Score Formula |
|--------|-------------|------------|---------------|
| **Room size variance** | std(room_areas) / mean(room_areas) (CV) | 0.2–0.6 | `8 if 0.2 ≤ cv ≤ 0.6 else max(0, 8 - abs(cv-0.4)*20)` |
| **Symmetry break** | Mirror similarity score (flip + compare) | < 0.7 (dissimilar) | `6 if sim < 0.7 else max(0, 6 - (sim-0.7)*20)` |
| **Corridor efficiency** | Total corridor tiles / total floor tiles | 0.15–0.4 | `6 if 0.15 ≤ ratio ≤ 0.4 else max(0, 6 - abs(ratio-0.275)*25)` |

```python
def score_layout(tiles, rooms) -> float:
    areas = [r.width * r.height for r in rooms]
    cv = stdev(areas) / mean(areas) if mean(areas) > 0 else 0
    size_score = 8 if 0.2 <= cv <= 0.6 else max(0, 8 - abs(cv - 0.4) * 20)

    # Mirror similarity (horizontal flip comparison)
    flipped = [row[::-1] for row in tiles]
    matching = sum(1 for y in range(len(tiles)) for x in range(len(tiles[0])) if tiles[y][x] == flipped[y][x])
    similarity = matching / (len(tiles) * len(tiles[0]))
    symmetry_score = 6 if similarity < 0.7 else max(0, 6 - (similarity - 0.7) * 20)

    # Corridor efficiency
    floor_count = sum(1 for row in tiles for t in row if t == 0)
    corridor_tiles = floor_count - sum(r.width * r.height for r in rooms)
    corridor_ratio = corridor_tiles / floor_count if floor_count > 0 else 0
    corridor_score = 6 if 0.15 <= corridor_ratio <= 0.4 else max(0, 6 - abs(corridor_ratio - 0.275) * 25)

    return size_score + symmetry_score + corridor_score  # Max 20
```

#### Category 4: Reachability (0–15 points, weight: 15%)

| Metric | Measurement | Good / Bad |
|--------|-------------|-----------|
| **Objective reachable** | BFS from start reaches objective tile | Pass=10, Fail=0 |
| **All enemies reachable** | BFS from start reaches all enemy spawn tiles | Pass=3, Fail=0 |
| **No cornered objectives** | Objective has ≥2 adjacent floor tiles | Pass=2, Fail=0 |

```python
def score_reachability(tiles, start, objective, enemies) -> float:
    reachable = bfs_reachable_set(tiles, start)

    obj_score = 10 if objective in reachable else 0
    enemy_score = 3 if all(e.position in reachable for e in enemies) else 0

    # Objective not in dead corner
    adj_floors = count_adjacent_floor(tiles, objective)
    corner_score = 2 if adj_floors >= 2 else 0

    return obj_score + enemy_score + corner_score  # Max 15
```

#### Category 5: Concept Fit (0–20 points, weight: 20%)

| Metric | Measurement | Score |
|--------|-------------|-------|
| **Enemy type matches concept** | ≥50% of enemies have concept-aligned type | 8 if yes, 4 if partial, 0 if no |
| **Boss is concept-appropriate** | Boss type/name relates to concept | 6 if yes, 0 if no |
| **Objectives are concept-relevant** | Objective descriptions mention concept | 6 if yes, 3 if partial, 0 if no |

```python
CONCEPT_KEYWORDS = {
    "sorting": ["sort", "bubble", "merge", "quick", "swap", "compare", "order"],
    "recursion": ["recurse", "recursive", "stack", "base case", "call", "fractal"],
    "graph_traversal": ["graph", "bfs", "dfs", "traverse", "node", "edge", "path"],
    "dynamic_programming": ["dp", "memoize", "subproblem", "tabulate", "optimize"],
    "searching": ["search", "binary", "linear", "find", "lookup", "index"],
}

def score_concept_fit(concept, enemies, boss, objectives) -> float:
    keywords = CONCEPT_KEYWORDS.get(concept, [])

    # Enemy type matching
    matching_enemies = sum(1 for e in enemies if any(k in e.type.lower() for k in keywords))
    enemy_ratio = matching_enemies / len(enemies) if enemies else 0
    enemy_score = 8 if enemy_ratio >= 0.5 else (4 if enemy_ratio >= 0.25 else 0)

    # Boss matching
    boss_match = any(k in boss.type.lower() for k in keywords)
    boss_score = 6 if boss_match else 0

    # Objective matching
    obj_matches = sum(1 for o in objectives if any(k in o.description.lower() for k in keywords))
    obj_ratio = obj_matches / len(objectives) if objectives else 0
    obj_score = 6 if obj_ratio >= 0.5 else (3 if obj_ratio >= 0.25 else 0)

    return enemy_score + boss_score + obj_score  # Max 20
```

### 2.2 Weight Justification & Final Score

| Category | Weight | Justification |
|----------|--------|---------------|
| Exploration | 25% | Core differentiator — this is what makes dungeons *feel* different |
| Pacing | 20% | Directly impacts frustration/boredom (retention driver) |
| Layout | 20% | Visual variety prevents "same dungeon" fatigue |
| Reachability | 15% | Non-negotiable (bugs = broken game), but pass/fail nature limits weight |
| Concept Fit | 20% | Educational alignment is the game's unique value proposition |

```python
def calculate_quality_score(tiles, rooms, start, objective, enemies, boss, objectives, concept) -> float:
    exploration = score_exploration(tiles, rooms, start, objective)      # /25
    pacing = score_pacing(enemies, boss, rooms, start)                   # /20
    layout = score_layout(tiles, rooms)                                  # /20
    reachability = score_reachability(tiles, start, objective, enemies)   # /15
    concept_fit = score_concept_fit(concept, enemies, boss, objectives)  # /20

    total = exploration + pacing + layout + reachability + concept_fit    # /100
    return round(total, 1)
```

**Rejection threshold:** Score < 40 → regenerate. Score ≥ 40 → accept. Score ≥ 75 → flag as "high quality" for A/B baseline.

---

## 3. Adaptive Difficulty Engine

### 3.1 Learner State Model

```python
@dataclass
class LearnerState:
    student_id: str

    # Concept-specific (per concept)
    concept_accuracy: dict[str, float]       # {"sorting": 0.85, "recursion": 0.6}
    concept_speed: dict[str, float]          # Avg quiz time in seconds per concept
    concept_attempts: dict[str, int]         # Number of dungeons attempted per concept
    misconceptions: dict[str, list[str]]     # {"sorting": ["bubble_is_On", "stability"]}

    # Global signals
    current_difficulty: str                  # "easy" | "medium" | "hard"
    frustration_score: float                 # 0.0–1.0 (composite of quit rate, time gaps)
    confidence_level: float                  # 0.0–1.0 (high accuracy + fast = high confidence)
    runs_since_last_transition: int          # Hysteresis guard to prevent oscillation
    next_seed: int                           # Deterministic seed for next dungeon
    total_sessions: int
    total_quit_count: int
    avg_session_length_min: float

    # Temporal (rolling window)
    recent_results: list[QuizResult]         # Last 5 quiz results
    recent_dungeon_times: list[float]        # Last 5 dungeon completion times
    recent_dungeon_history: list[dict]       # Last 5 dungeons with template/seed metadata
    last_active: datetime
    streak_days: int
```

### 3.2 Difficulty Transition Rules

```python
class DifficultyEngine:
    # Hysteresis: require N consecutive signals before changing difficulty
    PROMOTE_THRESHOLD = 3     # 3 consecutive "too easy" signals to promote
    DEMOTE_THRESHOLD = 2      # 2 consecutive "too hard" signals to demote
    COOLDOWN_RUNS = 2         # After a transition, wait 2 runs before re-evaluating

    def evaluate_transition(self, state: LearnerState) -> str:
        recent = state.recent_results[-5:]

        # Too-easy signals
        easy_signals = sum(1 for r in recent if r.accuracy >= 0.9 and r.time_seconds < 120)
        # Too-hard signals
        hard_signals = sum(1 for r in recent if r.accuracy < 0.5 or r.time_seconds > 300)

        # Check cooldown
        if state.runs_since_last_transition < self.COOLDOWN_RUNS:
            return state.current_difficulty

        if easy_signals >= self.PROMOTE_THRESHOLD:
            return self._promote(state.current_difficulty)
        elif hard_signals >= self.DEMOTE_THRESHOLD:
            return self._demote(state.current_difficulty)
        else:
            return state.current_difficulty

    def _promote(self, current: str) -> str:
        return {"easy": "medium", "medium": "hard", "hard": "hard"}[current]

    def _demote(self, current: str) -> str:
        return {"easy": "easy", "medium": "easy", "hard": "medium"}[current]
```

**What changes per difficulty level:**

| Property | Easy | Medium | Hard |
|----------|------|--------|------|
| Room count | 4–5 | 5–7 | 7–9 |
| Enemy count | 3–5 | 5–8 | 8–12 |
| Enemy HP multiplier | 0.7x | 1.0x | 1.4x |
| Boss HP multiplier | 0.8x | 1.0x | 1.5x |
| Template complexity | Linear/Hub | Any | Branching/Diamond |
| Time pressure | None | Soft timer shown | Hard timer (5 min) |
| Health pickups | Abundant | Moderate | Scarce |

### 3.3 Difficulty Calculation Function

```python
def calculate_dungeon_params(
    prior_quiz: QuizResult,
    current_concept: str,
    learner_state: LearnerState
) -> DungeonParams:
    """
    Input: quiz performance + concept + learner history
    Output: difficulty level + template + enemy count + modifiers
    """
    # Step 1: Evaluate difficulty transition
    engine = DifficultyEngine()
    new_difficulty = engine.evaluate_transition(learner_state)

    # Step 2: Concept-specific adjustments
    concept_accuracy = learner_state.concept_accuracy.get(current_concept, 0.5)
    has_misconceptions = len(learner_state.misconceptions.get(current_concept, [])) > 0

    # If student has misconceptions in this concept, soften difficulty
    if has_misconceptions and new_difficulty == "hard":
        new_difficulty = "medium"

    # Step 3: Template selection (variety-aware)
    template = select_template(
        concept=current_concept,
        difficulty=new_difficulty,
        student_history=learner_state.recent_dungeon_history,
        seed=learner_state.next_seed
    )

    # Step 4: Enemy count based on difficulty + concept accuracy
    base_enemies = {"easy": 4, "medium": 6, "hard": 9}[new_difficulty]
    # Fewer enemies if student struggling with THIS concept
    if concept_accuracy < 0.5:
        enemy_count = max(2, base_enemies - 2)
    elif concept_accuracy > 0.85:
        enemy_count = base_enemies + 1
    else:
        enemy_count = base_enemies

    # Step 5: Frustration check — if frustrated, make it easier regardless
    if learner_state.frustration_score > 0.7:
        new_difficulty = engine._demote(new_difficulty)
        enemy_count = max(2, enemy_count - 2)

    return DungeonParams(
        difficulty=new_difficulty,
        template_type=template,
        enemy_count=enemy_count,
        room_count={"easy": 4, "medium": 6, "hard": 8}[new_difficulty],
        boss_hp_mult={"easy": 0.8, "medium": 1.0, "hard": 1.5}[new_difficulty],
        health_pickups={"easy": 5, "medium": 3, "hard": 1}[new_difficulty],
        misconception_focus=learner_state.misconceptions.get(current_concept, [])
    )
```

### 3.4 Misconception-Aware Adaptation

When a misconception is detected (e.g., student consistently fails on "bubble sort is O(n)"):

1. **Next recursion/sorting dungeon gets:**
   - Lower enemy count (focus on learning, not combat frustration)
   - Boss question specifically targets that misconception
   - Hint text in dungeon rooms related to the misconception
   - Enemy names reference the concept correctly ("O(n²) Bubble Bot")

2. **Misconception detection logic:**
```python
def detect_misconceptions(student_id: str, concept: str, quiz_results: list[QuizResult]) -> list[str]:
    misconception_failures = {}
    for result in quiz_results:
        if not result.correct and result.misconception_tag:
            tag = result.misconception_tag
            misconception_failures[tag] = misconception_failures.get(tag, 0) + 1

    # Flag if student fails same misconception 2+ times
    return [tag for tag, count in misconception_failures.items() if count >= 2]
```

### 3.5 Database Schema for Learner Model

```sql
-- Core learner state
CREATE TABLE learner_profiles (
    student_id TEXT PRIMARY KEY,
    current_difficulty TEXT DEFAULT 'easy',       -- easy/medium/hard
    frustration_score REAL DEFAULT 0.0,
    confidence_level REAL DEFAULT 0.5,
    total_sessions INTEGER DEFAULT 0,
    total_quit_count INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Per-concept mastery tracking
CREATE TABLE concept_mastery (
    student_id TEXT,
    concept TEXT,
    accuracy REAL DEFAULT 0.0,                    -- Rolling accuracy %
    avg_speed_seconds REAL DEFAULT 0.0,           -- Avg quiz completion time
    attempts INTEGER DEFAULT 0,                   -- Dungeons attempted for this concept
    mastered BOOLEAN DEFAULT FALSE,               -- True if accuracy > 0.8 for 3+ attempts
    PRIMARY KEY (student_id, concept),
    FOREIGN KEY (student_id) REFERENCES learner_profiles(student_id)
);

-- Misconception tracking
CREATE TABLE misconceptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT,
    concept TEXT,
    misconception_tag TEXT,                       -- e.g., "bubble_is_On"
    occurrence_count INTEGER DEFAULT 1,
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,               -- True after 2+ correct answers
    FOREIGN KEY (student_id) REFERENCES learner_profiles(student_id)
);

-- Difficulty transition log (for A/B analysis)
CREATE TABLE difficulty_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT,
    from_difficulty TEXT,
    to_difficulty TEXT,
    trigger_reason TEXT,                          -- "promote_easy_streak" | "demote_frustration"
    concept TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES learner_profiles(student_id)
);
```

---

## 4. Boss Question Pipeline

### 4.1 Misconception Library Structure

```python
MISCONCEPTION_LIBRARY = {
    "sorting": {
        "bubble_complexity": {
            "description": "Student believes bubble sort is O(n)",
            "bloom_level": "understanding",
            "questions": [
                {
                    "id": "sort_mc_001",
                    "question": "What is the worst-case time complexity of Bubble Sort?",
                    "options": ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
                    "correct": 2,
                    "hint": "Think about how many times bubble sort compares each pair in the worst case. If the array is reverse-sorted, every element must 'bubble' to its correct position.",
                    "difficulty": "understanding"
                },
                {
                    "id": "sort_mc_002",
                    "question": "Why is bubble sort slower than merge sort for large inputs?",
                    "options": [
                        "Bubble sort uses more memory",
                        "Bubble sort makes O(n²) comparisons vs O(n log n)",
                        "Bubble sort can't handle duplicates",
                        "Merge sort skips sorted elements"
                    ],
                    "correct": 1,
                    "hint": "Compare the number of comparisons each algorithm makes. For n=1000, how many comparisons does each need?",
                    "difficulty": "analysis"
                }
            ]
        },
        "stability_ignorance": {
            "description": "Student doesn't understand sort stability",
            "bloom_level": "understanding",
            "questions": [
                {
                    "id": "sort_mc_003",
                    "question": "What does it mean for a sorting algorithm to be 'stable'?",
                    "options": [
                        "It never crashes",
                        "Equal elements maintain their original relative order",
                        "It always runs in O(n log n)",
                        "It uses constant extra space"
                    ],
                    "correct": 1,
                    "hint": "Imagine sorting students by grade. If two students both have A+, a stable sort keeps them in the order they were originally listed.",
                    "difficulty": "definition"
                }
            ]
        },
        "comparison_required": {
            "description": "Student believes all sorting requires comparison",
            "bloom_level": "analysis",
            "questions": [
                {
                    "id": "sort_mc_004",
                    "question": "Which sorting algorithm does NOT use element comparisons?",
                    "options": ["Quick Sort", "Merge Sort", "Counting Sort", "Heap Sort"],
                    "correct": 2,
                    "hint": "Some algorithms sort by counting occurrences of each value rather than comparing pairs. Think about sorting integers in a known range.",
                    "difficulty": "analysis"
                }
            ]
        }
    },
    "recursion": {
        "no_base_case": {
            "description": "Student forgets base case importance",
            "bloom_level": "understanding",
            "questions": [
                {
                    "id": "rec_mc_001",
                    "question": "What happens if a recursive function has no base case?",
                    "options": [
                        "It returns 0",
                        "It runs forever (stack overflow)",
                        "It automatically stops after 100 calls",
                        "The compiler fixes it"
                    ],
                    "correct": 1,
                    "hint": "Without a stopping condition, the function keeps calling itself. Each call adds a frame to the call stack until memory runs out.",
                    "difficulty": "understanding"
                }
            ]
        },
        "iteration_confusion": {
            "description": "Student confuses recursion with iteration",
            "bloom_level": "analysis",
            "questions": [
                {
                    "id": "rec_mc_002",
                    "question": "Which problem is MOST naturally solved with recursion?",
                    "options": [
                        "Summing an array",
                        "Finding max in a list",
                        "Traversing a binary tree",
                        "Printing 1 to 100"
                    ],
                    "correct": 2,
                    "hint": "Recursion shines for structures that are self-similar—where each part looks like the whole. Which data structure has this property?",
                    "difficulty": "analysis"
                }
            ]
        }
    },
    "graph_traversal": {
        "bfs_dfs_confusion": {
            "description": "Student confuses BFS and DFS behavior",
            "bloom_level": "understanding",
            "questions": [
                {
                    "id": "graph_mc_001",
                    "question": "Which data structure does BFS use?",
                    "options": ["Stack", "Queue", "Heap", "Array"],
                    "correct": 1,
                    "hint": "BFS explores neighbors level by level. Think about 'first in, first out'—which data structure works that way?",
                    "difficulty": "definition"
                }
            ]
        }
    }
}
```

### 4.2 Question Selection Algorithm

```python
def question_selector(
    concept: str,
    student_history: list[dict],     # Last 5 boss questions shown
    prior_quiz_score: float,         # 0.0–1.0
    misconception_flags: list[str]   # From learner model
) -> dict:
    """
    Select a boss question that:
    1. Targets a specific misconception
    2. Matches student's current performance level
    3. Hasn't been shown recently
    """
    library = MISCONCEPTION_LIBRARY.get(concept, {})
    if not library:
        return get_fallback_question(concept)

    # Step 1: Determine question difficulty tier based on quiz score
    if prior_quiz_score >= 0.9:
        target_difficulty = "analysis"       # Higher-order thinking
    elif prior_quiz_score >= 0.6:
        target_difficulty = "understanding"  # Misconception check
    else:
        target_difficulty = "definition"     # Basic recall

    # Step 2: Prioritize known misconceptions
    candidates = []
    seen_ids = {h["question_id"] for h in student_history[-5:]}

    # First pass: questions targeting known misconceptions
    for misc_key, misc_data in library.items():
        if misc_key in misconception_flags:
            for q in misc_data["questions"]:
                if q["id"] not in seen_ids and q["difficulty"] == target_difficulty:
                    candidates.append((q, 3))  # Priority 3 (highest)

    # Second pass: questions at right difficulty, any misconception
    for misc_key, misc_data in library.items():
        for q in misc_data["questions"]:
            if q["id"] not in seen_ids and q["difficulty"] == target_difficulty:
                candidates.append((q, 2))  # Priority 2

    # Third pass: any unseen question
    for misc_key, misc_data in library.items():
        for q in misc_data["questions"]:
            if q["id"] not in seen_ids:
                candidates.append((q, 1))  # Priority 1

    if not candidates:
        return get_fallback_question(concept)

    # Select highest priority candidate
    candidates.sort(key=lambda x: x[1], reverse=True)
    selected = candidates[0][0]

    return {
        "question_id": selected["id"],
        "question": selected["question"],
        "options": selected["options"],
        "correct_index": selected["correct"],
        "hint": selected["hint"],
        "misconception_targeted": get_misconception_key(concept, selected["id"]),
        "difficulty": selected["difficulty"]
    }
```

### 4.3 Outcome Handling

```python
def handle_boss_answer(
    student_id: str,
    question: dict,
    answer_index: int,
    attempt_num: int,       # 1, 2, or 3
    time_ms: int
) -> BossOutcome:
    correct = (answer_index == question["correct_index"])

    # Log the attempt
    log_boss_attempt(student_id, question["question_id"],
                     question["misconception_targeted"],
                     answer_index, correct, time_ms, attempt_num)

    if correct:
        return BossOutcome(
            result="victory",
            message="Correct! The boss is defeated. Onward!",
            can_proceed=True,
            points_awarded=max(100 - (attempt_num - 1) * 30, 10),  # 100/70/40 points
            show_explanation=True
        )
    elif attempt_num < 3:
        return BossOutcome(
            result="retry",
            message=f"Not quite. Here's a hint: {question['hint']}",
            can_proceed=False,
            points_awarded=0,
            show_hint=True,
            attempts_remaining=3 - attempt_num
        )
    else:  # 3rd failed attempt = soft failure
        return BossOutcome(
            result="soft_fail",
            message=f"The correct answer was: {question['options'][question['correct_index']]}. "
                    f"You can continue, but the boss escapes for next time.",
            can_proceed=True,
            points_awarded=0,
            show_explanation=True,
            flag_misconception=True  # Update learner model
        )
```

### 4.4 Pre-Authored vs On-the-Fly — Recommendation

**Recommendation: Hybrid approach (pre-authored primary, AI-generated supplement)**

| Approach | Pros | Cons |
|----------|------|------|
| **Pre-authored** | Reliable quality, instant serving, no API dependency, pedagogically validated | Limited pool, manual curation effort, repetition for frequent players |
| **AI-generated** | Infinite variety, adapts to new concepts easily, no manual work | Quality inconsistent, API failures, may test wrong misconception, latency |
| **Hybrid (recommended)** | Pre-authored for core misconceptions (guaranteed quality), AI for variety after pool exhausted | More complex pipeline, need validation layer for AI questions |

**Implementation:**
1. Pre-author 5–10 questions per misconception category per concept (covers ~80% of cases)
2. When student exhausts pre-authored pool, generate via AI with strict validation
3. AI-generated questions that pass validation get added to the pool for review
4. Instructor can approve/reject AI-generated questions via dashboard

---

## 5. Multi-Provider Reliability Pipeline

### 5.1 Pre-Generation Validation

```python
class ProviderHealthCheck:
    def __init__(self):
        self.provider_status = {
            "openrouter": {"healthy": True, "last_check": None, "error_rate_5min": 0.0},
            "gemini": {"healthy": True, "last_check": None, "error_rate_5min": 0.0},
        }
        self.rate_limit_remaining = {"openrouter": 100, "gemini": 60}

    def check_provider(self, provider: str) -> bool:
        status = self.provider_status[provider]

        # Skip if checked recently (within 30s) and was healthy
        if status["last_check"] and (now() - status["last_check"]).seconds < 30 and status["healthy"]:
            return True

        # Check rate limit headers from last response
        if self.rate_limit_remaining[provider] <= 2:
            status["healthy"] = False
            return False

        # Check error rate
        if status["error_rate_5min"] > 0.5:  # >50% failures in 5 min
            status["healthy"] = False
            return False

        status["healthy"] = True
        status["last_check"] = now()
        return True
```

### 5.2 Prompt Engineering Template

```python
QUESTION_GENERATION_PROMPT = """
You are generating a quiz question for an educational game about {concept}.

TARGET MISCONCEPTION: {misconception_description}
DIFFICULTY LEVEL: {difficulty} (definition / understanding / analysis)
STUDENT CONTEXT: {student_context}

Generate a multiple-choice question in EXACTLY this JSON format:
{{
    "question": "Clear, specific question text about {concept}",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Why the correct answer is right and common wrong answer is wrong",
    "misconception_tested": "{misconception_tag}"
}}

RULES:
1. Question MUST specifically test understanding of {concept}
2. Question MUST target the misconception: {misconception_description}
3. Exactly 4 options, exactly 1 correct (index 0-3)
4. Options must be plausible (no obviously wrong answers)
5. If you are unsure, respond with this exact fallback:
{{"question": "What is {concept}?", "options": ["A fundamental algorithm concept", "A data structure", "A design pattern", "A programming language"], "correct": 0, "explanation": "Fallback question", "misconception_tested": "general"}}
"""
```

### 5.3 Output Validation

```python
def validate_question_output(json_response: str, concept: str) -> tuple[bool, str]:
    """
    Validate LLM-generated question output.
    Returns (is_valid, error_reason)
    """
    # Step 1: Parse JSON
    try:
        data = json.loads(json_response)
    except json.JSONDecodeError as e:
        return (False, f"malformed_json: {str(e)}")

    # Step 2: Check required fields
    required_fields = ["question", "options", "correct", "explanation"]
    for field in required_fields:
        if field not in data:
            return (False, f"missing_field: {field}")

    # Step 3: Validate options
    if not isinstance(data["options"], list) or len(data["options"]) != 4:
        return (False, "options_count: expected exactly 4 options")

    if any(not opt or not isinstance(opt, str) for opt in data["options"]):
        return (False, "options_empty: one or more options are null/empty")

    # Step 4: Validate correct answer index
    if not isinstance(data["correct"], int) or data["correct"] not in range(4):
        return (False, f"correct_index: must be 0-3, got {data['correct']}")

    # Step 5: Concept relevance check (keyword matching)
    concept_keywords = CONCEPT_KEYWORDS.get(concept, [concept])
    question_text = (data["question"] + " ".join(data["options"])).lower()
    if not any(keyword in question_text for keyword in concept_keywords):
        return (False, f"off_topic: question doesn't mention any {concept} keywords")

    # Step 6: Check question isn't too short
    if len(data["question"]) < 15:
        return (False, "question_too_short: less than 15 characters")

    return (True, "valid")
```

### 5.4 Intelligent Routing

```python
def route_generation_request(concept: str, retry_count: int, health: ProviderHealthCheck) -> str:
    """
    Select provider based on health status + retry count.
    Retry 0: primary provider (OpenRouter)
    Retry 1: secondary provider (Gemini)
    Retry 2: fallback (hardcoded)
    """
    if retry_count == 0:
        # Try OpenRouter first (free)
        if health.check_provider("openrouter"):
            return "openrouter"
        elif health.check_provider("gemini"):
            return "gemini"
        else:
            return "hardcoded_fallback"

    elif retry_count == 1:
        # Second try: switch provider
        if health.check_provider("gemini"):
            return "gemini"
        elif health.check_provider("openrouter"):
            return "openrouter"
        else:
            return "hardcoded_fallback"

    else:
        return "hardcoded_fallback"
```

### 5.5 Generate with Fallback

```python
async def generate_with_fallback(
    concept: str,
    misconception: str = "",
    difficulty: str = "understanding",
    max_retries: int = 2
) -> tuple[dict, str, Optional[str]]:
    """
    Returns: (question_dict, source_provider, error_if_any)
    """
    backoff_ms = [100, 200, 400]
    health = ProviderHealthCheck()

    for retry in range(max_retries + 1):
        provider = route_generation_request(concept, retry, health)

        if provider == "hardcoded_fallback":
            question = get_hardcoded_question(concept, misconception)
            log_incident("all_providers_failed", concept=concept, retries=retry)
            return (question, "hardcoded_fallback", "all_providers_exhausted")

        try:
            prompt = build_prompt(concept, misconception, difficulty)
            raw_response = await call_provider(provider, prompt, timeout_ms=5000)
            is_valid, error = validate_question_output(raw_response, concept)

            if is_valid:
                question = json.loads(raw_response)
                # Cache for 24h
                cache_question(concept, misconception, question, ttl_hours=24)
                return (question, provider, None)
            else:
                log_validation_failure(provider, concept, error)
                await asyncio.sleep(backoff_ms[retry] / 1000)
                continue

        except (TimeoutError, ConnectionError) as e:
            log_provider_error(provider, str(e))
            update_provider_error_rate(provider)
            await asyncio.sleep(backoff_ms[retry] / 1000)
            continue

    # Should not reach here, but safety
    question = get_hardcoded_question(concept, misconception)
    return (question, "hardcoded_fallback", "unexpected_fallthrough")
```

### 5.6 Caching Strategy

```python
class QuestionCache:
    """24-hour cache for generated questions, keyed by concept+misconception."""

    def __init__(self):
        self.cache = {}  # {(concept, misconception): [CachedQuestion]}
        self.hit_count = 0
        self.miss_count = 0

    def get(self, concept: str, misconception: str, seen_ids: set[str]) -> Optional[dict]:
        key = (concept, misconception)
        if key not in self.cache:
            self.miss_count += 1
            return None

        for cached in self.cache[key]:
            if cached.question["id"] not in seen_ids and not cached.is_expired():
                self.hit_count += 1
                return cached.question

        self.miss_count += 1
        return None

    def put(self, concept: str, misconception: str, question: dict, ttl_hours: int = 24):
        key = (concept, misconception)
        if key not in self.cache:
            self.cache[key] = []
        self.cache[key].append(CachedQuestion(question, expires_at=now() + timedelta(hours=ttl_hours)))

    @property
    def hit_rate(self) -> float:
        total = self.hit_count + self.miss_count
        return self.hit_count / total if total > 0 else 0
```

### 5.7 Production Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| **Provider success rate** | % of requests per provider returning valid JSON | < 80% over 5 min |
| **Average generation latency** | Time from request to valid response | > 4s p95 |
| **Fallback rate** | % of questions served from hardcoded fallback | > 15% over 1 hour |
| **Cache hit rate** | % of requests served from cache | < 30% (inefficient) |
| **Validation failure rate** | % of LLM responses failing validation | > 25% per provider |

---

## 6. Learning Loop UX & Dropout Prevention

### 6.1 Redesigned Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐     ┌──────────────┐
│  LESSON     │────▶│  INTERLEAVED     │────▶│  DUNGEON    │────▶│  RESULTS     │
│  (2-3 min)  │     │  QUIZ (1-2 min)  │     │  (3-4 min)  │     │  + NEXT      │
│             │     │                  │     │             │     │  PREVIEW     │
│ Story-based │     │ 3 Qs during      │     │ Adaptive    │     │             │
│ narrative   │     │ reading, instant  │     │ difficulty  │     │ XP + streak │
│ + visual    │     │ feedback         │     │             │     │ + social    │
└─────────────┘     └──────────────────┘     └─────────────┘     └──────────────┘
      │                                             │
      │  ← Motivational bridge: "Boss awaits!" ─────┘
      │    + Quiz score preview
      └── Bookmark: student can resume here next session
```

### 6.2 Lesson → Quiz Friction

| Design Decision | Recommendation | Rationale |
|-----------------|---------------|-----------|
| **Lesson length** | 2–3 min max, 300–500 words | Research: attention drops after 3 min for teens |
| **Format** | Narrative (story) > Didactic | Story: "You encounter a room of scrambled numbers…" creates emotional hook |
| **Quiz timing** | Interleaved (during reading) | Show quiz Q after each key paragraph, immediate reinforcement |
| **Quiz mandatory?** | Yes, but low-stakes | If skip = no dungeon access. But wrong answers = hints, not punishment |

**A/B Test #1 (Highest Impact): Interleaved vs Post-Lesson Quiz**
- Hypothesis: Interleaving quiz questions within the lesson reduces quit-before-dungeon by 15%
- Control: Current post-lesson quiz (all 3 Qs at end)
- Treatment: 1 question after each lesson section (3 sections, 1 Q each)
- Metric: `quit_rate_after_lesson`, `quiz_accuracy`, `time_to_dungeon`

### 6.3 Quiz → Dungeon Bridge

| Design Decision | Recommendation | Rationale |
|-----------------|---------------|-----------|
| **Bridge screen** | Show motivational transition with quiz score | "You scored 2/3! A Level 5 boss awaits. Ready?" |
| **Quiz feedback** | Immediate (show correct/incorrect inline) | Delayed feedback = frustration, student forgets context |
| **Quiz → Difficulty link** | Yes, quiz quality affects dungeon difficulty | Low quiz score = easier dungeon (see adaptive system) |
| **Loading experience** | Show dungeon preview during generation | "Generating your dungeon…" with concept art, not spinner |

**A/B Test #2: Difficulty Preview**
- Hypothesis: Showing "Easy/Medium/Hard" label + room count reduces anxiety and quit-before-dungeon by 10%
- Control: No difficulty info shown
- Treatment: "Medium Dungeon • 6 Rooms • ~3 min • Boss: SortBot"
- Metric: `quit_rate_before_dungeon`, `dungeon_completion_rate`

### 6.4 Dungeon Pacing

| Design Decision | Recommendation | Rationale |
|-----------------|---------------|-----------|
| **Max duration** | 3–4 min hard cap (soft timer at 3 min) | >5 min = 40% abandon rate (industry data) |
| **Combat variety** | Alternate combat rooms and puzzle rooms | Monotonous combat → boredom. Puzzles break rhythm |
| **Checkpoints** | Mini-checkpoint after every 2 rooms | Student can save & resume next session |
| **Boss arena** | 60–90s focused encounter (not 2 min) | Quick, intense, rewarding. Long bosses = frustration |

**A/B Test #3: Mini-Checkpoints**
- Hypothesis: Adding save-checkpoints every 2 rooms reduces dungeon abandonment by 20%
- Control: No checkpoints (must restart dungeon if quit)
- Treatment: Auto-save after each room pair, resume from checkpoint
- Metric: `dungeon_completion_rate`, `return_rate_next_day`

### 6.5 Dropout Signals to Track

| Signal | Event | Interpretation |
|--------|-------|----------------|
| **Time-to-abandon** | `quit_session` with time < 30s | Confusing UX or accidental entry |
| **Quit location** | `quit_at_lesson` / `quit_at_quiz` / `quit_at_dungeon` / `quit_at_boss` | Identifies bottleneck in flow |
| **Return rate** | Student returns within 24h / 72h / 7d | Measures stickiness |
| **Session length trend** | Avg session length decreasing over 3 sessions | Engagement declining |
| **Device correlation** | Quit rate by device type | Mobile may need different UX |

### 6.6 Retention Hooks

| Hook | Implementation | Expected Impact |
|------|----------------|-----------------|
| **Streak system** | "🔥 3-day learning streak!" badge, reset after 2 days missed | +15% return rate (gamification research) |
| **Social proof** | "92% of students beat this dungeon" shown before entry | Reduces anxiety, +8% completion |
| **Next preview** | "Next: Recursion — Explore the Fractal Tower!" shown at results | Creates curiosity, +12% next-day return |
| **Difficulty choice** | Let student pick Easy/Medium before dungeon (override adaptive) | Autonomy reduces frustration-quits |
| **Weekly leaderboard** | Top 10 XP earners (opt-in, not mandatory) | Social motivation, +10% engagement |

### 6.7 Instrumentation Plan

| Step | Events to Log |
|------|---------------|
| **Lesson Start** | `lesson_started(student_id, concept, timestamp, device)` |
| **Lesson Reading** | `lesson_scrolled(student_id, scroll_depth_pct, time_spent_ms)` |
| **Quiz Start** | `quiz_started(student_id, concept, question_count)` |
| **Each Question** | `question_answered(student_id, question_id, answer, correct, time_ms)` |
| **Quiz Complete** | `quiz_completed(student_id, concept, score, total_time_ms)` |
| **Dungeon Start** | `dungeon_started(student_id, concept, difficulty, template, room_count)` |
| **Room Enter** | `room_entered(student_id, room_id, room_number, timestamp)` |
| **Enemy Kill** | `enemy_defeated(student_id, enemy_type, time_ms, damage_taken)` |
| **Boss Encounter** | `boss_started(student_id, boss_type, student_hp_remaining)` |
| **Boss Answer** | `boss_answered(student_id, question_id, answer, correct, attempt_num)` |
| **Dungeon End** | `dungeon_completed(student_id, result: win/lose/quit, time_ms, rooms_visited)` |
| **Session End** | `session_ended(student_id, total_time_ms, concepts_completed, quit_location)` |

### 6.8 Two-Week Priority Order

If you had 2 weeks to improve retention:

1. **Week 1, Days 1–3:** Implement interleaved quiz (A/B test #1) — highest impact on lesson→quiz dropout
2. **Week 1, Days 4–5:** Add difficulty preview + motivational bridge screen
3. **Week 2, Days 1–2:** Implement mini-checkpoints in dungeon
4. **Week 2, Days 3–4:** Add streak system + next-concept preview
5. **Week 2, Day 5:** Instrument all dropout signals, deploy analytics dashboard

---

## 7. Telemetry, Analytics & A/B Testing

### 7.1 Event Schema

Every event includes these base fields:

```python
@dataclass
class BaseEvent:
    event_type: str           # e.g., "dungeon_completed"
    timestamp: datetime       # ISO 8601 UTC
    student_id: str           # Unique student identifier
    session_id: str           # Unique session identifier (one per login)
    concept: str              # Current concept (e.g., "sorting")
    difficulty: str           # Current difficulty level
    device_type: str          # "desktop" | "mobile" | "tablet"
    platform: str             # "chrome" | "firefox" | "safari" | etc.
    app_version: str          # Frontend version for debugging
```

**Event-specific payloads:**

```python
# Dungeon completed event (example)
@dataclass
class DungeonCompletedEvent(BaseEvent):
    event_type: str = "dungeon_completed"
    dungeon_template: str = ""          # "linear_chain", "hub", etc.
    room_count: int = 0
    rooms_visited: int = 0
    enemies_defeated: int = 0
    total_enemies: int = 0
    boss_defeated: bool = False
    boss_attempts: int = 0
    time_ms: int = 0
    damage_taken: int = 0
    health_remaining: int = 0
    quality_score: float = 0.0
    seed: int = 0
```

```python
# Logging pseudocode
def log_dungeon_completed(student_id, session, dungeon_result):
    event = DungeonCompletedEvent(
        timestamp=utcnow(),
        student_id=student_id,
        session_id=session.id,
        concept=dungeon_result.concept,
        difficulty=dungeon_result.difficulty,
        device_type=session.device_type,
        platform=session.platform,
        app_version=session.app_version,
        dungeon_template=dungeon_result.template,
        room_count=dungeon_result.room_count,
        rooms_visited=dungeon_result.rooms_visited,
        enemies_defeated=dungeon_result.enemies_defeated,
        total_enemies=dungeon_result.total_enemies,
        boss_defeated=dungeon_result.boss_defeated,
        boss_attempts=dungeon_result.boss_attempts,
        time_ms=dungeon_result.time_ms,
        damage_taken=dungeon_result.damage_taken,
        health_remaining=dungeon_result.health_remaining,
        quality_score=dungeon_result.quality_score,
        seed=dungeon_result.seed,
    )
    event_store.insert(event)
```

### 7.2 KPIs With Targets

| KPI | Definition | Target | Measurement Period | Confidence |
|-----|-----------|--------|-------------------|------------|
| **Completeness** | % of students completing 5+ concepts | ≥ 60% | Per student (lifetime) | 95% |
| **Mastery** | % of students with >80% accuracy on quiz+dungeon combo | ≥ 70% first attempt | Per concept per student | 90% |
| **Engagement** | Avg concepts attempted per student per session | ≥ 2.5 concepts/session | Per day | 90% |
| **Retention D1** | % returning within 24h | ≥ 50% | Daily cohort | 95% |
| **Retention D7** | % returning within 7 days | ≥ 30% | Weekly cohort | 95% |
| **Time-to-mastery** | Avg sessions to reach 80% accuracy per concept | ≤ 3 sessions | Per concept | 90% |

### 7.3 SQL Schema

```sql
-- Students table
CREATE TABLE students (
    student_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT,
    signup_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    device_type TEXT,
    total_sessions INTEGER DEFAULT 0,
    last_active TIMESTAMP,
    experiment_group TEXT DEFAULT 'control'   -- A/B test assignment
);

-- Generic events table (append-only log)
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,                  -- "lesson_started", "quiz_completed", etc.
    student_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    concept TEXT,
    difficulty TEXT,
    timestamp TIMESTAMP NOT NULL,
    device_type TEXT,
    payload JSON,                             -- Event-specific data as JSON
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);
CREATE INDEX idx_events_student ON events(student_id, timestamp);
CREATE INDEX idx_events_type ON events(event_type, timestamp);
CREATE INDEX idx_events_concept ON events(concept);

-- Quiz results (denormalized for fast queries)
CREATE TABLE quiz_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    concept TEXT NOT NULL,
    question_id TEXT,
    misconception_targeted TEXT,
    answer_index INTEGER,
    correct BOOLEAN,
    time_ms INTEGER,
    attempt_num INTEGER DEFAULT 1,
    quiz_score REAL,                          -- Overall quiz score (0.0–1.0)
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);
CREATE INDEX idx_quiz_student_concept ON quiz_results(student_id, concept);

-- Dungeon results (denormalized for fast queries)
CREATE TABLE dungeon_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    concept TEXT NOT NULL,
    difficulty TEXT,
    template_type TEXT,
    room_count INTEGER,
    rooms_visited INTEGER,
    enemies_defeated INTEGER,
    total_enemies INTEGER,
    boss_defeated BOOLEAN,
    boss_attempts INTEGER,
    time_ms INTEGER,
    quality_score REAL,
    seed INTEGER,
    result TEXT,                               -- "win" | "lose" | "quit"
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);
CREATE INDEX idx_dungeon_student ON dungeon_results(student_id, concept);
CREATE INDEX idx_dungeon_template ON dungeon_results(template_type);
```

### 7.4 A/B Testing Framework

#### Test Plan Template

```python
@dataclass
class ABTest:
    name: str               # "interleaved_quiz_v1"
    hypothesis: str         # "Interleaving quiz Qs reduces quit-before-dungeon by 15%"
    start_date: datetime
    end_date: datetime       # Or until N reached
    min_sample_per_group: int  # e.g., 3800 for 10% relative lift at 80% power
    groups: dict             # {"control": 0.5, "treatment": 0.5}
    target_population: str   # "new_students_only"
    success_metric: str      # "quit_rate_after_lesson"
    guardrail_metrics: list  # ["quiz_accuracy", "dungeon_completion_rate"]
    stat_test: str           # "chi_squared" for proportions, "t_test" for means
```

#### 5 High-Impact A/B Tests (Priority Order)

| # | Test | Hypothesis | Success Metric | Duration |
|---|------|------------|----------------|----------|
| 1 | Interleaved quiz | Reduces lesson dropout by 15% | `quit_rate_after_lesson` | 2-6 weeks or N>=3800/group |
| 2 | Difficulty preview | Reduces pre-dungeon anxiety by 10% | `quit_rate_before_dungeon` | 2-6 weeks or N>=3800/group |
| 3 | Mini-checkpoints | Reduces dungeon abandonment by 20% | `dungeon_completion_rate` | 2-6 weeks or N>=3800/group |
| 4 | Streak notifications | Increases D7 retention by 15% | `return_rate_7d` | 4-8 weeks or N>=3800/group |
| 5 | Template variety | Increases concepts-per-session by 0.5 | `concepts_per_session` | 3-6 weeks or N>=3800/group |

#### A/B Test Result Template

```
═══════════════════════════════════════════════════════════
A/B TEST REPORT: {test_name}
═══════════════════════════════════════════════════════════
Hypothesis:   {hypothesis}
Duration:     {start_date} → {end_date} ({days} days)
Sample Size:  Control={n_control}, Treatment={n_treatment}

───────────────────────────────────────────────────────────
PRIMARY METRIC: {success_metric}
  Control:     {control_value} ± {control_ci}
  Treatment:   {treatment_value} ± {treatment_ci}
  Effect Size: {effect_size} ({relative_change}%)
  p-value:     {p_value}
  Confidence:  {confidence_level}%
  Result:      ✅ SIGNIFICANT / ❌ NOT SIGNIFICANT

───────────────────────────────────────────────────────────
GUARDRAIL METRICS:
  {metric_1}: Control={val} vs Treatment={val} — ✅ No regression
  {metric_2}: Control={val} vs Treatment={val} — ✅ No regression

───────────────────────────────────────────────────────────
DECISION: SHIP / ITERATE / ABANDON
NOTES: {free-text observations}
═══════════════════════════════════════════════════════════
```

#### Sample Size Calculation

For detecting a 10% improvement with 80% power and α=0.05:

```python
def required_sample_size(baseline_rate: float, expected_improvement: float,
                         power: float = 0.8, alpha: float = 0.05) -> int:
    """
    For proportions (e.g., quit rate), use formula:
    n = (Z_α/2 + Z_β)² * (p1(1-p1) + p2(1-p2)) / (p1 - p2)²
    """
    from scipy.stats import norm
    import math

    p1 = baseline_rate                          # e.g., 0.35 (35% quit rate)
    p2 = baseline_rate * (1 - expected_improvement)  # e.g., 0.315 (10% improvement)

    z_alpha = norm.ppf(1 - alpha / 2)  # 1.96 for α=0.05
    z_beta = norm.ppf(power)           # 0.84 for 80% power

    numerator = (z_alpha + z_beta) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2))
    denominator = (p1 - p2) ** 2

    n_per_group = math.ceil(numerator / denominator)
    return n_per_group  # Per group, so total = 2 * n_per_group

# Example: baseline 35% quit rate, detect 10% relative improvement
# required_sample_size(0.35, 0.10) ≈ 3,784 per group ≈ 7,568 total
# For smaller user base, increase test duration or accept lower power (70%)
```

### 7.5 Health Dashboard (Daily Check)

| # | Metric | Source | Alert If |
|---|--------|--------|----------|
| 1 | **Active users (DAU)** | `COUNT(DISTINCT student_id) WHERE date = today` | < 50% of 7-day avg |
| 2 | **Lesson completion rate** | `dungeon_started / lesson_started` | Drops > 20% vs 7-day avg |
| 3 | **Quiz accuracy (overall)** | `AVG(quiz_score)` | Drops below 0.5 |
| 4 | **Dungeon completion rate** | `dungeon_completed(result='win') / dungeon_started` | Drops > 15% vs 7-day avg |
| 5 | **AI provider failure rate** | `fallback_count / total_generation_requests` | > 15% |
| 6 | **Avg generation latency** | `AVG(generation_time_ms)` | p95 > 5,000ms |
| 7 | **Concept difficulty heatmap** | `AVG(quiz_score) GROUP BY concept` | Any concept < 0.4 avg |

**Concept difficulty heatmap:** A color-coded grid showing avg quiz accuracy per concept. Red = hard (< 50% accuracy), Yellow = moderate (50–70%), Green = easy (> 70%). Helps identify which concepts need better lessons or easier dungeons.

---

## 8. Technical Debt & Refactoring Roadmap

### 8.1 Top 10 Blockers (Strategic Order)

| Rank | Blocker | Risk (1–5) | Effort (days) | Impact (1–5) | Priority Score | Quick Fix? |
|------|---------|-----------|---------------|--------------|----------------|------------|
| 1 | No circuit breaker for OpenRouter | 5 | 2 | 5 | 5.0 | Yes |
| 2 | No learner model persistence | 5 | 5 | 5 | 2.0 | No |
| 3 | Level generator is 400+ line monolith | 3 | 5 | 5 | 1.6 | No |
| 4 | No rate-limiting on lesson endpoint | 4 | 1 | 4 | 8.0 | Yes |
| 5 | No instrumentation / event logging | 4 | 5 | 5 | 1.8 | No |
| 6 | Database queries not indexed | 3 | 1 | 3 | 6.0 | Yes |
| 7 | OpenRouter model list hardcoded | 2 | 2 | 3 | 2.5 | Yes |
| 8 | No feature flags / rollback | 3 | 3 | 4 | 2.3 | No |
| 9 | Frontend error handling brittle | 3 | 3 | 3 | 2.0 | No |
| 10 | No caching layer for lessons | 3 | 3 | 4 | 2.3 | No |

> **Priority formula:** (Risk + Impact) / Effort is a heuristic. Final ordering below is strategic and also accounts for dependency criticality and blast radius.

### 8.2 Detailed Breakdown

#### Blocker #1: No Circuit Breaker for OpenRouter
- **Risk: 5** — Can retry indefinitely, waste resources, cause cascading timeouts
- **Effort: 2 days**
- **Impact: 5** — Prevents all downstream issues with AI provider
- **Quick fix:** Add retry budget (max 2), exponential backoff (100ms → 200ms → 400ms), and hard timeout (5s)
- **Long fix (3 days):** Full circuit breaker pattern — track error rate per provider over 5-min window, if > 50% errors → "open" circuit (skip provider for 60s), auto-close after cooldown
- **Validation:** Load test with provider returning 429s. Verify fallback triggers within 1s, no infinite loops

#### Blocker #2: No Learner Model Persistence
- **Risk: 5** — Every level is independent. No adaptive difficulty possible. Core feature blocked
- **Effort: 5 days**
- **Impact: 5** — Enables adaptive difficulty, misconception tracking, personalization
- **Quick fix:** No quick fix — this is architectural
- **Long fix (5 days):** Implement `learner_profiles`, `concept_mastery`, `misconceptions` tables (see Section 3.5). Add API endpoints for read/update. Migrate existing quiz results to populate initial state
- **Validation:** Write unit tests for learner state CRUD. Integration test: submit 5 quizzes → verify learner state reflects correct accuracy, misconceptions

#### Blocker #3: Level Generator Monolith (400+ Lines)
- **Risk: 3** — Hard to add new templates, buggy to modify, untestable
- **Effort: 5 days**
- **Impact: 5** — Unlocks template system (Section 1), quality scoring (Section 2), testability
- **Quick fix:** No quick fix
- **Long fix (5 days):**
  1. Extract `Room` dataclass with position, size, exits, enemies
  2. Extract `DungeonGraph` class managing room connectivity (MST, BFS)
  3. Extract template generators: `LinearChainGenerator`, `HubGenerator`, etc.
  4. Extract `QualityScorer` as separate module
  5. Main `generate_dungeon()` becomes orchestrator calling sub-modules
- **Validation:** Existing generation output should be identical for same seed. Add unit tests per template

#### Blocker #4: No Rate Limiting on Lesson Endpoint
- **Risk: 4** — Abuse scenario: bot hitting /generate-lesson 1000x/min → burns API quota
- **Effort: 1 day**
- **Impact: 4** — Prevents abuse, protects API budget
- **Quick fix (1 day):** Add FastAPI middleware — `slowapi` or custom: 10 requests/min per IP, 30 requests/min per authenticated user
- **Long fix (2 days):** Token-bucket rate limiter with Redis backend, per-user quotas, admin override
- **Validation:** Load test: send 50 requests in 10s from same IP, verify 429 returned after limit

#### Blocker #5: No Instrumentation / Event Logging
- **Risk: 4** — Can't debug user issues, can't measure A/B tests, can't validate changes
- **Effort: 5 days**
- **Impact: 5** — Unlocks A/B testing (Section 7), dropout analysis (Section 6), all analytics
- **Quick fix:** No quick fix for comprehensive instrumentation
- **Long fix (5 days):** Implement events table (Section 7.3), add logging to all endpoints (lesson, quiz, dungeon, boss), add frontend event SDK (send events on user actions), build basic dashboard query endpoints
- **Validation:** Complete one full student flow (lesson → quiz → dungeon → boss) and verify all events logged

#### Blocker #6: Database Queries Not Indexed
- **Risk: 3** — Query latency grows with data. At 10K students, lookups will be slow
- **Effort: 1 day**
- **Impact: 3** — Faster queries, better UX
- **Quick fix (1 day):** Add indexes on `student_id`, `concept`, `timestamp` columns (see Section 7.3 index definitions)
- **Long fix:** Same as quick fix — indexing is straightforward
- **Validation:** Run EXPLAIN QUERY PLAN on common queries before/after indexing. Verify index usage

#### Blocker #7: OpenRouter Model List Hardcoded
- **Risk: 2** — Models get deprecated, new free models appear. Currently requires code change to update
- **Effort: 2 days**
- **Impact: 3** — Easier model swaps, can A/B test different models
- **Quick fix (1 day):** Move model list to `config.json` or environment variable
- **Long fix (2 days):** Database-driven model registry: `ai_models` table with (model_id, provider, priority, is_active, last_success_rate). Admin endpoint to enable/disable models
- **Validation:** Disable one model in config/DB, verify fallback works. Add new model, verify it gets used

#### Blocker #8: No Feature Flags / Rollback Strategy
- **Risk: 3** — If new generation code has bugs, no way to quickly revert without deploy
- **Effort: 3 days**
- **Impact: 4** — Safe deployments, gradual rollouts, A/B test infrastructure
- **Quick fix:** No quick fix
- **Long fix (3 days):** Simple feature flag system — `feature_flags` table with (flag_name, enabled, rollout_percentage, student_segment). Check flags at runtime: `if feature_flag("new_template_system", student_id): use_new_generator() else: use_old_generator()`
- **Validation:** Deploy with flag off, verify old behavior. Enable for 10%, verify new behavior. Disable, verify rollback instant

#### Blocker #9: Frontend Error Handling Brittle
- **Risk: 3** — `LessonView.tsx` has try/catch with GET fallback. If both fail, user sees nothing
- **Effort: 3 days**
- **Impact: 3** — Better UX on errors, reduces perceived bugs
- **Quick fix (1 day):** Add proper error boundary component with user-friendly message + retry button
- **Long fix (3 days):** Formalize error handling: define error types (network, timeout, server, validation), create `ErrorBoundary` component, add retry logic with exponential backoff, show contextual error messages ("Lesson generation is slow, retrying…")
- **Validation:** Simulate server errors (return 500s), verify user sees helpful messages and can retry

#### Blocker #10: No Caching Layer for Lessons
- **Risk: 3** — Same lesson generated multiple times for same concept. Wastes API calls
- **Effort: 3 days**
- **Impact: 4** — Faster response times, lower API costs, handles 1000+ concurrent users
- **Quick fix (1 day):** In-memory dict cache with TTL (24h). Key: (concept, difficulty)
- **Long fix (3 days):** Redis cache layer. Cache generated lessons, questions, and dungeon metadata. TTL: 24h for lessons, 1h for questions (more variety needed). Cache invalidation on content update
- **Validation:** Generate lesson for "sorting", verify second request hits cache (response time < 10ms vs > 1s)

### 8.3 User Experience Impact

**Two blockers with outsized UX impact:**

1. **#1 Circuit Breaker** — Without it, students experience random 5–10s hangs when OpenRouter fails. This directly causes drop-off. Fix makes failures invisible (instant fallback).

2. **#5 Instrumentation** — Without it, you're flying blind. You can't identify WHERE students drop off, WHAT concepts are hard, or WHETHER changes help. This blocks every future improvement.

### 8.4 Three-Month Roadmap

#### Month 1: Foundation (Fix Top Blockers)

| Week | Task | Blockers Addressed |
|------|------|-------------------|
| Week 1 | Circuit breaker + rate limiting + DB indexes | #1, #4, #6 |
| Week 2 | Learner model persistence (DB schema + API) | #2 |
| Week 3 | Event logging infrastructure (events table + API) | #5 |
| Week 4 | Level generator refactoring (extract Room, Graph, Templates) | #3 |

**Deliverables:** Robust AI pipeline, persistent learner state, event logging, modular generator

#### Month 2: Scale & Quality

| Week | Task | Blockers Addressed |
|------|------|-------------------|
| Week 5 | Feature flags system + OpenRouter model registry | #7, #8 |
| Week 6 | Frontend error handling + caching layer | #9, #10 |
| Week 7 | Quality scoring function (Section 2) + template system | New feature |
| Week 8 | A/B testing framework + first test (interleaved quiz) | New feature |

**Deliverables:** Safe deployments, better error UX, dungeon quality scoring, first A/B test running

#### Month 3: Intelligence & Growth

| Week | Task |
|------|------|
| Week 9 | Adaptive difficulty engine (Section 3) |
| Week 10 | Boss question pipeline with misconception library (Section 4) |
| Week 11 | Analytics dashboard + concept heatmap |
| Week 12 | UX retention hooks (streaks, social proof, previews) |

**Deliverables:** Personalized difficulty, intelligent boss encounters, actionable analytics, retention features

---

## Quick Reference: File/Module Map

When implementing, here's where each system should live:

```
backend/
├── app/
│   ├── core/
│   │   ├── config.py              # Feature flags, model registry
│   │   ├── events.py              # Event logging infrastructure
│   │   └── cache.py               # Question + lesson cache layer
│   ├── models/
│   │   ├── learner.py             # LearnerState, ConceptMastery, Misconception
│   │   ├── dungeon.py             # DungeonPayload, Room, EnemyData, BossData
│   │   └── events.py              # BaseEvent, DungeonCompletedEvent, etc.
│   ├── services/
│   │   ├── difficulty_engine.py   # Adaptive difficulty calculation
│   │   ├── quality_scorer.py      # Dungeon quality score (0-100)
│   │   ├── question_pipeline.py   # Boss question selection + generation
│   │   ├── provider_manager.py    # Multi-provider routing + circuit breaker
│   │   └── dungeon_generator/
│   │       ├── __init__.py        # Orchestrator: generate_dungeon()
│   │       ├── templates/
│   │       │   ├── linear_chain.py
│   │       │   ├── hub.py
│   │       │   ├── branching_tree.py
│   │       │   ├── diamond.py
│   │       │   └── open_hall.py
│   │       ├── room.py            # Room dataclass + placement logic
│   │       └── graph.py           # MST, BFS, connectivity
│   ├── routes/
│   │   ├── lessons.py             # + rate limiting middleware
│   │   ├── quiz.py                # + misconception logging
│   │   ├── dungeon.py             # + adaptive difficulty params
│   │   └── analytics.py           # Dashboard queries
│   └── db/
│       ├── schema.sql             # All tables (students, events, quiz_results, etc.)
│       └── migrations/            # Schema migrations
frontend/
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.tsx      # Formalized error handling
│   │   ├── DifficultyPreview.tsx  # Pre-dungeon difficulty display
│   │   └── StreakBadge.tsx        # Retention: streak display
│   └── services/
│       └── eventLogger.ts         # Frontend event SDK
```

---

## Summary

This document provides complete, actionable design answers for all 8 areas of the WASM-RPG project:

1. **Level Architecture:** 5 distinct dungeon templates with variety-aware selection
2. **Quality Scoring:** 0–100 scoring across 5 categories with rejection thresholds
3. **Adaptive Difficulty:** Learner state model with hysteresis-protected transitions
4. **Boss Questions:** Misconception-targeted question pipeline with 3-attempt outcome handling
5. **Provider Reliability:** Circuit breaker + validation + caching + intelligent routing
6. **UX/Retention:** Redesigned flow with 3 high-impact A/B tests and instrumentation plan
7. **Telemetry:** Full event schema, KPIs, SQL schema, A/B testing framework
8. **Tech Debt:** Top 10 blockers prioritized in strategic order with 3-month execution roadmap

Each section includes pseudocode, data structures, and database schemas ready for implementation.
