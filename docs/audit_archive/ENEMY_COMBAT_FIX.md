# Enemy Encounter Combat System Fix

## THE BUG (One location - Game.tsx lines 113-119)

```typescript
// CURRENT: Enemies instantly die on contact
if (enemyMap[key] && !encounteredEnemies[key]) {
  const damage = enemyMap[key].damage ?? 10;
  setEncounteredEnemies((prev) => ({ ...prev, [key]: true }));
  setPlayerHp((hp) => Math.max(0, hp - damage));
  setMessage(`Enemy encounter: ${enemyMap[key].type}. You took ${damage} damage.`);
  // ✗ concept_question is NEVER USED
  // ✗ No quiz modal appears
  // ✗ Combat system is missing
}
```

---

## THE FIX: Add Combat State Management

### Step 1: Add State Variables (at top of Game component)

```typescript
// Current state declarations (lines 22-36):
const [encounteredEnemies, setEncounteredEnemies] = useState<Record<string, boolean>>({});
const [bossPrompt, setBossPrompt] = useState('');
const [bossQuestionIndex, setBossQuestionIndex] = useState(0);
const [bossAnswer, setBossAnswer] = useState('');
const [bossDefeated, setBossDefeated] = useState(false);

// ADD THIS FOR REGULAR ENEMIES:
const [currentEnemy, setCurrentEnemy] = useState<Enemy | null>(null);
const [inCombat, setInCombat] = useState(false);
const [enemyAnswer, setEnemyAnswer] = useState('');
```

### Step 2: Add Enemy Combat Handler

```typescript
const submitEnemyAnswer = useCallback(() => {
  if (!currentEnemy || !inCombat) {
    return;
  }

  // For this game: assume any answer defeats the enemy
  // In production: validate answer with backend
  
  setEncounteredEnemies((prev) => {
    const key = posKey(currentEnemy.x, currentEnemy.y);
    return { ...prev, [key]: true };
  });

  setMessage(`Correct! ${currentEnemy.type} defeated. Concept: ${currentEnemy.concept_question}`);
  setCurrentEnemy(null);
  setInCombat(false);
  setEnemyAnswer('');
}, [currentEnemy, inCombat]);
```

### Step 3: Replace the Enemy Encounter Logic (lines 113-119)

**OLD (BROKEN - 7 lines):**
```typescript
if (enemyMap[key] && !encounteredEnemies[key]) {
  const damage = enemyMap[key].damage ?? 10;
  setEncounteredEnemies((prev) => ({ ...prev, [key]: true }));
  setPlayerHp((hp) => Math.max(0, hp - damage));
  setMessage(`Enemy encounter: ${enemyMap[key].type}. You took ${damage} damage.`);
}
```

**NEW (FIXED - Shows Quiz Instead):**
```typescript
if (enemyMap[key] && !encounteredEnemies[key] && !inCombat) {
  const enemy = enemyMap[key];
  setCurrentEnemy(enemy);
  setInCombat(true);
  setEnemyAnswer('');
  setMessage(`Enemy encounter! ${enemy.type} appears: "${enemy.concept_question}"`);
}
```

### Step 4: Add Enemy Combat Modal to UI

**Add this JSX after the existing boss modal (around line 350+):**

```typescript
{/* Enemy Combat Modal */}
{inCombat && currentEnemy && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-slate-900 border-2 border-gray-600 p-6 rounded-lg max-w-2xl w-full mx-4">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">
        ⚔️ {currentEnemy.type} Combat ⚔️
      </h2>
      
      <div className="bg-slate-800 p-4 rounded mb-4 border border-gray-500">
        <p className="text-cyan-300 font-semibold mb-2">📙 Challenge Question:</p>
        <p className="text-gray-100 text-lg">{currentEnemy.concept_question}</p>
      </div>

      <textarea
        value={enemyAnswer}
        onChange={(e) => setEnemyAnswer(e.target.value)}
        placeholder="Type your answer here..."
        className="w-full p-3 bg-slate-800 text-gray-100 border border-gray-600 rounded mb-4 focus:border-cyan-500"
        rows={3}
      />

      <div className="flex gap-3">
        <button
          onClick={submitEnemyAnswer}
          disabled={!enemyAnswer.trim()}
          className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-2 rounded transition"
        >
          Submit Battle {enemyMap && Object.keys(enemyMap).includes(posKey(currentEnemy.x, currentEnemy.y)) ? '🗡️' : '✓'}
        </button>
        <button
          onClick={() => {
            setInCombat(false);
            setCurrentEnemy(null);
            setEnemyAnswer('');
            setMessage('Combat cancelled.');
          }}
          className="px-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded transition"
        >
          Flee
        </button>
      </div>
    </div>
  </div>
)}
```

