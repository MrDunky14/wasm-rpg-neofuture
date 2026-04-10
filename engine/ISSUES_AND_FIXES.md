# Member 3 — Quality Issues, Loopholes & Fixes Analysis

**Generated:** April 10, 2026 | Status: Initial Setup Complete

---

## 🔴 CRITICAL ISSUES (Block Build/Deploy)

### Issue #1: nlohmann/json Header Not Included
**Severity:** 🔴 CRITICAL  
**Status:** ⚠️ NEEDS ACTION NOW  

**Problem:**
- Placeholder JSON header created (`engine/include/nlohmann/json.hpp`)
- Full implementation needed for `json::parse()`, `json::contains()`, etc.
- Build will fail if not completed before compilation

**Impact:**
- Level loading won't compile
- Entire Phase 2+ blocked

**Fix:**
```bash
cd engine/include/nlohmann
wget https://github.com/nlohmann/json/releases/download/v3.11.2/json.hpp
# OR download manually: https://github.com/nlohmann/json/releases
```

**Timeline:** Do this FIRST (5 minutes)

---

### Issue #2: Emscripten SDK Not Verified
**Severity:** 🔴 CRITICAL  
**Status:** ⚠️ NEEDS VERIFICATION  

**Problem:**
- Build system assumes `emsdk` is installed and activated
- If `emcc --version` fails, entire build chain breaks
- No fallback if Emscripten missing

**Impact:**
- Cannot compile C++ to WASM
- No way to test game in browser

**Fix:**
```bash
# Verify Emscripten is installed
emcc --version

# If not found, install:
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh  # Linux/Mac
# emsdk_env.bat       # Windows

# Verify activation
emcc --version  # Should show version info
```

**Timeline:** Do this IMMEDIATELY (10 minutes)

---

### Issue #3: No Build Output Directory Setup
**Severity:** 🟠 HIGH  
**Status:** ⚠️ BUILD SYSTEM ISSUE  

**Problem:**
- `engine/build.sh` assumes `frontend/public/wasm/` exists
- If M1 hasn't created that yet, build fails silently
- Output files won't be copied

**Impact:**
- React won't find compiled WASM files
- Integration test fails mysteriously at Hour 10-12

**Fix:**
```bash
# Create output directory structure NOW
mkdir -p frontend/public/wasm

# Alternative: Update build.sh to create it
# (Already done in current build.sh - should work)
```

**Timeline:** Verify before first build (5 minutes)

---

## 🟠 HIGH PRIORITY ISSUES (Performance/Correctness)

### Issue #4: Collision Detection Four-Corner Check May Over-Correct
**Severity:** 🟠 HIGH  
**Status:** ⚠️ POTENTIAL CLIPPING  

**Problem:**
```cpp
// Current implementation
float x1 = new_x + (player.width / 16.0f) - 0.1f;  // Margins may be too aggressive
float y1 = new_y + (player.height / 16.0f) - 0.1f;
```

- Margin of 0.1f tiles might cause player to get "stuck" on walls
- Or margin too small → player clips through walls

**Symptoms (if wrong):**
- Player can't move past certain points
- Player gets partially stuck in walls
- Jerky movement near corners

**Fix Options:**
```cpp
// Conservative: Allow close movement to walls
bool check = can_walk(x0 + 0.05f, y0 + 0.05f, tiles) &&  // Tighter margin
            can_walk(x1 - 0.05f, y0 + 0.05f, tiles) &&
            can_walk(x0 + 0.05f, y1 - 0.05f, tiles) &&
            can_walk(x1 - 0.05f, y1 - 0.05f, tiles);

// Or: Use actual hitbox size
float margin = 0.05f;  // Tune based on testing
```

**Testing:** First time you run the game, move player around corners and into walls.

**Timeline:** Test during Phase 1 (Hour 2-3)

---

### Issue #5: Player Speed Hardcoded to 0.1f Tiles/Frame
**Severity:** 🟠 HIGH  
**Status:** ⚠️ BALANCING  

**Problem:**
```cpp
struct Player {
    float speed = 0.1f;  // Tiles per frame at ~60 FPS
};
```

- 0.1 tiles/frame × 60 FPS = 6 tiles/second (very slow)
- Playability depends on map size and time budget
- No way to tune speed without recompilation

**Impact:**
- Player may move too slowly to feel responsive
- Demo might feel sluggish

**Fix:**
```cpp
// Make speed adjustable (for later tuning)
struct Player {
    float speed = 0.15f;  // Try 0.15-0.2f for better feel
    // Or load from level JSON
};

// In level_loader.cpp:
if (level_json.contains("player_speed")) {
    game.player.speed = level_json["player_speed"];
}
```

**Timeline:** Tune during Phase 2 playtesting (Hour 6-8)

---

### Issue #6: No Input Repeat/Debouncing
**Severity:** 🟠 MEDIUM  
**Status:** ⚠️ INPUT HANDLING  

**Problem:**
```cpp
// handle_input() checks keys every frame
const Uint8* keys = SDL_GetKeyboardState(nullptr);
if (keys[SDL_SCANCODE_UP]) {
    new_y -= g_game.player.speed;
}
```

- Holding key causes continuous movement (OK)
- But rapid key presses might cause stuttering
- No movement buffering or smoothing

**Impact:**
- Might feel unresponsive at low FPS
- Could cause jitter if network lag

