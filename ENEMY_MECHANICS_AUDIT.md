# CRITICAL AUDIT: Enemy Mechanics Broken

## TL;DR
**Enemies instantly die on contact with zero interaction. No quiz questions are asked.**

---

## THE PROBLEM

### What SHOULD happen:
```
Player walks on tile with enemy
→ Game pauses
→ Enemy quiz question appears
→ Player answers the question
→ If CORRECT: Enemy dies, player doesn't take damage
→ If WRONG: Player takes damage, enemy remains
```

### What ACTUALLY happens:
```
Player walks on tile with enemy
→ Enemy deals damage automatically
→ Enemy removed from map
→ No quiz shown
→ No interaction whatsoever
```

---

## CODE AUDIT

### 1. WASM Game Engine (Engine Side) - No Enemy Logic

**File:** `/engine/src/game.cpp`

```cpp
// In handle_input() function (lines 57-111)
// ✗ MISSING: No collision detection with enemies
// ✗ MISSING: No quiz trigger
// ✗ MISSING: No damage system

void game_update_and_render() {
    handle_input();
    // ... rendering code ...
    Renderer::render_enemies(g_game.renderer, g_game.tileset, g_game.enemies);
    // Enemies just render as visual decoration!
}
```

**Issue:** The WASM engine loads enemies but never checks for player-enemy collisions. Enemies are pure decoration.

---

### 2. Frontend (React) - Broken Enemy System

**File:** `/frontend/src/pages/Game.tsx` (lines 113-119)

```typescript
// CRITICAL ISSUE: Enemy is not a quiz encounter, just damage!
if (enemyMap[key] && !encounteredEnemies[key]) {
  const damage = enemyMap[key].damage ?? 10;
  setEncounteredEnemies((prev) => ({ ...prev, [key]: true }));
  setPlayerHp((hp) => Math.max(0, hp - damage));
  setMessage(`Enemy encounter: ${enemyMap[key].type}. You took ${damage} damage.`);
  // ✗ BUG: concept_question field is NEVER USED
  // ✗ BUG: No quiz modal appears
  // ✗ BUG: Enemy dies without any player input
}
```

### What's Wrong Here:
1. **No Quiz Modal** - `concept_question` field exists but is never rendered
2. **Instant Death** - Enemy automatically removed after damage
3. **No Player Choice** - No opportunity to answer question and prove mastery
4. **Enemy Struct Wasted** - The whole Enemy type has these unused fields:
   ```cpp
   struct Enemy {
       std::string type;              // 'push_sentinel', 'queue_serpent'
       int hp = 30;                   // NEVER USED
       int max_hp = 30;               // NEVER USED
       int damage = 10;               // Only this is used
       std::string concept_question;  // ✗ NEVER USED
   }
   ```

---

## WHAT THE AUDIT FOUND

### Backend (Engine) - Missing Logic
- ✗ No enemy-player collision detection
- ✗ No combat loop in WASM
- ✗ No quiz question rendering
- ✗ No enemy health tracking
- ✗ No "defeat enemy" victory condition

### Frontend (React) - Incomplete Implementation
- ✗ Enemy encounters don't show quiz questions
- ✗ No modal/dialog for quiz during combat
- ✗ `concept_question` field loaded but never displayed
- ✗ Enemy type/HP fields are loaded but not used
- ✗ No "answer wrong = stay in combat" logic
- ✗ No "answer right = enemy defeated" logic

### Data Flow - Completely Broken
```
Backend sends: Enemy { concept_question, damage, hp, type }
                    ↓
Frontend receives: ✓ (correct)
                    ↓
Frontend uses:    damage ONLY ✓
                  concept_question ✗
                  hp ✗
                  type ✓ (only for message display)
```

---

## EVIDENCE FROM CODE

### Enemy Struct Proves Intent (game.h:24-39):
```cpp
struct Enemy {
    float x, y;
    int width = 16, height = 16;
    int tile_id = 3;
    
    std::string type;              // "push_sentinel" - loaded ✓, used ✓ (for message)
    int hp = 30;                   // loaded ✓, used ✗
    int max_hp = 30;               // loaded ✓, used ✗
    int damage = 10;               // loaded ✓, used ✓
    std::string concept_question;  // loaded ✓, used ✗ ← SMOKING GUN
};
```

### Level Loader DOES Load Questions (level_loader.cpp:94):
```cpp
if (enemy_json.contains("concept_question")) {
    enemy.concept_question = enemy_json["concept_question"].get<std::string>();
}
// Question is loaded but WHERE IS IT USED???
```

