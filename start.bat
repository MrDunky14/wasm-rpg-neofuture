@echo off
REM 🚀 WASM-RPG One-Command Launcher (Windows)
REM Starts backend + frontend in one go

setlocal enabledelayedexpansion

set REPO_ROOT=%~dp0
set BACKEND_PORT=8000
set FRONTEND_PORT=5173

echo.
echo 🎮 WASM-RPG Platform Launcher
echo ==============================
echo.

REM Check if backend is already running
for /f "tokens=*" %%i in ('curl -s http://localhost:%BACKEND_PORT%/health 2^>nul') do (
    if not "%%i"=="" (
        echo ✅ Backend already running on port %BACKEND_PORT%
        set BACKEND_RUNNING=1
        goto :skip_backend
    )
)

REM Backend not running, start it
echo ⏳ Starting backend...
cd /d "%REPO_ROOT%member2\backend"
start "WASM-RPG Backend" cmd /k python -m uvicorn app.main:app --reload --host 127.0.0.1 --port %BACKEND_PORT%

REM Wait for backend
echo ⏳ Waiting for backend to start (up to 30 seconds)...
timeout /t 2 /nobreak

:skip_backend
echo.
echo 📦 Starting frontend on port %FRONTEND_PORT%...
cd /d "%REPO_ROOT%frontend"

REM Install deps if needed
if not exist "node_modules" (
    echo ⏳ Installing frontend dependencies...
    call npm install --silent
)

echo.
echo ✅ PLATFORM LIVE
echo ================
echo.
echo 🌐 Frontend: http://localhost:%FRONTEND_PORT%
echo 🔧 Backend:  http://localhost:%BACKEND_PORT%
echo 📚 API Docs: http://localhost:%BACKEND_PORT%/docs
echo.
echo 🛑 To stop: Close both command windows or press Ctrl+C
echo.
echo ================
echo.

REM Start frontend
call npm run dev

pause
