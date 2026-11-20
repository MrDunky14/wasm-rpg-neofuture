# 🧪 WASM-RPG: Quick Test Guide

**Last Updated:** April 10, 2026  
**Status:** ✅ Backend + Engine Ready | ⏳ Frontend 70% Ready

---

## 🟢 What You Can Test RIGHT NOW (5-10 minutes)

### **Test 1: Backend API (No Frontend Needed)**

```bash
# Terminal 1: Start backend
cd member2/backend
python -m uvicorn app.main:app --reload
```

**Expected Output:**
```
INFO:     Application startup complete
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Then test in another terminal:**

```bash
# Get quiz questions
curl http://localhost:8000/api/quiz/questions

# Submit quiz answers
curl -X POST http://localhost:8000/api/quiz/submit \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "test_student",
    "answers": [
      {"question_id": 1, "selected_option": "b"},
      {"question_id": 2, "selected_option": "a"},
      {"question_id": 3, "selected_option": "c"}
    ]
  }'

# Generate dungeon level
curl -X POST http://localhost:8000/api/level/generate \
  -H "Content-Type: application/json" \
  -d '{
    "failed_topics": ["stack"],
    "difficulty": 1
  }'
```

**What You'll See:**
✅ Quiz questions loaded from question bank  
✅ Scoring calculated by topic  
✅ Level JSON generated with dungeon layout  
✅ API response with all gameplay data  

**Time: 2 minutes**

---

### **Test 2: WASM Engine (Smoke Test - HTML Harness)**

```bash
# 1. Start a simple HTTP server from repo root
cd /workspaces/wasm-rpg-neofuture
python -m http.server 8000

# 2. Open in browser
http://localhost:8000/engine/wasm-smoke-test.html
```

**Expected Output (In Browser Console):**
```
✅ WASM Module Loaded
✅ load_level() callable
✅ get_player_pos() callable
✅ is_level_won() callable
[Sample Level Loaded]
Player Position: (1, 1)
Level Won: false
```

**What You'll See:**
✅ WASM runtime loads (game.js + game.wasm)  
✅ JavaScript bridge to C++ functions works  
✅ Sample dungeon JSON parses correctly  
✅ Game state initializes properly  

**Time: 2 minutes**

---

### **Test 3: Frontend (Landing Page)**

```bash
# Terminal: Start frontend dev server
cd frontend
npm install  # First time only
npm run dev
```

**Expected Output:**
```
Local:   http://localhost:5173
Press q to quit
```

**Then open browser:**
```
http://localhost:5173
```

**What You'll See:**
✅ Landing page with "WASM-RPG" title  
✅ "Start Quiz" button  
✅ Dark glassmorphic theme loaded  
✅ Routing works (click → should navigate)  

**Note:** Quiz page may be incomplete (components still being built)  

**Time: 2 minutes**

---

## 🟡 What Needs Completion Before Full E2E Test

### **Before You Can Play Full Game:**

1. **Frontend Quiz Component** (Member 1) — ~2-3 hours
   - [ ] Get quiz questions from API
   - [ ] Display questions with 4 options
   - [ ] Track selected answers
   - [ ] Submit to backend
   - [ ] Navigate to Results page

2. **Frontend Results Component** (Member 1) — ~1 hour
   - [ ] Display score pie chart
   - [ ] Show topic breakdown (passed/failed)
   - [ ] Button to enter dungeon

3. **Frontend Game Component** (Member 1) — ~2 hours
   - [ ] Embed SDL canvas (WASM output)
   - [ ] Load level from backend API
   - [ ] Wire WASM functions (load_level, get_player_pos, etc.)
   - [ ] Handle boss question overlay

4. **Asset Download** (Member 3) — ~30 mins
   - [ ] Download Tier 1 tileset from itch.io (see ASSET_SPECIFICATION.md)
   - [ ] Place in engine/assets/
   - [ ] Rebuild WASM (make sure tileset.png loads)

---

## 🔵 Full E2E Test (Once Frontend Complete)

Once all components are done, you can test the **complete student journey**:

```
Landing Page
  ↓ (1 sec)