**Fix (Low Priority):**
```cpp
// Store last input, smooth transitions
struct InputState {
    bool up, down, left, right;
};

// Accumulate input across frames
// Apply smoothed movement (not needed for MVP)
```

**Timeline:** Skip for now, optimize if time (Hour 18+)

---

## 🟡 MEDIUM PRIORITY ISSUES (Features/Edge Cases)

### Issue #7: No Tile Animation Support
**Severity:** 🟡 MEDIUM  
**Status:** ⚠️ VISUAL POLISH  

**Problem:**
- All tiles rendered as static colored rectangles
- No sprite atlas support
- No animation frames

**Impact:**
- Game looks very basic (acceptable for MVP)
- No visual feedback for objectives/enemies
- Sprite art can't be integrated yet

**Fix (Phase 4):**
```cpp
// Will implement in renderer.cpp
// Load tileset.png, extract sprites by tile_id
// Render from spritesheet instead of colored rects
```

**Timeline:** Phase 4 if time (Hour 16-20)

---

### Issue #8: Enemy Pathfinding Not Implemented
**Severity:** 🟡 MEDIUM  
**Status:** 👍 INTENTIONAL SKIP  

**Current Status:** Enemies are static (no AI)

**Problem:**
- Enemies don't move or patrol
- No AI decision-making
- Not mentioned in MVP scope

**Fix (SKIP for now):**
- Keep enemies static on spawn location
- If time after Phase 3: Add simple patrol between 2 waypoints

**Timeline:** Skip completely unless at Hour 16+ with all other features done

---

### Issue #9: No Pause Menu or Game State Machine
**Severity:** 🟡 MEDIUM  
**Status:** 💚 DESIGNED OUT  

**Problem:**
- Only game loop state: running or won
- No pause, restart, or level selection
- Ctrl-C to exit (not user-friendly)

**Fix (Phase 4):**
```cpp
enum GameMode { MENU, PLAYING, PAUSED, WON, LOST };

// Handle ESC to pause/unpause
// Show simple pause screen (HTML overlay, not WASM)
```

**Timeline:** Skip for MVP, implement in Phase 4 if time (1-2 hours)

---

## 🟢 LOW PRIORITY ISSUES (Polish/Nice-to-Have)

### Issue #10: No Sound/Music
**Severity:** 🟢 LOW  
**Status:** 👍 OUT OF SCOPE  

**Current:** No audio implemented

**Why Skip:**
- Audio requires SDL_mixer setup (extra complexity)
- Not critical for learning mechanic demo
- Takes 2-3 hours to integrate properly

**If time permits (Hour 18+):**
```cpp
// Future work: Load .ogg files via SDL_mixer
// Play SFX on: player move, enemy hit, objective reached
```

---

### Issue #11: No Minimap/Debug Visualization
**Severity:** 🟢 LOW  
**Status:** 👍 DESIGNED OUT  

**Problem:**
- No way to see full map at glance
- Players might get lost in large dungeons

**Fix (HTML Overlay):**
- M1 (React) adds minimap overlay using canvas
- Calls `Module.ccall('get_map_data')` for tile data
- Renders minimap as 2D grid

**Timeline:** M1 feature, not M3 (skip for Phase 3, maybe Phase 4)

---

### Issue #12: No Camera System
**Severity:** 🟢 LOW  
**Status:** 👍 WORKING AS INTENDED  

**Current:** Camera shows entire map always

**Why OK:**
- MVP uses small 20×15 tile maps
- Full visibility prevents player confusion
- Camera system adds complexity

**If needed later:**
```cpp
// Scroll camera to follow player
// Center view on player, bound at map edges
```

---

## 📊 Issue Severity Summary

| Severity | Count | Status | Action |
|----------|-------|--------|--------|
| 🔴 CRITICAL | 3 | **DO NOW** | JSON header, emsdk, output dir |
| 🟠 HIGH | 3 | Test during Phase 1-2 | Collision margins, speed, input |
| 🟡 MEDIUM | 3 | Phase 3-4 decision | Animations, AI, menus |
| 🟢 LOW | 3 | Skip for MVP | Audio, minimap, camera |

---

## ✅ Already Fixed in This Setup

1. ✅ **Process Separation** — Each module handles one responsibility
2. ✅ **Error Handling** — JSON parsing has try-catch + error codes
3. ✅ **Bounds Checking** — All array accesses guarded with size checks
4. ✅ **Resource Cleanup** — Explicit destructor calls in game_shutdown()
5. ✅ **Debug Logging** — Extensive printf() for diagnostics
6. ✅ **WASM Integration** — Proper emscripten_set_main_loop() usage
7. ✅ **Build Automation** — CMake + build.sh handles compilation
8. ✅ **Schema Lock** — Shared level format won't change mid-project

---

## 🚀 IMMEDIATE ACTION ITEMS (Next 15 Minutes)

```
[ ] 1. Download nlohmann/json.hpp
      wget https://github.com/nlohmann/json/releases/download/v3.11.2/json.hpp -O engine/include/nlohmann/json.hpp

[ ] 2. Verify Emscripten installation
      emcc --version

[ ] 3. Create output directory
      mkdir -p frontend/public/wasm

[ ] 4. Review engine/README_M3.md

[ ] 5. Read shared/level_schema.json
```

After these: You're ready to test the first build (Phase 1)

---

**All Issues Logged & Tracked in:** `/memories/session/member3_progress.md`

Generated: April 10, 2026 | M3 Status: Initialized & Ready to Build
