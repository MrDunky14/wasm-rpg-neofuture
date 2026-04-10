#!/bin/bash

# ============================================================================
# WASM-RPG Engine Build Script
# ============================================================================
# QUALITY FIX: Automated build with error checking

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
DIST_DIR="$REPO_ROOT/frontend/public/wasm"

echo "================================================"
echo "Building WASM-RPG Game Engine"
echo "================================================"

# Check if Emscripten is available
if ! command -v emcc &> /dev/null; then
    echo "[ERROR] emcc not found in PATH"
    echo "[Info] Make sure Emscripten emsdk is activated:"
    echo "       source /path/to/emsdk/emsdk_env.sh"
    exit 1
fi

echo "[✓] Emscripten found: $(emcc --version | head -n1)"

if [ ! -d "$BUILD_DIR" ]; then
    echo "[*] Creating build directory..."
    mkdir -p "$BUILD_DIR"
fi

# Run CMake with Emscripten
echo "[*] Configuring CMake with Emscripten..."
emcmake cmake -S "$SCRIPT_DIR" -B "$BUILD_DIR" -DCMAKE_BUILD_TYPE=Release

# Build
echo "[*] Building WASM engine..."
cmake --build "$BUILD_DIR" --config Release

# Copy output to frontend
echo "[*] Copying output to frontend..."
mkdir -p "$DIST_DIR"
cp "$BUILD_DIR/dist/game.js" "$DIST_DIR/"
cp "$BUILD_DIR/dist/game.wasm" "$DIST_DIR/"

if [ -f "$BUILD_DIR/dist/game.data" ]; then
    cp "$BUILD_DIR/dist/game.data" "$DIST_DIR/"
    echo "[✓] Assets bundled into game.data"
else
    echo "[!] No assets found (game.data not created)"
fi

echo ""
echo "================================================"
echo "Build complete!"
echo "================================================"
echo "[✓] Output location: $DIST_DIR"
echo "[✓] Files:"
ls -lh "$DIST_DIR"
echo ""
echo "Next: Start frontend dev server (npm run dev)"
