# DSA Concept Integration & Adaptive Level Generation

**Status:** Member 2 Backend + Engine Integration Complete ✅  
**Concept Engine:** Topic → Enemy Type → Boss Mechanic → Questions

---

## 🎓 DSA Topics Covered (8 Concepts)

| Topic | Dungeon Name | Enemy Type | Boss Type | Boss Mechanic | Questions |
|---|---|---|---|---|---|
| **Stack** | Tower of LIFO | stack_golem | stack_overlord | `stack_push_pop` | Push/Pop/LIFO principles |
| **Queue** | Queue Caverns | queue_serpent | queue_warden | `queue_enqueue_dequeue` | Enqueue/Dequeue/FIFO |
| **Sorting** | Unsorted Abyss | chaos_sorter | sort_master | `sorting_sequence` | QuickSort/MergeSort complexity |
| **Binary Search** | Bifurcation Maze | search_phantom | binary_sentinel | `binary_search_steps` | Sorted arrays, O(log n) |
| **Recursion** | Infinite Descent | recursive_shade | recursion_hydra | `recursion_base_case` | Base case, factorial, stack memory |
| **Linked List** | Chain Dungeon | node_crawler | list_leviathan | `linked_list_ops` | Node structure, insertion, access time |
| **Graph Traversal** | Interconnected Labyrinth | graph_wraith | graph_colossus | `graph_bfs_dfs` | BFS/DFS data structures |
| **Math/Algebra** | Equation Fortress | algebra_imp | equation_titan | `solve_equation` | Basic algebra, exponents, factoring |

---

## 📊 Student Performance → Level Generation Pipeline

### Phase 1: Quiz Assessment
```
Student takes diagnostic quiz (6-24 questions across topics)
    ↓
Backend scores each topic (PASS_THRESHOLD = 50%)
    ↓
Identifies failed topics (score < 50%)
    ↓
Returns QuizResult with:
  - total_score, percentage
  - topic_scores (per-topic breakdown)
  - failed_topics (topics to practice)
```

**Example Quiz Result:**
```json
{
  "student_id": "alice123",
  "total_score": 12,
  "total_questions": 20,
  "percentage": 60.0,
  "topic_scores": [
    {"topic": "stack", "correct": 0, "total": 3, "passed": false},
    {"topic": "sorting", "correct": 3, "total": 3, "passed": true},
    {"topic": "recursion", "correct": 2, "total": 3, "passed": false}
  ],
  "failed_topics": ["stack", "recursion"]
}
```

---

### Phase 2: Adaptive Dungeon Generation

**Input:** `POST /api/level/generate`
```json
{
  "failed_topics": ["stack", "recursion"],
  "difficulty": 2
}
```

**Process:**
```
For each failed topic:
  1. Look up TOPIC_THEMES[topic]
  2. Calculate DIFFICULTY_SCALE[difficulty]
  3. Generate procedural dungeon:
     - Carve 3 rooms + corridors
     - Place enemies in middle room
     - Place boss at exit
  4. Build LevelPayload with JSON
```

**Output:** Array of LevelPayload objects (one per failed topic)
```json
[
  {
    "level_name": "The Tower of LIFO",
    "concept": "stack",
    "difficulty": 2,
    "width": 15,
    "height": 12,
    "tiles": [[ 2D array ]],
    "player_start": {"x": 1, "y": 1},
    "objective": {"x": 13, "y": 10, "type": "reach_exit"},
    "enemies": [
      {
        "type": "push_sentinel",
        "x": 7, "y": 7,
        "hp": 35,
        "damage": 10,
        "concept_question": "Push 5, Push 3, Pop → What was popped?"
      }
    ],
    "boss": {
      "type": "stack_overlord",
      "hp": 100,
      "damage": 20,
      "mechanic_type": "stack_push_pop",
      "question_sequence": [
        "Push A, Push B, Push C, Pop, Pop → What remains?",
        "What principle does a Stack follow?",
        "Implement LIFO: Push 5, Push 3, Pop. What's left?"
      ],
      "damage_per_wrong_answer": 25
    }
  },
  {
    "level_name": "The Infinite Descent",
    "concept": "recursion",
    "difficulty": 2,
    ...
  }
]
```

---

## 🎮 How Gameplay Reinforces Concepts

### Example: Stack Dungeon

**Student's Task:** "You failed Stack questions. Master LIFO mechanics to escape The Tower of LIFO."

