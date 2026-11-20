# 🚀 QUICK START: End-to-End Testing Guide

**Goal:** Test the complete Quiz → Results → WASM Game flow in 10 minutes

---

## 📋 Prerequisites Check

Run this to verify everything is set up:

```bash
# Check backend
curl -s http://localhost:8000/health || echo "❌ Backend not running"

# Check Node/npm
node --version && npm --version || echo "❌ Node not installed"

# Check WASM artifacts
ls -la frontend/public/wasm/game.* | wc -l
# Should show 2 files (game.js + game.wasm)
```

---

## ⚙️ Step 1: Start Backend (if not already running)

```bash
# Terminal 1
cd member2/backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Expected Output:**
```
Uvicorn running on http://127.0.0.1:8000
```

**Verify it's alive:**
```bash
curl http://localhost:8000/health
# Response: {"status": "healthy"}
```

---

## 🎮 Step 2: Start Frontend Development Server

```bash
# Terminal 2
cd frontend
npm run dev
```

**Expected Output:**
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

---

## ✅ Step 3: Test the Flow (5-Minute Walkthrough)

### **3a. Open Frontend in Browser**

```bash
# Or just click: http://localhost:5173
open http://localhost:5173
```

You should see a blank page (it's just a Landing component with placeholder text).

---

### **3b. Navigate to Quiz**

Click: **"Start Quiz"** button (or manually go to `http://localhost:5173/quiz`)

**Expected:**
- Page loads with title "Quiz: DSA Concepts"
- You see **6 random questions** with multiple-choice options (radio buttons)
- Questions are from the 24 in the question bank
- Example questions:
  - "What is the time complexity of binary search?"
  - "In a stack, which operation removes from the top?"

**Action:** Answer all 6 questions (pick any options for now)

---

### **3c. Submit Quiz**

Click: **"Submit Quiz"** button

**Behind the scenes:**
```
POST http://localhost:8000/api/quiz/submit
Body: {
  "answers": [
    {"question_id": "q1", "selected_option": "A"},
    ...
  ]
}

Response: {
  "student_id": "student_123",
  "total_score": 67,
  "topic_scores": {
    "stack": { "correct": 1, "total": 3 },
    "queue": { "correct": 0, "total": 1 },
    ...
  },
  "failed_topics": ["queue", "sorting"]
}
```

---

### **3d. View Results**

**Expected:** Results page shows:
- Total score (e.g., "67%")
- **Green boxes** for topics you got right (PASSED)
- **Red boxes** for topics you got wrong (FAILED)
- Button: **"Enter Dungeon"**

---

### **3e. Enter Dungeon**

Click: **"Enter Dungeon"** button

**Behind the scenes:**
```
POST http://localhost:8000/api/level/generate
Body: { "failed_topics": ["queue", "sorting"] }

Response: {
  "level_name": "Queue Caverns - Level 1",
  "concept": "queue",
  "difficulty": 1,
  "width": 20, "height": 15,
  "tiles": [...],
  "player_start": {"x": 2, "y": 2},
  "enemies": [
    { "x": 5, "y": 3, "hp": 20, "damage": 5 },
    ...
  ],
  "boss": {...},
  "objective": {"x": 18, "y": 2}
}
```

---

### **3f. Play WASM Game**

**Expected:**
- Page loads with title "Game: Queue Caverns"
- **Canvas appears** with a 20×15 grid
- Tiles are color-coded:
  - **Gray** = floor
  - **Light gray** = wall
  - **Orange** = door
  - **Red** = enemies
  - **Green** = objective
  - **Purple** = boss
- **Player symbol** at spawn (top-left area)

**Dummy Game UI shows:**
- Current position: `(x, y)`
- Level name, concept, difficulty
- "Return to Hub" button

**Note:** This is just a visual test. The game doesn't have player movement yet (that's next phase).

---

### **3g. Return to Hub**

Click: **"Return to Hub"** button

Expected: Route back to `/` (Landing page)

---

## 🔍 Debugging Checklist

If something breaks:

| Problem | Solution |
|---------|----------|
| Backend not responding | Run `curl http://localhost:8000/health` → should get `{"status": "healthy"}` |
| "Cannot find module 'game.js'" | Check `frontend/public/wasm/` exists with `game.js` and `game.wasm` |
| Quiz questions don't load | Check: `curl http://localhost:8000/api/quiz/questions` → should return 24 questions |
| Results don't show topics | Make sure quiz/submit endpoint returns `topic_scores` field |
| WASM canvas doesn't render | Check browser console for errors: Press F12 → Console tab |
| "Access-Control error" | Backend CORS must allow `localhost:5173` (already done in main.py) |
| React components don't compile | Run `cd frontend && npm install` to ensure deps are installed |

