# DSA Concept-to-Gameplay Flow Diagram

## 📊 Quiz → Diagnosis → Level Gen Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│ STUDENT TAKES DIAGNOSTIC QUIZ (6-24 Questions)                    │
│ Topics: Stack, Queue, Sorting, BinSearch, Recursion, LinkedList... │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────────────┐
│ BACKEND SCORES EACH TOPIC (50% Pass Threshold)                    │
│                                                                     │
│ Scoring Example:                                                    │
│   Topic: STACK     (Questions 1,2,3)  → 1/3 correct = 33% ✗ FAIL  │
│   Topic: SORTING   (Questions 7,8,9)  → 3/3 correct = 100% ✓ PASS │
│   Topic: RECURSION (Questions 13,14,15)→ 2/3 correct = 67% ✓ PASS │
│                                                                     │
│ Result: failed_topics = ["stack"]                                   │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────────────┐
│ ADAPTIVE DIFFICULTY ASSIGNMENT                                      │
│                                                                     │
│ Performance vs Difficulty:                                          │
│   0-30%   → EASY    (Confidence building)                          │
│   30-70%  → MEDIUM  (Growth challenge)  ← DEFAULT                  │
│   70-100% → HARD    (Mastery pursuit)                              │
│                                                                     │
│ Example: Student scored 33% on Stack → Difficulty = EASY          │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────────────┐
│ LEVEL GENERATOR CREATES DUNGEON FOR EACH FAILED TOPIC             │
│                                                                     │
│ For Stack + EASY:                                                   │
│   ├─ Dungeon Name: "The Tower of LIFO"                            │
│   ├─ Enemy Type: stack_golem                                       │
│   ├─ Boss Type: stack_overlord                                     │
│   ├─ Boss Mechanic: "stack_push_pop"                              │
│   └─ Difficulty Scale:                                             │
│       ├─ Enemy HP: 20      (Easy = low health)                     │
│       ├─ Enemy Damage: 5   (Easy = low threat)                     │
│       ├─ Boss HP: 60       (Easy = weak boss)                      │
│       ├─ Boss Damage: 10                                           │
│       └─ Num Enemies: 2    (Few encounters)                        │
│                                                                     │
│ Compare to HARD (if student had scored 80%):                       │
│       ├─ Enemy HP: 50      (3x harder)                             │
│       ├─ Enemy Damage: 15  (3x harder)                             │
│       ├─ Boss HP: 150      (3x harder)                             │
│       └─ Num Enemies: 5    (2.5x more)                             │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────────────┐
│ WASM ENGINE LOADS DUNGEON JSON                                     │
│                                                                     │
│ Engine receives:                                                    │
│   - Dungeon layout (15x12 tiles)                                   │
│   - Player spawn (1,1)                                             │
│   - 2 Enemies at positions with concept-tagged questions          │
│   - Boss at far end with 3-part question sequence                  │
│   - Concept metadata: "stack", difficulty:1                        │
│                                                                     │
│ Parsed into GameState:                                             │
│   g_game.concept = "stack"                                         │
│   g_game.difficulty = 1 (correspond to EASY)                      │
│   g_game.enemies[0].hp = 20                                        │
│   g_game.boss.question_sequence = [Q1, Q2, Q3]                   │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────────────┐
│ GAMEPLAY & LEARNING                                                │
│                                                                     │
│ Player navigates The Tower of LIFO:                               │
│   1. Explore dungeon (reinforce spatial/procedural memory)         │
│   2. Encounter Enemy #1 (push_sentinel)                           │
│      ✓ Question: "Push 5, Push 3, Pop → What?"                    │
│      • Correct Answer → Enemy defeated, confidence boost           │
│      • Wrong Answer → Take damage, retry, learn                    │
│   3. Encounter Enemy #2 (pop_guardian)                            │
│   4. Reach Boss Room (stack_overlord)                             │
│      ✓ Multi-Stage Boss Fight:                                     │
│        - Q1: "Push A, B, C, Pop, Pop → What remains?" (Trace)     │
│        - Q2: "What principle does Stack follow?" (Conceptual)    │
│        - Q3: "Implement LIFO..." (Synthesis)                      │
│      • Each correct answer = boss HP reduced                       │
│      • Defeat boss = concept mastered!                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Concept Reinforcement by Dungeon Type

