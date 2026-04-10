# WASM-RPG: IMPROVED UI/UX Design Specifications
**For: Frontend Developer (Member 1)**

This document outlines the design system, UI architecture, DSA concept integration, and provides detailed implementation guidance for building the WASM-RPG React frontend.

---

## 🎨 1. Enhanced Design System & Tokens

### **Color Palette (Tailwind configured in frontend/tailwind.config.js)**
- **Background (`bg-background`):** Deep Navy `#0a0e1a`
- **Primary (`text-primary`, `bg-primary`):** Electric Purple `#7c3aed` (Primary actions, CTA buttons)
- **Secondary (`text-secondary`):** Cyan `#06b6d4` (Highlights, neutral info)
- **Accent (`text-accent`):** Gold `#f59e0b` (Awards, scores, player highlights)
- **Danger (`text-danger`):** Red `#ef4444` (Fail states, enemy attacks)
- **Success (`text-success`):** Green `#22c55e` (Pass states, cleared levels)
- **Glass Panel Base (`bg-panel`):** `rgba(30, 41, 59, 0.7)`
- **CONCEPT-SPECIFIC COLOR MAPPING** ✨ NEW:
  - **Stack:** Deep Purple `#6d28d9` (LIFO tower aesthetic)
  - **Queue:** Teal `#0d9488` (flowing/sequential)
  - **Sorting:** Orange `#ea580c` (chaotic → organized)
  - **Binary Search:** Blue `#0369a1` (bifurcation/splitting)
  - **Recursion:** Indigo `#4338ca` (infinite/layered)
  - **Linked List:** Sky `#0ea5e9` (chain-like)
  - **Graph Traversal:** Pink `#ec4899` (interconnected)
  - **Math/Algebra:** Lime `#a3e635` (calculation)

### **Typography**
- **Modern Readability (`font-sans`):** `Inter` (Standard text, instructions, quiz questions).
- **RPG Elements (`font-pixel`):** `"Press Start 2P"` (Headers, CTA text, game overlays, stats).
- **Code/Monospace (`font-mono`):** `Fira Code` (Algorithm snippets, pseudocode during boss fights).

### **Core UI Patterns**
1. **Glass Panels:** Use `.glass-panel` utility class for all cards, containers, and dialogs.
2. **Buttons:**
   - Primary Calls to Action: `.btn-primary` (Purple with outer glow effect)
   - Secondary Actions: `.btn-secondary` (Outline with inner glow)
   - **NEW:** Topic-specific buttons that inherit concept colors dynamically
3. **Background Layout:** An ambient animated background using dual radial gradients (pre-configured in `src/index.css`) applies to ALL screens except when the game canvas takes full screen.
4. **Badge System:** Tags for difficulty levels and topic indicators with concept-specific coloring

---

## 🧠 2. DSA Concept Integration (Direct from Backend)

Each failed quiz topic creates a unique dungeon with themed enemies and boss mechanics:

### **8 Concept-Based Dungeons**

| Topic | Dungeon Name | Enemy Type | Boss Type | Boss Mechanic | Aesthetic Theme |
|-------|---|---|---|---|---|
| **Stack** | The Tower of LIFO | stack_golem | stack_overlord | Push/Pop sequence | Vertical tower, stacked tiles |
| **Queue** | The Queue Caverns | queue_serpent | queue_warden | Enqueue/Dequeue flow | Flowing corridors, FIFO rhythm |
| **Sorting** | The Unsorted Abyss | chaos_sorter | sort_master | Array sorting visual | Chaotic → Organized transition |
| **Binary Search** | The Bifurcation Maze | search_phantom | binary_sentinel | Tree-like pathfinding | Branching paths, binary choices |
| **Recursion** | The Infinite Descent | recursive_shade | recursion_hydra | Base case escaping | Nested rooms, fractal patterns |
| **Linked List** | The Chain Dungeon | node_crawler | list_leviathan | Sequential traversal | Connected nodes, chain pattern |
| **Graph Traversal** | The Interconnected Labyrinth | graph_wraith | graph_colossus | BFS/DFS pathfinding | Complex web of paths |
| **Math/Algebra** | The Equation Fortress | algebra_imp | equation_titan | Solve equations in combat | Formulaic structures |

### **Difficulty Scaling (Applied at Level Generation)**

