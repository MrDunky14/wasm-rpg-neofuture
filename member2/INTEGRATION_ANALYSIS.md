# Member 2 Backend Analysis & Engine Integration Plan

**Date:** April 10, 2026  
**Purpose:** Extract backend specs and recommend C++ engine changes for full integration

---

## 📋 Backend Overview

Member 2 (FastAPI backend) provides:
1. **Quiz System** — Students answer questions → API scores them
2. **Level Generation** — Failed topics → Dungeon JSON payload
3. **Progress Tracking** — Save/load student performance

---

## 🔗 Critical Integration Points for Engine

### 1. Level Schema (Lock Point)

The backend sends JSON matching this contract:

```json
{
  "level_name": "The Tower of LIFO",
  "concept": "stack",
  "difficulty": 2,
  "width": 15,
  "height": 12,
  "tiles": [[ /* 2D array */ ]],
  "player_start": {"x": 1, "y": 1},
  "objective": {"x": 13, "y": 10, "type": "reach_exit"},
  "enemies": [
    {
      "type": "push_sentinel",
      "x": 7, "y": 7,
      "hp": 35,           ← ⚠️ New: Engine must track this
      "damage": 10,       ← ⚠️ New: Combat system
      "concept_question": "Push 5, Push 3, Pop → What?"
    }
  ],
  "boss": {
    "type": "stack_overlord",
    "hp": 100,
    "damage": 20,
    "mechanic_type": "stack_push_pop",
    "question_sequence": ["Q1", "Q2", "Q3"],
    "damage_per_wrong_answer": 25
  }
}
```

**Key Observation:** Engine MUST extend to handle:
- Enemy HP and damage fields
- Boss with multi-part question sequence
- Concepts that drive mechanic difficulty

---

### 2. Tile Types Reference

Backend uses **7 tile types** (engine only renders 5):

| ID | Type | Behavior | Current Engine | Action |
|---|---|---|---|---|
| 0 | floor | Walkable | ✅ Yes | OK |
| 1 | wall | Solid | ✅ Yes | OK |
| 2 | door | Walkable (visual) | ✅ Yes | OK |
| 3 | enemy_spawn | Enemy starts here | ✅ Rendered | Need collision |
| 4 | objective | Goal marker | ✅ Rendered | OK |
| 5 | trap | Damage on touch | ❌ Not handled | **ADD** |
| 6 | boss_spawn | Boss spawns here | ❌ Not handled | **ADD** |

---

### 3. API Endpoints Used by Frontend

**Frontend will call these to build the experience:**

```
GET /api/quiz/questions
  → Return all quiz questions (answers stripped)

POST /api/quiz/submit
  {
    "student_id": "mary123",
    "answers": [
      {"question_id": 1, "selected_option": "a"},
      {"question_id": 2, "selected_option": "c"},
      ...
    ]
  }
  ← Returns {
    "total_score": 70,
    "percentage": 70.0,
    "topic_scores": [...],
    "failed_topics": ["stack", "sorting"]  ← Key output
  }

POST /api/level/generate
  {
    "failed_topics": ["stack", "sorting"],
    "difficulty": 2
  }
  ← Returns [LevelPayload, LevelPayload]  ← Pass to engine

GET /api/level/prebuilt/stack
  ← Returns single LevelPayload (for quick testing)
```

---

### 4. Pre-Built Levels Available

Backend includes 3 handcrafted dungeon JSON files:

| Concept | File | Difficulty | Notes |
|---|---|---|---|
| Stack | `backend/levels/stack_dungeon.json` | Medium | "The Tower of LIFO" |
| Queue | `backend/levels/queue_dungeon.json` | TBD | "The Queue Caverns" |
| Sorting | `backend/levels/sorting_dungeon.json` | TBD | "The Unsorted Abyss" |

✅ **Advantage:** These are handcrafted, tested, graphically coherent. Engine should prefer these for MVP.

---

## 🎮 Engine Code Changes Required

### Change 1: Extend Enemy Structure

**Current** (engine/include/game.h):
```cpp
struct Enemy {
    float x, y;
    int tile_id = 3;
};
```

**Required** (add combat fields):
```cpp
struct Enemy {
    float x, y;
    int tile_id = 3;
    std::string type;           // ← NEW: "push_sentinel", "queue_serpent", etc.
    int hp = 30;                // ← NEW: Current health
    int max_hp = 30;            // ← NEW: Max health
    int damage = 10;            // ← NEW: Damage per hit
    std::string concept_question;  // ← NEW: Quiz Q for defeating
};
```

**Impact:** JSON parsing must extract these fields. Rendering may need visual feedback for HP.

---

### Change 2: Add Boss Structure