### Stack Dungeon: "The Tower of LIFO"
```
┌──────────────────────────────────────────────────┐
│    Learning Goal: Master LIFO (Last In, First Out) │
├──────────────────────────────────────────────────┤
│ Mechanic Metaphor: TOWER/STACK LAYERS           │
│   • Push = add to top (build upward)            │
│   • Pop = remove from top (collapse downward)   │
│   • LIFO = order matters                         │
├──────────────────────────────────────────────────┤
│ Enemy: "stack_golem"                             │
│   Question: "Push 5, Push 3, Pop → Popped?"     │
│   → Forces mental execution of sequence          │
├──────────────────────────────────────────────────┤
│ Boss: "stack_overlord"                           │
│   Q Sequence:                                    │
│   1. Trace push/pop sequence (Procedural)       │
│   2. State LIFO principle OR vs FIFO (Conceptual)
│   3. Implement simple push/pop (Application)    │
│                                                  │
│   Winning Strategy: Answer correctly →           │
│   Damage boss, survive, repeat until victory    │
└──────────────────────────────────────────────────┘
```

### Queue Dungeon: "The Queue Caverns"
```
┌──────────────────────────────────────────────────┐
│    Learning Goal: Master FIFO (First In, First Out) │
├──────────────────────────────────────────────────┤
│ Mechanic Metaphor: CONVEYOR BELT                │
│   • Enqueue = add to rear (join line)           │
│   • Dequeue = remove from front (exit line)     │
│   • FIFO = order of arrival                      │
├──────────────────────────────────────────────────┤
│ Enemy: "queue_serpent"                           │
│   Question: "Enqueue 1,2, Dequeue → Removed?"  │
│   → Forces mental execution of queue ops        │
├──────────────────────────────────────────────────┤
│ Boss: "queue_warden"                             │
│   Q Sequence:                                    │
│   1. Trace enqueue/dequeue (Procedural)        │
│   2. Which end enqueued? (Conceptual)           │
│   3. Real-world queue example (Transfer)        │
└──────────────────────────────────────────────────┘
```

### Sorting Dungeon: "The Unsorted Abyss"
```
┌──────────────────────────────────────────────────┐
│    Learning Goal: Master Sorting Algorithms      │
├──────────────────────────────────────────────────┤
│ Concepts: QuickSort, MergeSort, BubbleSort       │
│ Focus: Complexity, Stability, Practical Choice  │
├──────────────────────────────────────────────────┤
│ Enemy: "chaos_sorter"                            │
│   Question: "Sort [5,2,8,1] ascending"          │
│   → Manual sorting practice                      │
├──────────────────────────────────────────────────┤
│ Boss: "sort_master"                              │
│   Q Sequence:                                    │
│   1. Manual sort example (Procedural)           │
│   2. QuickSort vs MergeSort worst-case (Theory)│
│   3. Stable sort implications (Synthesis)       │
└──────────────────────────────────────────────────┘
```

---

## 📖 Question Design by Cognitive Level

### Remember (Quiz Level 1)
```
Q: "What principle does a Stack follow?"
A: LIFO / FIFO / LILO / Random
   → Tests recall of definition
```

### Understand (Quiz Level 2)
```
Q: "Which operation removes from a stack?"
A: push / peek / pop / dequeue
   → Tests comprehension of operation names
```

### Apply (Dungeon Encounter)
```
Q: "After pushing 1,2,3 and popping twice, what's on top?"
A: 1 / 2 / 3 / Empty
   → Forces execution/tracing of operations
   → Requires understanding of how operations work
```

### Analyze (Boss Multi-Stage)
```
Q1: "Push A, Push B, Push C, Pop, Pop → What remains?" (Trace)
Q2: "What principle does Stack follow?" (Concept)
Q3: "Implement LIFO: Push 5, Push 3, Pop. Left?" (Application+Synthesis)
   → Cumulative understanding required
   → Combines procedural + conceptual + synthesis
```

---

## 🎮 Gameplay Loop: How Difficulty Affects Experience