| Difficulty | Enemy HP | Enemy Damage | Boss HP | Boss Damage | Num Enemies | Concept |
|---|---|---|---|---|---|------|
| **Easy** | 20 | 5 | 60 | 10 | 2 | Quiz score < 40% |
| **Medium** | 35 | 10 | 100 | 20 | 3 | Quiz score 40-70% |
| **Hard** | 50 | 15 | 150 | 30 | 5 | Quiz score > 70% |

---

## 📊 3. Student Performance → Gameplay Flow

### **Quiz Submission Flow**
```
1. Student completes quiz (24 questions across 8 topics)
   ↓
2. Backend scores: PASS_THRESHOLD = 0.5 (>50% correct per topic)
   ↓
3. Topics with score < 50% are marked as FAILED
   ↓
4. Failed topics determine which dungeons are generated
   ↓
5. Difficulty is based on overall quiz performance:
   - Score < 40% → Easy dungeons
   - Score 40-70% → Medium dungeons
   - Score > 70% → Hard dungeons
   ↓
6. Each dungeon tailored to reinforce weak concept
```

### **Example Scenarios**

**Scenario A: Mixed Performance**
- Quiz Score: 65%
- Failed Topics: Stack (30%), Sorting (45%)
- Generated Dungeons:
  - "The Tower of LIFO" (difficulty=Medium, 3 enemies with stack_golem type)
  - "The Unsorted Abyss" (difficulty=Medium, 3 chaos_sorters)
- Boss Questions: Concept-specific (Push/Pop sequences for Stack, Sort algorithms for Sorting)

**Scenario B: Struggling**
- Quiz Score: 35%
- Failed Topics: Stack, Queue, Sorting, Binary Search
- Generated Dungeons: 4 dungeons with Easy difficulty
- Boss HP: 60 per boss
- Pedagogical Value: Repeated reinforcement with manageable challenge

---

## 🖼️ 4. Enhanced Core Screens & UI Components

### **1. Landing Page (`/` route)**
```tsx
// NEW FEATURES:
// - Animated concept icons cycling through dungeon themes
// - Motivational text that changes based on time of day
// - Hidden easter eggs for players who hover over logo
```

### **2. Diagnostic Quiz (`/quiz` route) - ENHANCED**
```
Components needed:
- QuestionCard.tsx: Render current question + options
- ProgressBar.tsx: Visual progress (X/24 questions)
- TopicBadge.tsx: Show which topic this question belongs to (with concept color)
- AnswerOption.tsx: ARIA-accessible, keyboard navigation support
- TimerDisplay.tsx: Optional countdown per question (suggested)

Logic:
- Show concept color badge on each question title
- Track score per topic in real-time (optional "mini progress")
- Immediate visual feedback on selection (glow effect)
```

### **3. Quest Results (`/results` route) - ENHANCED**
```
NEW FEATURES:
- Central score ring (SVG donut chart)
- Per-topic breakdown grid:
  | Topic | Score | Status | Dungeon Generated |
  |-------|-------|--------|------------------|
  | Stack | 3/4 (75%) | PASS ✓ | - |
  | Queue | 1/3 (33%) | FAIL ✗ | The Queue Caverns (Medium) |
  | Sorting | 0/3 (0%) | FAIL ✗ | The Unsorted Abyss (Easy) |

- Bottom CTA: "Enter Your Dungeons" (routes to /game with generated levels)
- Difficulty badge showing overall quiz performance
```

### **4. Game HUD & Overlay (`/game` route) - ENHANCED**
```
NEW OVERLAY COMPONENTS:
- TopBar.tsx: Player HP, Current Level Name, Concept Tag (color-coded)
- BottomPanel.tsx: Only visible during boss fights
  - Boss Name & Type (e.g., "Stack Overlord")
  - Boss HP bar
  - Concept Question Display (monospace code-style font)
  - Answer buttons (A/B/C/D) for boss encounters

- MiniMap.tsx: Optional small tilemap preview of dungeon layout
- FloatingNotification.tsx: Damage/heal feedback, milestone announcements

WASM Bridge Requirements:
- Expose: on_boss_encounter(boss_json) → trigger bottom panel
- Expose: submit_boss_answer(question_index, answer_letter) → send answer
- Expose: is_boss_defeated() → check if boss is dead
```

