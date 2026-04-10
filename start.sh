#!/bin/bash

# 🚀 WASM-RPG One-Command Launcher
# Starts backend + frontend in one go

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT=8000
DEFAULT_FRONTEND_PORT=5173
FRONTEND_PORT=$DEFAULT_FRONTEND_PORT
BACKEND_STARTED_BY_SCRIPT=false

is_port_in_use() {
    local port="$1"
    if command -v ss >/dev/null 2>&1; then
        ss -ltn "( sport = :$port )" 2>/dev/null | grep -q LISTEN
    else
        (echo >"/dev/tcp/127.0.0.1/$port") >/dev/null 2>&1
    fi
}

find_free_port() {
    local start_port="$1"
    local end_port="$2"
    local port

    for ((port=start_port; port<=end_port; port++)); do
        if ! is_port_in_use "$port"; then
            echo "$port"
            return 0
        fi
    done

    return 1
}

codespaces_url_for_port() {
    local port="$1"
    if [ -n "${CODESPACE_NAME:-}" ]; then
        local domain="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
        echo "https://${CODESPACE_NAME}-${port}.${domain}"
    fi
}

echo "🎮 WASM-RPG Platform Launcher"
echo "=============================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is already running
if curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend already running on port $BACKEND_PORT${NC}"
    BACKEND_RUNNING=true
else
    echo -e "${YELLOW}⏳ Starting backend...${NC}"
    cd "$REPO_ROOT/member2/backend"
    python -m uvicorn app.main:app --reload --host 127.0.0.1 --port $BACKEND_PORT > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    BACKEND_STARTED_BY_SCRIPT=true
    echo "Backend PID: $BACKEND_PID"
    
    # Wait for backend to be ready
    echo "⏳ Waiting for backend to start..."
    for i in {1..30}; do
        if curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend started successfully${NC}"
            BACKEND_RUNNING=true
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${YELLOW}⚠️  Backend startup timeout. Check logs: tail -f /tmp/backend.log${NC}"
            BACKEND_RUNNING=false
        fi
        sleep 0.5
    done
fi

if FRONTEND_PORT_FOUND="$(find_free_port "$DEFAULT_FRONTEND_PORT" 5200)"; then
    FRONTEND_PORT="$FRONTEND_PORT_FOUND"
else
    echo -e "${YELLOW}⚠️  Could not find a free frontend port in range 5173-5200. Falling back to $DEFAULT_FRONTEND_PORT.${NC}"
fi

if [ "$FRONTEND_PORT" != "$DEFAULT_FRONTEND_PORT" ]; then
    echo -e "${YELLOW}ℹ️  Port $DEFAULT_FRONTEND_PORT is busy. Using frontend port $FRONTEND_PORT.${NC}"
fi

FRONTEND_CODESPACES_URL="$(codespaces_url_for_port "$FRONTEND_PORT")"
BACKEND_CODESPACES_URL="$(codespaces_url_for_port "$BACKEND_PORT")"

echo ""
echo -e "${BLUE}📦 Starting frontend on port $FRONTEND_PORT...${NC}"
cd "$REPO_ROOT/frontend"

# Install deps if needed
if [ ! -d "node_modules" ]; then
    echo "⏳ Installing frontend dependencies..."
    npm install --silent
fi

echo ""
echo -e "${GREEN}✅ PLATFORM LIVE${NC}"
echo "================="
echo ""
echo -e "🌐 Frontend (local): ${BLUE}http://localhost:$FRONTEND_PORT${NC}"
if [ -n "$FRONTEND_CODESPACES_URL" ]; then
    echo -e "🌐 Frontend (forwarded): ${BLUE}$FRONTEND_CODESPACES_URL${NC}"
fi
echo -e "🔧 Backend (local):  ${BLUE}http://localhost:$BACKEND_PORT${NC}"
if [ -n "$BACKEND_CODESPACES_URL" ]; then
    echo -e "🔧 Backend (forwarded):  ${BLUE}$BACKEND_CODESPACES_URL${NC}"
fi
echo -e "📚 API Docs: ${BLUE}http://localhost:$BACKEND_PORT/docs${NC}"
echo ""
echo "📝 Logs:"
if [ "$BACKEND_RUNNING" = true ] && [ ! -z "$BACKEND_PID" ]; then
    echo "   Backend:  tail -f /tmp/backend.log"
fi
echo "   Frontend: visible below"
echo ""
echo "🛑 To stop: Press Ctrl+C"
echo ""
echo "================="
echo ""

# Start frontend (blocking)
npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT"
