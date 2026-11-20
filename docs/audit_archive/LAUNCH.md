# 🚀 One-Command Launch Guide

## TL;DR - Start Everything in One Command

### **macOS / Linux:**
```bash
./start.sh
```

### **Windows:**
```bash
start.bat
```

---

## What It Does

✅ **Checks if backend is running** - if not, starts it in background  
✅ **Installs frontend dependencies** - if needed  
✅ **Starts frontend dev server** - on `http://localhost:5173`  
✅ **Shows you the URLs** - for frontend, backend, and API docs  
✅ **Keeps everything alive** - until you press Ctrl+C  

---

## Output Example

```
🎮 WASM-RPG Platform Launcher
==============================

✅ Backend already running on port 8000
📦 Starting frontend on port 5173...

✅ PLATFORM LIVE
================

🌐 Frontend: http://localhost:5173
🔧 Backend:  http://localhost:8000
📚 API Docs: http://localhost:8000/docs

🛑 To stop: Press Ctrl+C

================
```

Then the Vite dev server output:

```
  VITE v4.x.x  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

---

## First Time Setup

**First run only:**

```bash
# Linux/macOS
chmod +x start.sh    # Make it executable
./start.sh

# Windows
start.bat
```

After first run, just use `./start.sh` or `start.bat` every time.

---

## What If It Fails?

| Symptom | Fix |
|---------|-----|
| `Permission denied` | `chmod +x start.sh` then try again |
| `Backend connection refused` | Backend might have crashed. Check `/tmp/backend.log` (macOS/Linux) or restart backend manually in separate terminal |
| `npm: command not found` | Install Node.js from nodejs.org |
| `python: command not found` | Install Python from python.org |

---

## Manual Alternative

If the script doesn't work, fall back to the 2-terminal method:

**Terminal 1:**
```bash
cd member2/backend
python -m uvicorn app.main:app --reload
```

**Terminal 2:**
```bash
cd frontend
npm run dev
```

---

## Key URLs

Once running:

| Component | URL |
|-----------|-----|
| **Frontend** (Main App) | http://localhost:5173 |
| **Backend** (API) | http://localhost:8000 |
| **API Documentation** | http://localhost:8000/docs |
| **Health Check** | http://localhost:8000/health |

---

## Pro Tips

**Keep backend logs:**
```bash
# In another terminal, after running start.sh
tail -f /tmp/backend.log
```

**Kill stuck processes:**
```bash
# Backend (port 8000)
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Frontend (port 5173)
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

**Restart fresh:**
```bash
pk ill -f "uvicorn\|react"   # Kill both processes
./start.sh                    # Start fresh
```

---

## That's It! 🎉

One command to get the entire platform live. No juggling terminals. Just run it and go.