**Dungeon Mechanics:**
1. **Navigation:** Player must traverse from start room → enemy room → boss room
   - Teaches: Systematic problem-solving, following steps in order (like stack operations)

2. **Enemies (push_sentinel, pop_guardian):**
   - Encounter Q: "Push 5, Push 3, Pop → What was popped?"
   - Force student to mentally execute push/pop sequence
   - Defeat by answering correctly

3. **Boss (stack_overlord):**
   - Multi-stage encounter with 3 questions of increasing difficulty
   - Q1: "Push A, Push B, Push C, Pop, Pop → What remains?" (Trace execution)
   - Q2: "What principle does a Stack follow?" (Conceptual)
   - Q3: "Implement LIFO..." (Synthesis)
   - Takes damage per wrong answer; healing from correct answers

**Learning Outcome:** By playing through the dungeon, student practices:
- Tracing push/pop sequences (procedural knowledge)
- Understanding LIFO vs FIFO (conceptual knowledge)
- Applying stack mechanics under pressure (transfer)

---

## 📈 Difficulty Scaling (Based on Student Performance)

### Easy (Difficulty = 1)
```python
{
  "enemy_hp": 20,         # Weak enemies
  "enemy_dmg": 5,         # Low damage per hit
  "boss_hp": 60,          # Weak boss
  "boss_dmg": 10,         # Low damage
  "num_enemies": 2        # Few encounters
}
```
**Use Case:** Student struggled badly with concept (< 30% on quiz)  
**Goal:** Build confidence with forgiving difficulty

### Medium (Difficulty = 2) — DEFAULT
```python
{
  "enemy_hp": 35,
  "enemy_dmg": 10,
  "boss_hp": 100,
  "boss_dmg": 20,
  "num_enemies": 3
}
```
**Use Case:** Student failed but showed some understanding (30-50%)  
**Goal:** Challenge growth with reasonable difficulty

### Hard (Difficulty = 3)
```python
{
  "enemy_hp": 50,         # Strong enemies
  "enemy_dmg": 15,        # High damage
  "boss_hp": 150,         # Formidable boss
  "boss_dmg": 30,         # High damage
  "num_enemies": 5        # Many encounters
}
```
**Use Case:** Student passed threshold but wants challenge  
**Goal:** Deep mastery through adversarial difficulty

---

## 🧠 Question Bank Integration

### 24 Total Questions (3 per topic)

**Stack Questions (IDs 1-3):**
1. "What principle does a Stack follow?" → Options: FIFO/LIFO/LILO/Random
2. "Which operation removes the top element?" → Options: push/peek/pop/dequeue
3. "After pushing 1,2,3 and popping twice, what's on top?" → Options: 1/2/3/Empty

**Queue Questions (IDs 4-6):**
1. "What principle does a Queue follow?" → Options: LIFO/FIFO/Priority/Random
2. "Which operation adds to rear?" → Options: push/enqueue/pop/insert
3. "Print spooler is example of?" → Options: Stack/Queue/Tree/Graph

**Sorting Questions (IDs 7-9):**
1. "Average-case complexity of QuickSort?" → Options: O(n)/O(n log n)/O(n²)/O(log n)
2. "Stable sort with O(n log n) worst?" → Options: QuickSort/HeapSort/MergeSort/SelectionSort
3. "Bubble Sort compares?" → Options: Every element/Adjacent/First+Last/Random

**... and 16 more across the remaining 5 topics**

---

## 🎯 Demo Mode (Reliable Live Presentation)

**Challenge:** Live demos are unpredictable; need guaranteed flow.

**Solution:** Curated demo quiz with preset answers

```python
DEMO_QUESTION_IDS = [1, 2, 3, 7, 8, 9]  # 3 Stack + 3 Sorting

DEMO_ANSWERS_FAIL_STACK = [
    {"question_id": 1, "selected_option": "a"},  # WRONG (should be b=LIFO)
    {"question_id": 2, "selected_option": "a"},  # WRONG (should be c=pop)
    {"question_id": 3, "selected_option": "b"},  # WRONG (should be a=1)
    {"question_id": 7, "selected_option": "b"},  # CORRECT
    {"question_id": 8, "selected_option": "c"},  # CORRECT
    {"question_id": 9, "selected_option": "b"},  # CORRECT
]
```

**Result:** Fails Stack (0/3), Passes Sorting (3/3) → Generates "The Tower of LIFO" dungeon  
**Endpoint:** `POST /api/quiz/demo/submit` → instant result