### **5. Adventure Log (`/progress` route) - ENHANCED**
```
NEW FEATURES:
- Stats Header: Total Levels Completed | Bosses Defeated | Total Points
- Completed Dungeons Timeline:
  [Timestamp] THE TOWER OF LIFO (Stack)
  ├─ Difficulty: Medium ●●○
  ├─ Time: 4m 23s
  ├─ Boss Defeated: ✓
  └─ Score: 850 points

- Concept Mastery Meter: Visual progress for each DSA topic (8 bars)
- Unlocked Achievements (bonus feature)
```

---

## 🔌 5. WASM Bridge Updates (JS → C++ Communication)

### **Current Exported Functions (Member 3 Must Implement)**

```typescript
// In window.Module:

// Existing (working):
load_level(jsonString: string) -> void
get_player_pos() -> string
is_level_won() -> number (0 or 1)

// NEW REQUIRED:
get_current_boss() -> string  // Returns boss JSON
submit_boss_answer(question_index: number, answer: string) -> number  // Returns damage dealt
get_enemy_list() -> string    // Returns all enemies on current tile
player_take_damage(amount: number) -> void
get_player_hp() -> number
```

### **Lifecycle Example: Boss Fight Sequence**

```javascript
// 1. Frontend detects player reached boss tile (via get_current_boss)
const bossData = JSON.parse(Module.ccall('get_current_boss', 'string', [], []));
// Shows boss panel with first question

// 2. Player answers in UI
const result = Module.ccall('submit_boss_answer', 'number', ['number', 'string'], [0, 'a']);
// Returns: -25 (player took 25 damage) or +50 (dealt 50 damage to boss)

// 3. Update UI with damage feedback
// Repeat for each question in boss.question_sequence

// 4. When boss is defeated:
const defeated = Module.ccall('is_boss_defeated', 'number', [], []);
if (defeated) {
  showVictoryScreen();
}
```

---

## 🚀 6. Implementation Checklist for Member 1

### **Phase 1: Foundation (Days 1-2)**
- [ ] Setup Tailwind with concept color tokens
- [ ] Create core layout components: NavBar, Background, Glass Panel utilities
- [ ] Implement Landing page with animated hero
- [ ] Setup React Router with all 5 route stubs

### **Phase 2: Quiz System (Days 2-3)**
- [ ] Build QuestionCard + AnswerOption components
- [ ] Implement Quiz state machine (track score per topic)
- [ ] Connect axios to `/api/quiz/submit` endpoint
- [ ] Build Results screen with score ring + dungeon generation preview

### **Phase 3: Game Integration (Days 3-4)**
- [ ] Load WASM module in GameCanvas component
- [ ] Create Game HUD overlay (TopBar + BottomPanel components)
- [ ] Implement boss encounter UI (question display + answer buttons)
- [ ] CRITICAL: Test WASM bridge functions (load_level, ccall)

### **Phase 4: Polish (Days 4-5)**
- [ ] Progress page with timeline
- [ ] Concept color theming throughout
- [ ] Keyboard accessibility (arrow keys, Tab navigation)
- [ ] Mobile responsiveness (if ambitious)

---

## 📋 7. Gotchas & Best Practices

1. **WASM Module Loading Timing:**
   - ALWAYS check `Module.onRuntimeInitialized` before calling ccall
   - Never call WASM functions during SSR (if using)

2. **Canvas Integration:**
   - Game canvas should take FULL screen in `/game` route
   - HUD overlay must be `position: absolute` and z-indexed above canvas

3. **State Management:**
   - Use Context API or Zustand for quiz state (avoid prop drilling)
   - Separate "quiz results" state from "game level" state

4. **Performance:**
   - Lazy-load the WASM module only when entering `/game` route
   - Memoize Quiz question rendering to avoid re-renders

5. **Accessibility:**
   - All buttons must be keyboard accessible
   - Quiz options should support arrow key selection
   - Screen reader support for results page

---

## 🔗 References

- **Backend API Docs:** `http://localhost:8000/docs` (FastAPI auto-generated)
- **Level Schema:** `member2/shared/level_schema.json`
- **Quiz Questions:** `member2/backend/app/data/questions.py`
- **Engine Bridge:** Test with `engine/wasm-smoke-test.html`