---

## 📊 API Health Check

Run these commands to verify all endpoints:

```bash
# 1. Health
curl http://localhost:8000/health
# Expected: {"status": "healthy"}

# 2. Get quiz questions
curl http://localhost:8000/api/quiz/questions
# Expected: Array of 24 question objects

# 3. Submit quiz (sample)
curl -X POST http://localhost:8000/api/quiz/submit \
  -H "Content-Type: application/json" \
  -d '{"answers": [{"question_id": "q1", "selected_option": "A"}]}'
# Expected: QuizResult with total_score and topic_scores

# 4. Generate level
curl -X POST http://localhost:8000/api/level/generate \
  -H "Content-Type: application/json" \
  -d '{"failed_topics": ["queue", "sorting"]}'
# Expected: LevelPayload with tiles, enemies, boss

# 5. Preview prebuilt level
curl "http://localhost:8000/api/level/prebuilt/stack"
# Expected: Stack dungeon JSON

# 6. Get student progress
curl "http://localhost:8000/api/progress/student_123"
# Expected: StudentProgressResponse (may be empty if no history)
```

---

## 🎯 What's Working

✅ **Backend:**
- Quiz question delivery (24 questions)
- Quiz scoring and topic analysis
- Level generation from failed topics
- Prebuilt level serving
- Progress tracking

✅ **Frontend (Dummy Components):**
- Quiz: Display questions, submit answers
- Results: Show scores, topic breakdown
- Game: Load WASM, display canvas
- Progress: Fetch student history
- Routing: All components wired with React Router

✅ **WASM Engine:**
- Compiles to game.js + game.wasm
- Loads JSON level payload
- Renders tiles with color coding
- Communicates with JS via Emscripten ccall

---

## 📝 What's NOT Working (Yet)

❌ **Game:**
- Player movement
- Enemy collision detection
- Boss encounter UI
- Combat system
- Win/lose conditions

❌ **UI:**
- Real design (dummy boxes only)
- Mobile responsiveness
- Animations
- Sound effects

❌ **Backend Learning Features:**
- Adaptive difficulty
- Spaced repetition
- Misconception detection
- Real-time metrics

(See `BACKEND_ENHANCEMENT_ROADMAP.md` for these)

---

## 🚀 Next Actions

After this test passes:

1. **Phase 1 (Backend Learning)** - Implement features from BACKEND_ENHANCEMENT_ROADMAP.md
2. **Phase 2 (Game Combat)** - Extend WASM engine with player movement, collisions, boss battles
3. **Phase 3 (Real UI)** - User provides design → replace dummy components

---

## 💡 Pro Tips

**To stay focused on learning experience (not UI):**
- Focus on these metrics: concept mastery, engagement, retention
- Ignore UI complaints (it's intentionally plain)
- Optimize: backend difficulty, boss mechanics, question sequencing
- Test with: repeated plays of same concept at different difficulties

**To debug WASM issues:**
```bash
# Look at compiled JavaScript
open frontend/public/wasm/game.js
# Search for: "emscripten", "ccall", "your_function_name"

# Test WASM directly in browser
# 1. Go to http://localhost:5173/game
# 2. Open DevTools: F12
# 3. Console tab, try: window.Module.ccall('get_player_pos', ...)
```

**To extend backend:**
```bash
# Add new endpoint: create file in member2/backend/app/routes/
# Add new service: create file in member2/backend/app/services/

# Then in member2/backend/app/main.py:
from app.routes.your_new_route import router
app.include_router(router)

# Restart backend: Ctrl+C, then re-run uvicorn
```

---

## ⏱️ Expected Timing

- Backend startup: 2-3 seconds
- Frontend startup: 5-10 seconds
- Quiz page load: <500ms
- Submit quiz: <1s
- Results page load: <500ms
- Level generation: <1s
- Game canvas render: <2s

**Total: ~15-20s end-to-end**

If any step takes >5s, something's wrong (check Networking tab in DevTools).

---

**Ready? Start Terminal 1 and Terminal 2, then navigate to `http://localhost:5173`. Let's go!** 🎮