### Step 5: Update Reset Logic (useEffect at lines 65-77)

Add to the reset useEffect:
```typescript
setCurrentEnemy(null);
setInCombat(false);
setEnemyAnswer('');
```

---

## VALIDATION CHECKLIST

After applying this fix:
- [ ] Player steps on enemy → Combat modal appears
- [ ] Modal shows enemy type in header
- [ ] Modal shows `concept_question` text
- [ ] Text input field for player answer
- [ ] Submit button to submit answer
- [ ] Answer can be any text (for demo)
- [ ] After submit → enemy removed from map
- [ ] Message shows "Enemy defeated"
- [ ] Player can move again
- [ ] HP damage system is optional (remove if not needed)

---

## OPTIONAL: Add HP System

If you want enemies to not take damage but instead require correct answers:

Replace this on line 194-197:
```typescript
// OLD: Always enemy dies on touch
setEncounteredEnemies((prev) => {
  const key = posKey(currentEnemy.x, currentEnemy.y);
  return { ...prev, [key]: true };
});
```

With this:
```typescript
// NEW: Check if answer is "correct"
// For demo, ANY answer is correct (update for real validation)
const key = posKey(currentEnemy.x, currentEnemy.y);

// In production, validate answer here:
// const isCorrect = await validateAnswer(currentEnemy.concept_question, enemyAnswer);
// For now, assume correct:
const isCorrect = true;

if (isCorrect) {
  setEncounteredEnemies((prev) => ({ ...prev, [key]: true }));
  setMessage(`Correct! ${currentEnemy.type} defeated!`);
} else {
  setPlayerHp((hp) => Math.max(0, hp - currentEnemy.damage));
  setMessage(`Wrong! ${currentEnemy.type} attacks! You took ${currentEnemy.damage} damage.`);
}
```

---

## BEFORE vs AFTER

### BEFORE (Current - Broken)
```
Step on enemy tile
  ├─ Instant damage (-10 HP)
  ├─ "Enemy encounter: push_sentinel. You took 10 damage."
  ├─ Enemy disappears
  └─ No quiz, no interaction, no learning
```

### AFTER (Fixed - Working)
```
Step on enemy tile
  ├─ Combat modal appears
  ├─ Shows: "push_sentinel Combat"
  ├─ Shows: "What does LIFO mean?"
  ├─ Text input for player answer
  ├─ Player types answer
  ├─ Submit button
  ├─ Answer validated (any answer works for demo)
  ├─ Enemy defeated
  └─ Player learns concept name
```

---

## FILES TO CHANGE

1. **frontend/src/pages/Game.tsx** - Main fix location
   - Add state for `currentEnemy`, `inCombat`, `enemyAnswer`
   - Add `submitEnemyAnswer` handler
   - Replace lines 113-119 with new combat logic
   - Add enemy combat modal JSX
   - Update reset logic

---

## SUMMARY

The enemy system IS designed correctly:
- ✓ Enemy struct has concept_question
- ✓ Backend sends full enemy data
- ✓ Level data includes questions

The frontend implementation is just **incomplete**:
- ✗ No quiz display on enemy encounter
- ✗ No text input for answer submission  
- ✗ No modal for combat

This fix adds the missing UI and state management to make enemies into meaningful learning encounters instead of instant-death scenery.