Quiz Page (fill in 6 questions)
  ↓ (5-10 sec)
Results Page (show topic breakdown)
  ↓ (1 sec)
Dungeon Entry Screen
  ↓ (2 sec)
Game Page (WASM rendering)
  ↓ (3-5 min)
Boss Fight
  ↓ (30 sec)
Victory Screen
  ↓ (Done!)
```

**Total time:** 15-20 minutes per playthrough

---

## ➡️ Quick Start: Run All 3 Tests (Parallel)

**Terminal 1:** Backend
```bash
cd member2/backend
python -m uvicorn app.main:app --reload
```

**Terminal 2:** HTTP Server (for smoke test + frontend)
```bash
cd /workspaces/wasm-rpg-neofuture
python -m http.server 8000
```

**Terminal 3:** Frontend
```bash
cd frontend
npm run dev
```

**Then test in 3 browser tabs:**
1. `http://localhost:8000/engine/wasm-smoke-test.html` (WASM test)
2. `http://localhost:5173` (Frontend)
3. `http://localhost:8000/api/quiz/questions` (API direct)

---

## 📋 Expected Test Results

### ✅ Backend API Test
```json
{
  "questions": [
    {
      "id": 1,
      "topic": "stack",
      "question": "What principle does a stack follow?",
      "options": [...],
      "correct_option": "b"
    }
  ]
}
```

### ✅ WASM Smoke Test
```
✅ Module Loaded
Player at (1, 1)
Enemies: 2
Boss: Stack Overlord (100 HP)
```

### ✅ Frontend Landing
```
[WASM-RPG Animated Title]
[Start Quiz Button]
[3 Feature Cards Below]
```

---

## ⚠️ Known Limitations (Currently)

- [ ] Frontend Quiz component not fully wired (placeholder for now)
- [ ] Results chart not rendering (chart library pending)
- [ ] Game component not connected to WASM (Player won't see dungeon yet)
- [ ] Assets not downloaded (tileset will render as colored rectangles in fallback mode)
- [ ] Boss encounter questions not displayed (pending Game component build)

**These are all fixable in 4-6 hours with Member 1's component work.**

---

## 🎯 Priority Test Checklist

**Do This First (5 mins):**
- [ ] Test Backend API with curl (verify scoring works)
- [ ] Test WASM Smoke Page (verify bridge works)
- [ ] Test Frontend Landing (verify routing works)

**If You Have 30 Mins:**
- [ ] Download Tier 1 assets (30 mins)
- [ ] Rebuild WASM with tileset

**If You Have 4-6 Hours:**
- [ ] Complete Frontend components
- [ ] Do full E2E test (15-20 min playthrough)
- [ ] Deploy to Vercel/Railway

---

## 🚨 Troubleshooting

### Backend won't start?
```bash
cd member2/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### Frontend npm errors?
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### WASM not loading?
- Check: `frontend/public/wasm/game.js` exists (173 KB)
- Check: `frontend/public/wasm/game.wasm` exists (932 KB)
- If missing, rebuild: `cd engine && bash build.sh`

### "Cannot GET /api/quiz/questions"?
- Make sure backend is running on port 8000
- Try: `curl http://localhost:8000/health`

---

## 📊 Success Criteria

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Backend /api/quiz/questions | 200 OK, JSON array | ? | ⏳ RUN NOW |
| Backend /api/quiz/submit | 200 OK, QuizResult | ? | ⏳ RUN NOW |
| WASM load_level() | Function callable | ? | ⏳ RUN NOW |
| Frontend Landing | Page loads | ? | ⏳ RUN NOW |
| Frontend Quiz | [Pending] | ? | ⏳ 4h WORK |
| Full E2E playthrough | 15-20 min demo | ? | ⏳ 6h WORK |

---

**Ready? Start with Test 1 (Backend) now! 🚀**
