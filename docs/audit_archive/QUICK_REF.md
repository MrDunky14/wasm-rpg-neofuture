# 🎮 Platform Quick Reference

## One-Command Start

```bash
# macOS / Linux
./start.sh

# Windows
start.bat
```

**That's it. Everything runs.**

---

## URLs After Launch

| What | URL | Shows You |
|------|-----|-----------|
| 🎮 **Game** | http://localhost:5173 | Quiz → Results → Dungeon |
| 🔧 **API** | http://localhost:8000 | Backend running |
| 📚 **Docs** | http://localhost:8000/docs | Interactive API documentation |
| ✅ **Health** | http://localhost:8000/health | Backend status |

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────┐
│  Your Browser: http://localhost:5173               │
│  ┌──────────────┐                                   │
│  │ React App    │──────────┐                        │
│  │ (Vite Dev)   │          │                        │
│  └──────────────┘          │                        │
└─────────────────────────────────────────────────────┘
             │                  │
             │ HTTP/REST        │ WASM/Emscripten
             ↓                  ↓
┌─────────────────────────────────────────────────────┐
│  Backend: http://localhost:8000                     │
│  ┌──────────────┐          ┌──────────────┐         │
│  │ FastAPI      │          │ WASM Engine  │         │
│  │ (Quiz, Level)│          │ (Game Logic) │         │
│  └──────────────┘          └──────────────┘         │
└─────────────────────────────────────────────────────┘
             │
             ↓
        ┌─────────┐
        │ SQLite  │
        │ (Data)  │
        └─────────┘
```

---

## What Each Component Does

### **Frontend (React)**
- Landing page with game overview
- Quiz component - displays 6 questions, submits answers
- Results component - shows score breakdown by topic
- Game component - loads WASM and displays dungeon
- Progress component - shows student learning history

### **Backend (FastAPI)**
- `/api/quiz/questions` - returns pool of questions
- `/api/quiz/submit` - scores quiz, returns failed topics
- `/api/level/generate` - creates dungeon based on weak topics
- `/api/progress/:id` - tracks student history
- `/health` - status check

### **WASM Engine (C++)**
- Loads JSON dungeon data
- Renders colored tiles (floor, walls, enemies, boss)
- Will eventually handle: movement, collisions, combat, boss encounters

---

## Typical Student Flow

```
1. Land on http://localhost:5173
   ↓
2. Click "Start Quiz"
   ↓
3. Answer 6 randomized DSA questions
   ↓
4. Click "Submit Quiz"
   Backend scores it, returns failed topics
   ↓
5. See Results page: Score 67%
   Stack ✅ PASSED
   Queue ❌ FAILED
   ↓
6. Click "Enter Dungeon"
   Backend generates Queue dungeon, returns level JSON
   ↓
7. Play Game: See dungeon with colored tiles, enemies, boss
   ↓
8. Click "Return to Hub"
   Back to landing - can quiz again
```

---

## File Structure

```
/workspaces/wasm-rpg-neofuture/
├── start.sh                    ← 🚀 MAIN: Linux/macOS launcher
├── start.bat                   ← 🚀 MAIN: Windows launcher
├── LAUNCH.md                   ← This file
├── 
├── frontend/                   ← React app
│   ├── src/
│   │   ├── App.tsx            (Router)
│   │   ├── pages/
│   │   │   ├── Landing.tsx    (Home page)
│   │   │   ├── Quiz.tsx       (Questions)
│   │   │   ├── Results.tsx    (Score breakdown)
│   │   │   ├── Game.tsx       (WASM canvas)
│   │   │   └── Progress.tsx   (History)
│   │   └── main.tsx
│   ├── public/wasm/
│   │   ├── game.js            (WASM loader)
│   │   └── game.wasm          (Compiled engine)
│   ├── package.json
│   └── vite.config.ts
│
├── member2/
│   └── backend/               ← FastAPI
│       ├── app/
│       │   ├── main.py        (FastAPI app)
│       │   ├── routes/
│       │   │   ├── quiz.py
│       │   │   ├── level.py
│       │   │   └── progress.py
│       │   ├── services/
│       │   │   └── level_generator.py
│       │   ├── models/
│       │   │   └── schemas.py
│       │   └── data/
│       │       └── questions.py
│       └── requirements.txt
│
└── engine/                    ← WASM Engine (C++)
    ├── src/
    │   ├── game.cpp
    │   ├── level_loader.cpp
    │   └── renderer.cpp
    └── include/
        └── game.h
```

---

## Debug Tricks

**Check backend health:**
```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy"}
```

**See available questions:**
```bash
curl http://localhost:8000/api/quiz/questions | jq 'length'
# Should return: 24
```

**View API documentation:**
```bash
# Open in browser:
http://localhost:8000/docs
# Interactive Swagger UI - test endpoints live
```

**Check if ports are in use:**
```bash
# macOS/Linux
lsof -i :8000  # Backend
lsof -i :5173  # Frontend

# Windows
netstat -ano | findstr :8000
netstat -ano | findstr :5173
```

---

## What's Currently Working ✅

- ✅ Backend API endpoints
- ✅ Quiz question delivery (24 questions)
- ✅ Quiz scoring logic
- ✅ Level generation from failed topics
- ✅ WASM compilation (game.js + game.wasm)
- ✅ React routing (all components wired)
- ✅ Dummy UI (intentionally plain)
- ✅ WASM canvas rendering (shows dungeon)

---

## What's Coming Next 📋

**Phase 1: Backend Learning Features**
- Adaptive difficulty based on student performance
- Misconception detection
- Spaced repetition system
- Real-time difficulty tuning

**Phase 2: Game Experience**
- Player movement
- Enemy collision detection
- Boss encounter mechanics
- Win/lose conditions

**Phase 3: UI Replacement**
- Real design from user
- Polish animations
- Asset integration

---

## Need Help?

1. **Script won't start?** → Try manual method (see LAUNCH.md)
2. **Backend crashes?** → Check `/tmp/backend.log` (Linux/macOS)
3. **WASM doesn't load?** → Check browser console (F12 → Console tab)
4. **Questions not showing?** → Verify backend is running (`curl http://localhost:8000/health`)

---

**🚀 Ready? Just run: `./start.sh` or `start.bat`**

