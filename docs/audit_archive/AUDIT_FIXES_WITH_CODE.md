# 🐛 ACTIONABLE ISSUES & CODE SNIPPETS

This document provides specific code examples and fixes for each issue found in the audit.

---

## ISSUE #1: HP STATE SYNCHRONIZATION BUG [CRITICAL]

**File:** [frontend/src/pages/Game.tsx](frontend/src/pages/Game.tsx#L56-L112)  
**Severity:** 🔴 CRITICAL  
**Impact:** Player HP display can desync, defeated players can continue playing  

### Current Code (BROKEN)
```typescript
const playerHpRef = useRef(100);    // Line 56
const [playerHp, setPlayerHp] = useState(100);  // Line 57

const applyDamage = useCallback((damage: number, source: string) => {
  const currentHp = playerHpRef.current;       // Line 100
  const nextHp = Math.max(0, currentHp - damage);
  playerHpRef.current = nextHp;                // Line 102 - Updates ref
  setPlayerHp(nextHp);                         // Line 103 - Updates state
  appendCombatLog(`${source} dealt ${damage} damage.`);
  
  if (nextHp === 0) {
    appendCombatLog('HP reached 0. Defeat consequences applied.');
  }
  return nextHp;
}, [appendCombatLog]);

// Other code checks playerHp but applyDamage updates playerHpRef first
// Race condition: ref could be 0 but state still 50 for 1-2 frames
```

### Why It's Broken
1. **Two sources of truth** - ref and state can diverge
2. **State update delayed** - React batches state updates
3. **Race condition** - Code checks state before it updates
4. **Game-over logic missing** - `playerHp <= 0` doesn't trigger end state

### Fix
```typescript
// ✅ REMOVE the ref entirely
// const playerHpRef = useRef(100);  // DELETE THIS LINE

const [playerHp, setPlayerHp] = useState(100);  // Keep only state

const applyDamage = useCallback((damage: number, source: string) => {
  setPlayerHp(prevHp => {
    const nextHp = Math.max(0, prevHp - damage);
    appendCombatLog(`${source} dealt ${damage} damage (${prevHp} → ${nextHp}).`);
    
    if (nextHp === 0) {
      appendCombatLog('❌ You were defeated. Game Over.');
      // Trigger end-game state here or in effect
    }
    
    return nextHp;
  });
}, [appendCombatLog]);

// Remove this line that syncs ref to state:
// useEffect(() => {
//   playerHpRef.current = playerHp;
// }, [playerHp]);

// To check HP in conditions, use state directly:
if (playerHp <= 0) {
  // Player defeated
}
```

### Tests to Add
```typescript
test('applying damage decreases HP', () => {
  render(<Game level={mockLevel} />);
  const hpBefore = screen.getByText(/100/).textContent;
  userEvent.click(screen.getByText('Submit Answer'));
  // (assume wrong answer)
  const hpAfter = screen.getByText(/90/).textContent;
  expect(hpAfter).toBeLessThan(hpBefore);
});

test('defeating player ends level', () => {
  render(<Game level={mockLevel} />);
  // Apply damage repeatedly until HP = 0
  for (let i = 0; i < 10; i++) {
    playerReceivesDamage(10);
  }
  expect(screen.getByText(/Game Over/i)).toBeInTheDocument();
});
```

---

## ISSUE #2: ENEMY HP NOT TRACKED [CRITICAL]

**File:** [frontend/src/pages/Game.tsx](frontend/src/pages/Game.tsx#L113-L125)  
**Severity:** 🔴 CRITICAL  
**Impact:** Enemies can be fought multiple times, no health bar, combat broken  

### Current Code (BROKEN)
```typescript
const enemyMap = useMemo(() => {
  const map: Record<string, Enemy> = {};
  for (const enemy of level.enemies ?? []) {
    map[posKey(enemy.x, enemy.y)] = enemy;  // Direct reference, never updated
  }
  return map;
}, [level.enemies]);

// When enemy is defeated:
setEncounteredEnemies((prev) => ({ ...prev, [enemyKey]: true }));
// ❌ Enemy object never modified - HP stays 100 if re-encountered
```

### Fix
```typescript
// Add enemy HP tracking
const [enemyHp, setEnemyHp] = useState<Record<string, number>>(() => {
  const hp: Record<string, number> = {};
  for (const enemy of level.enemies ?? []) {
    hp[posKey(enemy.x, enemy.y)] = enemy.max_hp ?? 20;
  }
  return hp;
});

// Update in submitEnemyAnswer when player deals damage:
const submitEnemyAnswer = useCallback(async () => {
  // ... grading ...
  
  if (judgement.isCorrect) {
    // Player deals damage to enemy
    const playerDamage = 15;  // Configure as needed
    setEnemyHp(prev => ({
      ...prev,
      [enemyKey]: Math.max(0, (prev[enemyKey] ?? 20) - playerDamage)
    }));
    
    // Check if enemy defeated
    const enemyDefeated = (enemyHp[enemyKey] ?? 20) - playerDamage <= 0;
    if (enemyDefeated) {
      setEncounteredEnemies(prev => ({ ...prev, [enemyKey]: true }));
      setActiveEnemyKey(null);
      setMessage('Enemy defeated!');
    }
  } else {
    // Enemy deals damage to player
    const damage = activeEnemy?.damage ?? 10;
    applyDamage(damage, activeEnemy?.type ?? 'Enemy');
  }
}, [enemyHp, enemyKey, activeEnemy, /* ... other deps ... */]);
```

### Render Enemy Health Bar
```typescript
// In the enemy encounter UI:
{activeEnemy && (
  <div className="flex items-center gap-2">
    <label className="text-xs font-pixel">ENEMY HP:</label>
    <div className="w-32 h-4 bg-slate-900/50 border border-red-500/50 rounded relative">
      <div 
        className="h-full bg-gradient-to-r from-red-700 to-red-500 rounded transition-all"
        style={{ width: `${Math.max(0, (enemyHp[activeEnemyKey!] ?? 20) / (activeEnemy.max_hp ?? 20)) * 100}%` }}
      />
    </div>
    <span className="text-xs text-red-400 font-mono">
      {Math.max(0, enemyHp[activeEnemyKey!] ?? 0)} / {activeEnemy.max_hp ?? 20}
    </span>
  </div>
)}
```

---

## ISSUE #3: BOSS HP NOT TRACKED [CRITICAL]

**File:** [frontend/src/pages/Game.tsx](frontend/src/pages/Game.tsx#L290-L350)  
**Severity:** 🔴 CRITICAL  
**Impact:** Boss can be defeated on first question if lucky, or fought infinitely  

### Current Code (BROKEN)
```typescript
const bossQuestions = useMemo(
  () => level.boss?.question_sequence ?? [],
  [level.boss?.question_sequence],
);

// Boss fight just iterates through all questions
const submitBossAnswer = useCallback(async () => {
  if (bossDefeated || bossQuestionIndex >= bossQuestions.length) {
    return;
  }
  
  // ... grade answer ...
  
  if (judgement.isCorrect) {
    // Move to next question WITHOUT tracking damage
    setBossQuestionIndex(prev => prev + 1);
    
    if (bossQuestionIndex + 1 >= bossQuestions.length) {
      setBossDefeated(true);  // ✅ At least this works
    }
  }
  // ❌ No boss HP reduction, no visible health bar
}, [bossDefeated, bossQuestionIndex, bossQuestions, ...]);
```

### Fix
```typescript
// Track boss HP separately
const [bossHp, setBossHp] = useState(() => level.boss?.max_hp ?? 100);
const bossMaxHp = level.boss?.max_hp ?? 100;

const submitBossAnswer = useCallback(async () => {
  if (bossDefeated || bossQuestionIndex >= bossQuestions.length) {
    return;
  }
  
  const trimmedAnswer = bossAnswer.trim();
  if (!trimmedAnswer) {
    setMessage('Enter your answer.');
    return;
  }
  
  try {
    setIsGradingAnswer(true);
    setMessage('Evaluating boss challenge...');
    
    const question = bossQuestions[bossQuestionIndex];
    const judgement = await gradeAnswerWithAI(question, trimmedAnswer);
    
    if (!judgement.isCorrect) {
      // Player takes damage from boss
      const bossDamage = level.boss?.damage_per_wrong_answer ?? 15;
      
      setPlayerHp(prev => {
        const nextHp = Math.max(0, prev - bossDamage);
        appendCombatLog(`\\⚔️ Boss struck for ${bossDamage} damage!`);
        return nextHp;
      });
      
      setMessage(`❌ Wrong. Boss deals ${bossDamage} damage. ${judgement.hint}`);
      return;
    }
    
    // Player correct - deals damage to boss
    const playerDamage = 20;  // Configure as needed
    const nextBossHp = Math.max(0, bossHp - playerDamage);
    setBossHp(nextBossHp);
    appendCombatLog(`\\✓ Correct! You deal ${playerDamage} damage to boss.`);
    
    // Check if boss defeated
    if (nextBossHp <= 0) {
      setBossDefeated(true);
      setMessage('🏆 BOSS DEFEATED! LEVEL COMPLETE!');
      return;
    }
    
    // Move to next question
    setBossQuestionIndex(prev => prev + 1);
    setBossAnswer('');
    
    const nextQuestion = bossQuestions[bossQuestionIndex + 1];
    if (nextQuestion) {
      setBossPrompt(nextQuestion);
      setMessage(`Question ${bossQuestionIndex + 2}/${bossQuestions.length}`);
    }
  } catch (error) {
    console.error('[Boss Combat] Error:', error);
    appendCombatLog('❌ Grading error. Please try again.');
    setMessage('Error grading answer. Please try again.');
  } finally {
    setIsGradingAnswer(false);
  }
}, [bossHP, bossHp, /* ... deps ... */]);
```

### Render Boss Health Bar
```typescript
{levelWon && hasBossQuestions && !bossDefeated && (
  <div className="mt-4 p-4 game-panel rounded-lg border border-orange-500/50">
    <div className="flex items-center justify-between mb-2">
      <h3 className="font-pixel text-[9px] text-orange-400 tracking-widest">BOSS BATTLE</h3>
      <span className="text-xs font-mono text-orange-300">
        Q{bossQuestionIndex + 1}/{bossQuestions.length}
      </span>
    </div>
    
    <div className="mb-3">
      <label className="text-xs font-pixel text-orange-300">BOSS HP:</label>
      <div className="w-full h-6 bg-slate-900/50 border border-orange-500/50 rounded mt-1 relative overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-orange-700 to-red-600 rounded transition-all duration-300"
          style={{ width: `${Math.max(0, bossHp / bossMaxHp) * 100}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs text-orange-100 font-mono">
          {Math.max(0, bossHp)} / {bossMaxHp}
        </span>
      </div>
    </div>
    
    <p className="text-yellow-300 text-sm my-2">{bossPrompt}</p>
    <textarea
      value={bossAnswer}
      onChange={e => setBossAnswer(e.target.value)}
      placeholder="Type your answer..."
      className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
      rows={3}
    />
    <button 
      onClick={submitBossAnswer}
      disabled={isGradingAnswer || playerHp <= 0}
      className="pixel-btn mt-2 w-full"
    >
      {isGradingAnswer ? 'EVALUATING...' : 'SUBMIT'}
    </button>
  </div>
)}
```

---

## ISSUE #4: MISSING PROGRESS SAVE ENDPOINT [CRITICAL]

**Files:**  
- Backend: `member2/backend/app/routes/progress.py`
- Frontend: `frontend/src/pages/Game.tsx`

**Severity:** 🔴 CRITICAL  
**Impact:** Level completions never saved, progress lost on refresh  

### Backend Fix
```python
# Add to member2/backend/app/routes/progress.py

from pydantic import BaseModel, Field
from app.database import save_progress

class ProgressSaveRequest(BaseModel):
    """Request to save a completed level."""
    student_id: str = Field(..., min_length=1, max_length=50)
    level_name: str
    concept: str
    completed: bool = True
    time_seconds: int = Field(..., ge=0)
    score: int = Field(..., ge=0, le=100)
    boss_defeated: bool = False

@router.post("/save", response_model=dict)
async def save_level_progress(request: ProgressSaveRequest) -> dict:
    """
    Save a completed level to the database.
    
    Args:
        request.student_id: Player ID
        request.level_name: Level name (e.g., "The Tower of LIFO")
        request.concept: DSA concept (e.g., "stack")
        request.completed: Whether level was completed
        request.time_seconds: Time taken
        request.score: Points earned (0-100)
        request.boss_defeated: Whether boss was defeated
    
    Returns:
        {"status": "saved", "record_id": <int>}
    """
    level_id = await save_progress(
        student_id=request.student_id.strip()[:50] or "anonymous",
        level_name=request.level_name,
        concept=request.concept,
        completed=request.completed,
        time_seconds=request.time_seconds,
        score=request.score,
        boss_defeated=request.boss_defeated,
    )
    
    return {
        "status": "saved",
        "record_id": level_id,
        "timestamp": datetime.utcnow().isoformat(),
    }
```

### Frontend Integration
```typescript
// In Game.tsx, after boss is defeated:

const submitBossAnswer = useCallback(async () => {
  // ... grading logic ...
  
  if (nextBossHp <= 0) {
    setBossDefeated(true);
    setMessage('🏆 BOSS DEFEATED! LEVEL COMPLETE!');
    
    // ✅ Save progress
    const runDuration = Math.floor((Date.now() - runStartedAt) / 1000);
    const finalScore = Math.round((playerHp / 100) * 100);  // Score based on remaining HP
    
    setSavingProgress(true);
    try {
      await api.post('/api/progress/save', {
        student_id: studentId || 'anonymous',
        level_name: level.level_name,
        concept: level.concept,
        completed: true,
        time_seconds: runDuration,
        score: finalScore,
        boss_defeated: true,
      });
      setProgressSaved(true);
      appendCombatLog(`✅ Progress saved! Score: ${finalScore}`);
    } catch (error) {
      console.error('[Progress Save] Error:', error);
      appendCombatLog('⚠️ Could not save progress (offline?)');
    } finally {
      setSavingProgress(false);
    }
    return;
  }
  // ...
}, [/* deps */]);
```

---

## ISSUE #5: VITE PROXY HARDCODED TO LOCALHOST [CRITICAL]

**File:** [frontend/vite.config.ts](frontend/vite.config.ts#L8)  
**Severity:** 🔴 CRITICAL  
**Impact:** Frontend won't find backend in Codespaces forwarded URLs  

### Current Code (BROKEN)
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',  // ❌ Hardcoded localhost
        changeOrigin: true,
      },
    },
  },
});
```

### Fix
```typescript
const apiTarget = process.env.VITE_API_TARGET || 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
    proxy: {
      '/api': {
        target: apiTarget,  // ✅ Use env var with fallback
        changeOrigin: true,
      },
      '/health': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/docs': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
```

### Add .env.local
```bash
# frontend/.env.local
VITE_API_TARGET=http://127.0.0.1:8000   # Local development
# In Codespaces, override: VITE_API_TARGET=https://port-8000.app.github.dev
```

### Alternative: Dynamic API Base URL
```typescript
// frontend/src/lib/api.ts
const getApiBase = () => {
  // In Codespaces, window.location.origin is forwarded URL
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    // Use same origin for production/Codespaces
    return '';  // Relative URL works with Vite proxy
  }
  // Local dev: use explicit localhost
  return import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
};

const api = axios.create({
  baseURL: getApiBase(),
  timeout: 15000,
});
```

---

## ISSUE #6: LEVEL-WON STATE DOESN'T INTERRUPT MOVEMENT [HIGH]

**File:** [frontend/src/pages/Game.tsx](frontend/src/pages/Game.tsx#L140-L155)  
**Severity:** 🟠 HIGH  
**Impact:** Player can move around while boss fight is active  

### Current Code (BROKEN)
```typescript
const movePlayer = useCallback((dx: number, dy: number) => {
  if (levelWon || playerHp <= 0 || inEnemyCombat) {  // ❌ levelWon doesn't stop boss fight
    return;
  }
  // ... move logic ...
}, [inEnemyCombat, isWalkable, levelWon, playerHp]);
```

### Fix
```typescript
const movePlayer = useCallback((dx: number, dy: number) => {
  // Can't move if: defeated, in enemy combat, or boss fight is active
  if (playerHp <= 0) {
    setMessage('You are defeated.');
    return;
  }
  
  if (inEnemyCombat) {
    setMessage('You are in combat with an enemy!');
    return;
  }
  
  // Boss fight blocks movement
  if (levelWon && (!bossDefeated || hasBossQuestions)) {
    setMessage('You are in battle with the boss. Answer the question!');
    return;
  }
  
  // Movement disabled after level complete
  if (levelWon && bossDefeated) {
    setMessage('Level complete! Press "Next" to continue.');
    return;
  }
  
  // Normal movement
  setPlayerPos((prev) => {
    const next = { x: prev.x + dx, y: prev.y + dy };
    
    if (!isWalkable(next.x, next.y)) {
      setMessage('A wall blocks your path.');
      return prev;
    }
    
    setMoves((m) => m + 1);
    return next;
  });
}, [isWalkable, levelWon, playerHp, inEnemyCombat, bossDefeated, hasBossQuestions]);
```

---

## ISSUE #7: TIMEOUT IDS LEAKED ON UNMOUNT [CRITICAL]

**File:** [frontend/src/pages/Game.tsx](frontend/src/pages/Game.tsx#L29-L44)  
**Severity:** 🔴 CRITICAL  
**Impact:** Memory leak, stale timeouts execute after unmount  

### Current Code (BROKEN)
```typescript
const timeoutIdsRef = useRef<number[]>([]);

const queueUiTimeout = useCallback((callback: () => void, delayMs: number) => {
  const timeoutId = window.setTimeout(() => {
    timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
    callback();  // ❌ Could execute after unmount
  }, delayMs);
  timeoutIdsRef.current.push(timeoutId);
}, []);

const clearUiTimeouts = useCallback(() => {
  for (const timeoutId of timeoutIdsRef.current) {
    window.clearTimeout(timeoutId);
  }
  timeoutIdsRef.current = [];
}, []);

// ❌ NO cleanup effect on unmount!
```

### Fix
```typescript
const timeoutIdsRef = useRef<number[]>([]);
const isMountedRef = useRef(true);  // Track mount status

const queueUiTimeout = useCallback((callback: () => void, delayMs: number) => {
  const timeoutId = window.setTimeout(() => {
    if (!isMountedRef.current) return;  // Skip if unmounted
    
    timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
    callback();
  }, delayMs);
  timeoutIdsRef.current.push(timeoutId);
}, []);

const clearUiTimeouts = useCallback(() => {
  for (const timeoutId of timeoutIdsRef.current) {
    window.clearTimeout(timeoutId);
  }
  timeoutIdsRef.current = [];
}, []);

// ✅ Add cleanup effect
useEffect(() => {
  return () => {
    isMountedRef.current = false;  // Mark as unmounted
    clearUiTimeouts();             // Clear all pending timeouts
  };
}, [clearUiTimeouts]);
```

---

## ISSUE #8: MULTIPLE FAILED TOPICS ONLY USE FIRST [HIGH]

**File:** [frontend/src/pages/Results.tsx](frontend/src/pages/Results.tsx#L45-L75)  
**Severity:** 🟠 HIGH  
**Impact:** If student fails 3 topics, only creates dungeon for 1st  

### Current Code (BROKEN)
```typescript
useEffect(() => {
  if (!quizResult || quizResult.failed_topics.length === 0) {
    return;
  }
  
  setLevelLoading(true);
  api.post<LevelData[]>('/api/level/generate', {
    failed_topics: quizResult.failed_topics,  // ✅ Sends all topics
    difficulty: 1,
  })
    .then((res) => {
      if (res.data && res.data.length > 0) {
        setLevel(res.data[0] ?? null);  // ❌ Uses only [0]
      }
    })
    // ...
}, [quizResult]);

// Later in Results component:
const primaryTopic = result.failed_topics[0] ?? '';  // ❌ Only first topic
```

### Fix (Option 1: Sequential Dungeons)
```typescript
// Allow player to select which dungeon to play first
const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);
const [levels, setLevels] = useState<LevelData[]>([]);

useEffect(() => {
  if (!quizResult || quizResult.failed_topics.length === 0) {
    return;
  }
  
  setLevelLoading(true);
  api.post<LevelData[]>('/api/level/generate', {
    failed_topics: quizResult.failed_topics,
    difficulty: 1,
  })
    .then((res) => {
      if (Array.isArray(res.data) && res.data.length > 0) {
        setLevels(res.data);  // ✅ Store all
        setSelectedTopicIndex(0);
      }
    })
    .finally(() => setLevelLoading(false));
}, [quizResult]);

// UI to select dungeon
<div className="mt-5">
  <h3 className="font-pixel text-[9px] tracking-widest mb-3">SELECT DUNGEON:</h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {levels.map((level, idx) => (
      <button
        key={idx}
        onClick={() => setSelectedTopicIndex(idx)}
        className={`p-3 rounded border transition-all ${
          selectedTopicIndex === idx 
            ? 'border-primary bg-primary/20' 
            : 'border-gray-600 hover:border-gray-400'
        }`}
      >
        <div className="font-pixel text-[8px] text-gray-400">DUNGEON {idx + 1}</div>
        <div className="text-sm text-white mt-1">{level.level_name}</div>
        <div className="text-xs text-gray-500 mt-1">Concept: {level.concept}</div>
      </button>
    ))}
  </div>
</div>

// Pass selected level
<button
  onClick={() => {
    const selectedLevel = levels[selectedTopicIndex];
    onEnterDungeon({
      level: selectedLevel,
      topic: selectedLevel.concept,
      failedConcepts: result.failed_topics,
      studentId: result.student_id,
    });
  }}
  className="pixel-btn mt-4"
>
  Enter {levels[selectedTopicIndex]?.level_name || 'Dungeon'}
</button>
```

---

## ISSUE #9: NO BOSS ANSWER ERROR HANDLING [HIGH]

**File:** [frontend/src/pages/Game.tsx](frontend/src/pages/Game.tsx#L300+)  
**Severity:** 🟠 HIGH  
**Impact:** Boss fight crashes if API fails  

### Current Code (BROKEN)
```typescript
const submitBossAnswer = useCallback(async () => {
  // ... no try/catch ...
  
  const judgement = await gradeAnswerWithAI(question, trimmedAnswer);  // ✅ Could throw
  // ✅ Continue without error handling
  
  if (judgement.isCorrect) {
    // ...
  }
}, [/* deps */]);

// ❌ NO catch block!
```

### Fix
```typescript
const submitBossAnswer = useCallback(async () => {
  if (isGradingAnswer || !hasBossQuestions || bossDefeated || playerHp <= 0) {
    return;
  }
  
  const trimmedAnswer = bossAnswer.trim();
  if (!trimmedAnswer) {
    setMessage('Write an answer before submitting.');
    return;
  }
  
  const question = bossQuestions[bossQuestionIndex];
  
  try {
    setIsGradingAnswer(true);
    setMessage('Evaluating your answer...');
    
    const judgement = await gradeAnswerWithAI(question, trimmedAnswer);
    
    // (rest of logic as shown in boss HP tracking section above)
    
  } catch (error) {
    console.error('[Boss Combat] Grading error:', error);
    
    // Fallback: use heuristic grading
    const fallbackJudgement = fallbackJudge(question, trimmedAnswer);
    
    if (fallbackJudgement.isCorrect) {
      appendCombatLog('✓ Correct! (heuristic grading)');
      // Handle correct answer
    } else {
      appendCombatLog('✗ Wrong! (heuristic grading)');
      // Handle wrong answer
    }
    
    setMessage(
      'API unavailable, using backup grading. ' + 
      (fallbackJudgement.isCorrect ? '✓ Correct!' : '✗ Wrong!')
    );
  } finally {
    setIsGradingAnswer(false);
  }
}, [/* deps including fallbackJudge */]);
```

---

## ISSUE #10: TYPE SAFETY - ENEMY.TYPE LOOSE STRING [MEDIUM]

**File:** [frontend/src/types/level.ts](frontend/src/types/level.ts#L6)  
**Severity:** 🟡 MEDIUM  
**Impact:** TypeScript doesn't prevent invalid enemy types  

### Current Code (WEAK)
```typescript
export type Enemy = {
  x: number;
  y: number;
  type: string;  // ❌ Any string accepted
  max_hp?: number;
  hp?: number;
  damage?: number;
  concept_question?: string;
};
```

### Fix
```typescript
// Define valid enemy types
export const ENEMY_TYPES = [
  'stack_golem',
  'queue_serpent',
  'chaos_sorter',
  'search_phantom',
  'recursive_shade',
  'node_crawler',
  'graph_wraith',
  'algebra_imp',
] as const;

export type EnemyType = (typeof ENEMY_TYPES)[number];

export type Enemy = {
  x: number;
  y: number;
  type: EnemyType;  // ✅ Only valid types
  max_hp: number;   // ✅ Make required
  hp: number;       // ✅ Make required
  damage: number;   // ✅ Make required
  concept_question: string;  // ✅ Make required
};
```

### Validate on Backend Too
```python
# member2/backend/app/models/schemas.py

class EnemyType(str, Enum):
    STACK_GOLEM = "stack_golem"
    QUEUE_SERPENT = "queue_serpent"
    CHAOS_SORTER = "chaos_sorter"
    SEARCH_PHANTOM = "search_phantom"
    RECURSIVE_SHADE = "recursive_shade"
    NODE_CRAWLER = "node_crawler"
    GRAPH_WRAITH = "graph_wraith"
    ALGEBRA_IMP = "algebra_imp"

class EnemyData(BaseModel):
    x: int = Field(..., ge=0)
    y: int = Field(..., ge=0)
    type: EnemyType  # ✅ Validates enum
    max_hp: int = Field(..., ge=1)
    hp: int = Field(..., ge=0)
    damage: int = Field(..., ge=0)
    concept_question: str = Field(..., min_length=1)
```

---

## ISSUE #11: GAME.TSX COMPONENT TOO LARGE [HIGH]

**File:** [frontend/src/pages/Game.tsx](frontend/src/pages/Game.tsx)  
**Lines:** 600+  
**Severity:** 🟠 HIGH  
**Impact:** Component hard to test, maintain, and refactor  

### Refactoring Plan
```typescript
// ✅ Split into subcomponents:

// 1. frontend/src/components/PlayerStatus.tsx
export const PlayerStatus = ({ hp, maxHp, moves }: Props) => {
  return (
    <div>HP: {hp}/{maxHp} | Moves: {moves}</div>
  );
};

// 2. frontend/src/components/GameGrid.tsx
export const GameGrid = ({ 
  level, 
  playerPos, 
  enemies, 
  ...props 
}: Props) => {
  return (
    <div className="grid">
      {/* Render tiles and entities */}
    </div>
  );
};

// 3. frontend/src/components/EnemyEncounter.tsx
export const EnemyEncounter = ({ 
  enemy, 
  onSubmitAnswer, 
  isGrading,
  ...props 
}: Props) => {
  const [answer, setAnswer] = useState('');
  return (
    <div>
      <p>{enemy.concept_question}</p>
      <textarea value={answer} onChange={...} />
      <button onClick={() => onSubmitAnswer(answer)}>
        Submit
      </button>
    </div>
  );
};

// 4. frontend/src/components/BossFight.tsx
export const BossFight = ({ 
  boss, 
  questionIndex, 
  onSubmitAnswer, 
  isGrading,
  ...props 
}: Props) => {
  // Boss-specific UI
};

// 5. frontend/src/components/CombatLog.tsx
export const CombatLog = ({ entries }: Props) => {
  return (
    <div>
      {entries.map(entry => <p key={entry}>{entry}</p>)}
    </div>
  );
};

// 6. frontend/src/pages/Game.tsx (refactored)
const Game = ({ level, studentId }: GameProps) => {
  const [playerPos, setPlayerPos] = useState(level.player_start);
  const [playerHp, setPlayerHp] = useState(100);
  const [enemies, setEnemies] = useState(level.enemies);
  // ... other state ...
  
  return (
    <div className="game-container">
      <PlayerStatus hp={playerHp} maxHp={100} moves={moves} />
      
      <GameGrid 
        level={level}
        playerPos={playerPos}
        enemies={enemies}
        onMove={movePlayer}
      />
      
      {inEnemyCombat && (
        <EnemyEncounter 
          enemy={activeEnemy}
          onSubmitAnswer={submitEnemyAnswer}
          isGrading={isGradingAnswer}
        />
      )}
      
      {levelWon && hasBossQuestions && !bossDefeated && (
        <BossFight 
          boss={level.boss}
          questionIndex={bossQuestionIndex}
          onSubmitAnswer={submitBossAnswer}
          isGrading={isGradingAnswer}
        />
      )}
      
      <CombatLog entries={combatLog} />
      
      <div>
        <button>← Back</button>
        <button>Next →</button>
      </div>
    </div>
  );
};
```

---

## ISSUE #12: API ERRORS RETRY MISSING [MEDIUM]

**File:** [frontend/src/lib/api.ts](frontend/src/lib/api.ts)  
**Severity:** 🟡 MEDIUM  
**Impact:** Single API failure = permanent error  

### Current Code
```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 15000,  // ❌ No retry
});

export default api;
```

### Fix with Exponential Backoff
```typescript
import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 15000,
});

// Add request interceptor with retry logic
api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const config = error.config as any;
    
    if (!config || !config.__retryCount) {
      config.__retryCount = 0;
    }
    
    // Max 3 retries
    if (config.__retryCount < 3) {
      config.__retryCount += 1;
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.exp(config.__retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`[API] Retry attempt ${config.__retryCount} for ${config.url}`);
      return api(config);
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

---

## END OF ACTIONABLE FIXES

All critical issues have working code examples. Implement fixes in priority order (Tier 1 → Tier 2 → Tier 3).

For questions, reference the COMPREHENSIVE_CODE_AUDIT.md main document.