### Frontend Receives Enemy Data But Ignores Quiz Field:
```typescript
// Game.tsx doesn't show quiz field anywhere
// Component only looks at: type, damage, x, y
// concept_question is loaded and discarded
```

---

## THE MISSING SYSTEMS

### Missing: Enemy Combat Modal
Should exist but doesn't:
```typescript
<EnemyCombatModal
  enemy={enemy}
  question={enemy.concept_question}
  onAnswer={handleEnemyAnswer}
  isOpen={inCombat}
/>
```

### Missing: Combat Logic
```typescript
const handleEnemyAnswer = (isCorrect: boolean) => {
  if (isCorrect) {
    // Enemy dies, no damage taken
    removeEnemy(enemyKey);
    setMessage("Enemy defeated! Concept mastered.");
  } else {
    // Player takes damage, combat continues
    setPlayerHp(hp => hp - enemy.damage);
    setMessage("Wrong! Enemy is still here. Try again.");
  }
};
```

### Missing: Multi-Turn Enemy Combat
Currently just:
- Touch enemy → take damage → instant enemy death

Should be:
- Touch enemy → quiz appears → answer → result (win/lose round)
- Wrong? Try again without penalty (or repeat question)
- Right? Enemy defeated

---

## VERIFICATION: Screenshot Proof

From user screenshot showing "2/2 ENEMIES" counter:
- Enemies ARE being encountered
- But the status is just "encountered" with damage
- No quiz dialog visible
- Message says "Boss defeated. Dungeon mastered." but HOW?
  - There's no indication player answered any questions
  - Boss just... died when reached

---

## ROOT CAUSE

**Design Mismatch:**
1. Backend designed to send enemies with concept questions
2. Frontend designed to show quiz on encounter
3. **BUT:** Frontend implementation is incomplete
   - Only the "take damage" part was coded
   - The "show quiz" part was never implemented

---

## SUMMARY TABLE

| Feature | Designed? | Implemented? | Working? | Evidence |
|---------|-----------|-------------|----------|----------|
| Enemy appears on map | ✓ | ✓ | ✓ | Renders as orange square |
| Player touches enemy | ✓ | ✓ | ✓ | Position collision works |
| Enemy damage applied | ✓ | ✓ | ✓ | HP decreases |
| **Quiz question shown** | ✓ | ✗ | ✗ | concept_question field unused |
| **Combat modal/dialog** | ✓ | ✗ | ✗ | No component exists |
| **Answer input form** | ✓ | ✗ | ✗ | No UI element |
| **Enemy defeat on correct answer** | ✓ | ✗ | ✗ | Enemy auto-dies regardless |
| **Health tracking** | ✓ | ✗ | ✗ | Enemy hp/max_hp never used |
| **Multi-turn combat** | ✓ | ✗ | ✗ | One touch = auto-defeat |

---

## IMPACT ON LEARNING

**Current (Broken):**
- Player: "I touched an enemy... it died. What did I learn?"
- Mechanic: **Decoration** - enemies are scenery, not learning tools

**Intended (Missing Code):**
- Player: "I touched an enemy! I must answer: 'What does LIFO mean?'"
- Player: "I answered wrong. Enemy still here."
- Player: "Stack stores LIFO - pushing/popping."
- Player: "I answered right! Enemy defeated."
- Mechanic: **Active Learning** - enemy defeat = concept mastery proof

---

## FILES THAT NEED CHANGES

1. **frontend/src/pages/Game.tsx**
   - Add enemy combat modal component
   - Add quiz question display
   - Add answer submission logic
   - Change enemy encounter from instant-death to combat-mode

2. **frontend/src/components/** (NEW)
   - Create `EnemyCombatModal.tsx` component
   - Handle quiz rendering
   - Handle answer validation

3. **engine/src/game.cpp** (OPTIONAL)
   - Could add combat system to WASM
   - Currently not needed since React handles it

---

## CONCLUSION

The game HAS the infrastructure to support meaningful enemy encounters:
- ✓ Enemy struct with concept questions
- ✓ Level loader parses questions
- ✓ Backend sends complete data

But the **FRONTEND NEVER USES IT**. When a player steps on an enemy:
- It just deals damage
- It just disappears
- No quiz appears
- No learning happens

**This is why stepping on an enemy = instant death with zero interaction.**