**Current:** No boss system  
**Required:**
```cpp
struct BossEnemy {
    float x, y;
    std::string type;           // "stack_overlord", etc.
    int hp = 100;
    int max_hp = 100;
    int damage = 20;
    std::string mechanic_type;  // "stack_push_pop", etc.
    std::vector<std::string> question_sequence;
    int damage_per_wrong_answer = 25;
    int current_question_index = 0;  // Which Q is boss on?
    bool is_defeated = false;
};
```

**Where:** Add to GameState struct

---

### Change 3: Handle Additional Tile Types

**Trap (tile_id = 5):**
- On player collision → reduce player HP by fixed amount
- Visual feedback: player flash or special rendering

**Boss Spawn (tile_id = 6):**
- On player collision → trigger boss encounter mode
- Transition: normal gameplay → boss fight screen

---

### Change 4: Extend JSON Level Loader

**Current:** Parses enemies as simple array  
**Required:**

```cpp
// Parse enemy with new fields
for (const auto& enemy_json : level_json["enemies"]) {
    Enemy enemy;
    enemy.x = enemy_json["x"];
    enemy.y = enemy_json["y"];
    enemy.type = enemy_json.value("type", "generic_enemy");
    enemy.hp = enemy_json.value("hp", 30);
    enemy.max_hp = enemy.hp;
    enemy.damage = enemy_json.value("damage", 10);
    enemy.concept_question = enemy_json.value("concept_question", "");
    enemies.push_back(enemy);
}

// Parse boss (optional)
if (level_json.contains("boss") && !level_json["boss"].is_null()) {
    const auto& boss_json = level_json["boss"];
    game.boss.type = boss_json["type"];
    game.boss.hp = boss_json.value("hp", 100);
    game.boss.max_hp = game.boss.hp;
    game.boss.damage = boss_json.value("damage", 20);
    game.boss.mechanic_type = boss_json["mechanic_type"];
    
    // Parse question sequence
    for (const auto& q : boss_json["question_sequence"]) {
        game.boss.question_sequence.push_back(q);
    }
    game.boss.damage_per_wrong_answer = boss_json.value("damage_per_wrong_answer", 25);
}
```

---

## 📊 Priority Order for Implementation

| Phase | Task | Impact | Time |
|---|---|---|---|
| **Phase 1** | Extend Enemy struct with hp/damage | High | 30 min |
| **Phase 1** | Update JSON loader for enemy fields | High | 30 min |
| **Phase 2** | Add trap tile collision handler | Medium | 20 min |
| **Phase 2** | Add boss structure to GameState | Medium | 15 min |
| **Phase 2** | Parse boss from JSON | Medium | 30 min |
| **Phase 3** | Boss rendering (placeholder box) | Medium | 20 min |
| **Phase 3** | Boss encounter state machine | Low | 1+ hour |
| **Phase 4** | Combat system (optional, hackathon) | Low | 2+ hours |

---

## ✅ Testing Checklist

1. Load `stack_dungeon.json` from backend  
2. Enemies render with correct positions  
3. Get player collision with enemy (should print hp/damage to console)
4. Reach objective tile → win condition still works  
5. Boss JSON parses without errors  
6. Boss appears at spawn tile

---

## 🔗 File Cross-Reference

**Backend files to match against:**
- Schema lock: `member2/shared/level_schema.json`
- Example payload: `member2/backend/levels/stack_dungeon.json`
- API source: `member2/backend/app/routes/level.py`
- Level generator: `member2/backend/app/services/level_generator.py`

**Engine files to modify:**
- `engine/include/game.h` — Extend Enemy, add Boss, GameState
- `engine/src/level_loader.cpp` — Parse new fields
- `engine/src/renderer.cpp` — (Maybe) HP bar visualization
- `engine/src/collision.cpp` — Trap/boss tile handling
- `shared/level_schema.json` — Already synced with member2/shared/

---

## 🚀 Quick Win: Load Stack Dungeon

To validate integration without writing new code:

1. Copy `member2/backend/levels/stack_dungeon.json` → `engine/assets/stack_dungeon.json`
2. Modify `engine/wasm-smoke-test.html` to fetch and load this file
3. Verify enemies spawn at correct positions
4. Current engine already ignores extra JSON fields, so it should "just work"

---

## 💡 Design Notes

- **Enemy HP rendering:** Can use color (bright green = full, red = low) or simple console output for MVP
- **Combat system:** Not required for MVP. Just render enemies statically.
- **Boss questions:** Can be text popup (extra UI for M1 frontend)
- **Trap tiles:** Simple: `if (tile_id == 5) player_hp -= 10`

---

**Session:** Member 3 Integration Review  
**Next Steps:** Apply Phase 1 changes to engine code (30 min task)