---

## 🔗 Engine Integration Points

### 1. **Concepts Stored in GameState** ✅
```cpp
struct GameState {
    std::string concept;        // e.g., "stack"
    int difficulty = 1;         // 1=Easy, 2=Medium, 3=Hard
    ...
};
```
- Parsed from JSON level payload
- Can drive game behavior (e.g., UI hints for specific concepts)

### 2. **Enemy Concept Questions** ✅
```cpp
struct Enemy {
    std::string concept_question;  // e.g., "Push 5, Push 3, Pop..."
};
```
- Engine stores but doesn't yet use in combat
- Frontend can display as encounter dialog

### 3. **Boss Question Sequence** ✅
```cpp
struct Boss {
    std::vector<std::string> question_sequence;  // Multi-part Q
    int current_question_index = 0;
};
```
- Engine stores the full sequence
- Combat system can iterate through questions
- Correct answer = damage to boss; wrong = damage to player

---

## 📋 Roadmap: Mechanic Implementation

### ✅ Complete (Phase 1)
- Quiz system with 24 questions across 8 topics
- Topic → level generation mapping
- Difficulty scaling engine
- JSON schema with concept metadata
- Engine parsing of all concept fields

### ⏳ Next (Phase 2)
- **Combat System Prototype**
  - Enemy HP tracking + visualization
  - Player encounters enemy → quiz Q display
  - Correct answer → enemy defeated; rewards
  - Wrong answer → player takes damage

- **Boss Fight State Machine**
  - Boss Health/Phase tracking
  - Question sequence progression
  - Victory/defeat conditions
  - Experience/progress save

- **Concept-Aware UI Hints**
  - Hint system references concept type
  - Example: For Queue dungeon, hint about FIFO
  - Progressive disclosure based on difficulty

### 🎨 Future (Phase 3+)
- **Concept Visualizations**
  - Stack dungeon: towers, gravity (LIFO)
  - Queue dungeon: conveyor belt (FIFO)
  - Sorting dungeon: order/chaos theme
  - Graph dungeon: interconnected paths

- **Adaptive Difficulty Mid-Game**
  - Track combat performance
  - Adjust enemy spawn rate
  - Hint availability scales with struggle

---

## 🧪 Testing Checklist

- [ ] Load Stack dungeon in engine (smoke test)
- [ ] Verify enemies spawn with correct HP/damage
- [ ] Verify boss parses full question sequence
- [ ] Engine receives correct concept string
- [ ] Difficulty enum maps to correct scale
- [ ] Quiz → Failed Topics → Level Gen flow end-to-end
- [ ] Demo mode produces deterministic result

---

## 📊 Current State Summary

| Component | Status | Details |
|---|---|---|
| **8 DSA Topics** | ✅ Defined | Stack, Queue, Sorting, Binary Search, Recursion, Linked List, Graph, Math |
| **Question Bank** | ✅ 24 Questions | 3 per topic, curated for difficulty |
| **Topic → Dungeon Map** | ✅ Themes & Mechanics | Each topic has enemy types, boss, mechanic_type |
| **Difficulty Scaling** | ✅ 3 Levels | Easy/Medium/Hard with HP/damage/count multipliers |
| **Engine Parsing** | ✅ Complete | Reads concept, difficulty, boss questions |
| **Combat System** | ❌ Not Yet | Engine has data; gameplay not implemented |
| **Quiz-to-Level Pipeline** | ✅ Backend Ready | API returns full LevelPayload with concept |
| **Frontend Integration** | ⏳ Pending | M1 to wire quiz results → API call → engine load |

---

## 🎓 Learning Theory Alignment

**Mechanic-as-Metaphor Framework:**
- **Stack Dungeon:** Navigate tower with "push/pop" metaphor
- **Queue Dungeon:** Follow conveyor flow (FIFO principle)
- **Sorting Dungeon:** Bring order to chaos (algorithm visualization)

**Cognitive Levels (Bloom's Taxonomy):**
- **Remember:** Quiz tests recall of definitions
- **Understand:** Dungeon embeds conceptual metaphor
- **Apply:** Combat forces execution of algorithms
- **Analyze:** Boss questions push deeper understanding

---

**Generated:** 2026-04-10  
**For:** Member 3 (Engine Developer)  
**Next Action:** Implement enemy combat system to activate concept learning mechanics