### Difficulty = EASY (Confidence Route)
```
Student struggled (0-30% on quiz)
   ↓
Low-threat enemies (hp=20, dmg=5)
   ↓
More time to think during combat
   ↓
Frequent victories → Motivation boost
   ↓
Internalize concept at foundational level
   ↓
Ready for medium difficulty next attempt
```

### Difficulty = MEDIUM (Growth Route) — DEFAULT
```
Student showed competence (30-70% on quiz)
   ↓
Moderate-threat enemies (hp=35, dmg=10)
   ↓
Balanced challenge & achievability
   ↓
Victories require some strategy
   ↓
Deeper understanding through challenge
   ↓
Prepare for hard mode or next concept
```

### Difficulty = HARD (Mastery Route)
```
Student passed but wants challenge (70-100%)
   ↓
High-threat enemies (hp=50, dmg=15)
   ↓
Multiple encounters (5 enemies)
   ↓
Boss is formidable (hp=150, dmg=30)
   ↓
Victory requires near-perfect execution
   ↓
Consolidate mastery, ready to teach others
```

---

## 💾 Data Flow: Student → Quiz → Dungeon

```
Step 1: Student submits quiz
POST /api/quiz/submit
{
  "student_id": "alice123",
  "answers": [
    {"question_id": 1, "selected_option": "a"},  ✗ WRONG
    {"question_id": 2, "selected_option": "a"},  ✗ WRONG
    {"question_id": 3, "selected_option": "b"},  ✗ WRONG
    ...
  ]
}
   ↓
Step 2: Backend scores
{
  "student_id": "alice123",
  "total_score": 5,
  "percentage": 25.0,
  "topic_scores": [
    {"topic": "stack", "correct": 0, "total": 3, "passed": false},
    {"topic": "sorting", "correct": 2, "total": 3, "passed": true}
  ],
  "failed_topics": ["stack"]
}
   ↓
Step 3: Frontend detects failure, calls level gen
POST /api/level/generate
{
  "failed_topics": ["stack"],
  "difficulty": 1          ← Mapped from 25% score
}
   ↓
Step 4: Backend generates level
{
  "level_name": "The Tower of LIFO",
  "concept": "stack",
  "difficulty": 1,
  "enemies": [
    {"type": "stack_golem", "hp": 20, "damage": 5, ...}
  ],
  "boss": {
    "type": "stack_overlord",
    "hp": 60,
    "question_sequence": [...]
  }
}
   ↓
Step 5: Frontend passes to WASM
Module.ccall('load_level', null, ['string'], [JSON.stringify(level)])
   ↓
Step 6: Engine renders & gameplay
Player navigates The Tower of LIFO, defeats enemies, masters Stack concept
```

---

## 🔄 Repeat Loop

```
Level Complete → Student scores on boss fight
   ↓
Correct answers → Fast completion → High score
   ↓
Backend records progress
   ↓
Student can:
   a) Take another concept quiz (learn new topic)
   b) Re-attempt same topic at higher difficulty
   c) View progress dashboard
```

---

## ✅ Integration Verification Checklist

- [x] 8 DSA concepts defined with distinct themes
- [x] 24 curated questions (3 per topic) in question bank
- [x] Topic → Dungeon mapping (name, enemies, boss, mechanics)
- [x] Difficulty scaling tiers (Easy/Medium/Hard)
- [x] Quiz scoring algorithm with per-topic breakdown
- [x] Failed topic identification (< 50% pass threshold)
- [x] Level generation API (POST /api/level/generate)
- [x] Engine JSON parsing (concept, difficulty, enemy questions, boss Q sequence)
- [x] GameState stores all metadata
- [ ] Combat system implementation (visual health, Q display, damage system)
- [ ] Boss fight multi-stage Q progression
- [ ] Progress save & history tracking

---

**Key Insight:** The system is concept-first, not level-first. Each dungeon teaches a specific DSA topic through:
1. **Thematic design** (Tower for Stack, Conveyor for Queue)
2. **Enemy encounters** (concept-specific questions)
3. **Boss multi-stage** (cumulative understanding checks)
4. **Adaptive difficulty** (based on student performance)

This creates a **personalized learning experience** where game difficulty matches conceptual difficulty.
