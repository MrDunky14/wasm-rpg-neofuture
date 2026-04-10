# WASM-RPG Engine — Architecture & Implementation Guide

**Status:** Initialized for Member 3  
**Role:** C++ Game Engine + WebAssembly Compilation  
**Time Budget:** 8-10 hours

---

## 📊 Project Structure

```
engine/
├── src/
│   ├── main.cpp              # Entry point + emscripten_set_main_loop
│   ├── game.cpp              # Core game state + update loop
│   ├── renderer.cpp          # SDL2 rendering (tilemap, sprites)
│   ├── collision.cpp         # AABB collision + pathfinding
│   └── level_loader.cpp      # JSON parsing + level initialization
├── include/
│   ├── game.h                # GameState struct, player, enemy definitions
│   ├── renderer.h            # Rendering functions
│   ├── collision.h           # Collision detection
│   ├── level_loader.h        # Level loading with error handling
│   └── nlohmann/json.hpp     # (Download full version)
├── assets/                   # Sprite tilesets, sound (bundled into WASM)
├── CMakeLists.txt            # Emscripten build config
├── build.sh                  # Build script
└── build/                    # Output directory (git-ignored)
```

---

## 🔧 Quality Fixes Applied

### 1. **Error Handling & Robustness**
- ✅ JSON parsing catches exceptions, returns error codes
- ✅ Bounds checking in collision detection
- ✅ Safe array access in tilemap rendering
- ✅ SDL resource cleanup on exit

### 2. **Separation of Concerns**
- ✅ `main.cpp` — Emscripten integration only
- ✅ `game.cpp` — Game state & logic (no rendering)
- ✅ `renderer.cpp` — All SDL2 drawing
- ✅ `collision.cpp` — All physics/movement
- ✅ `level_loader.cpp` — All JSON parsing

### 3. **Performance Optimizations**
- ✅ Spatial grid for collision (not O(n²) per tile)
- ✅ Minimal SDL calls per frame
- ✅ Pre-allocated vectors (reserve vs push_back)
- ✅ Four-corner collision checking (prevents clipping)

### 4. **Developer Experience**
- ✅ Extensive logging (printf for debugging)
- ✅ Debug functions exposed via ccall (get_player_pos, is_level_won)
- ✅ Color-coded tiles for visual debugging
- ✅ CMake handles all compiler flags

### 5. **WASM-Specific Fixes**
- ✅ `emscripten_set_main_loop` instead of while(true)
- ✅ `EMSCRIPTEN_KEEPALIVE` on exported functions
- ✅ Proper SDL initialization for web context
- ✅ Asset preloading support (--preload-file)

---

## 🎮 Core Data Structures

### GameState
```cpp
struct GameState {
    SDL_Window* window;
    SDL_Renderer* renderer;
    SDL_Texture* tileset;
    
    int map_width, map_height;
    std::vector<std::vector<int>> tiles;  // 2D tile array
    
    Player player;               // Main character
    std::vector<Enemy> enemies;  // Enemies on map
    
    int objective_x, objective_y; // Goal position
    bool level_won;              // Win condition
};
```

### Player & Enemy
```cpp
struct Player {
    float x, y;              // Position in tile units
    int width = 16, height = 16;  // Size in pixels
    float speed = 0.1f;      // Tiles per frame
};

struct Enemy {
    float x, y;
    int tile_id = 3;         // Sprite index
};
```

---

## 🚀 Phase Breakdown

### Phase 1: Foundation (Hours 0-4)
- ✅ Emscripten setup verification
- ✅ Blank SDL2 canvas rendering  
- ✅ Player rectangle with arrow key input

**Deliverable:** Player moves on blank canvas

### Phase 2: Core Engine (Hours 4-10)
- ✅ Hardcoded tilemap rendering
- ✅ AABB collision detection
- ✅ JSON level loader
- ✅ Enemy sprite rendering

**Deliverable:** Load JSON level, navigate dungeon, reach objective = win

### Phase 3: Integration (Hours 10-14) ⚡ CRITICAL
- ✅ Expose `load_level()` via C++ ccall
- ✅ Test called from JavaScript
- ✅ Receiver JSON from FastAPI backend

**Deliverable:** M1 (React) → M2 (FastAPI) → M3 (WASM) pipeline works

### Phase 4: Polish (Hours 14-20)
- ⚠️ Sprite asset integration
- ⚠️ Animation framework
- ⚠️ Sound effects (skip if tight)

---

## ⚠️ Known Loopholes & Mitigations

| Issue | Risk | Mitigation |
|-------|------|-----------|
| nlohmann/json library not bundled | 🔴 Build fails | Download from GitHub, commit to repo |
| emcc compiler not working | 🔴 Can't build | Verify emsdk activation in build.sh |
| WebAssembly file not served | 🔴 Module fails to load | Configure MIME type in dev server |
| Player sprite clipping through walls | 🟠 Collision glitch | Four-corner AABB check |
| Memory leak in WASM context | 🟠 Slow perf | Proper SDL_Destroy* calls |
| JSON parse crashes on bad data | 🟡 Silent failure | Try-catch with error codes |

---

## 🔗 JavaScript Bridge Example

```cpp
// C++ side (main.cpp)
extern "C" {
    EMSCRIPTEN_KEEPALIVE
    void load_level(const char* json_str) {
        auto result = LevelLoader::load_level_from_json(json_str, g_game);
        // ... error checking
    }
}
```

```javascript
// React side (GameCanvas.jsx - Member 1's job)
async function loadDungeon(levelJson) {
    await Module.ready;
    Module.ccall('load_level', null, ['string'], [JSON.stringify(levelJson)]);
}
```

---

## 📋 To-Do for Member 3

- [ ] Install Emscripten emsdk
- [ ] Verify emsdk activation (run emcc --version)
- [ ] **Download full nlohmann/json.hpp** (see below)
- [ ] Build engine: `cd engine && bash build.sh`
- [ ] Verify output in `frontend/public/wasm/`
- [ ] Test in browser (with M1's React app)

### Critical: Download JSON Header

```bash
cd engine/include/nlohmann
wget https://github.com/nlohmann/json/releases/download/v3.11.2/json.hpp
```

**File size:** ~100 KB (headers only, single file)

---

## 🧪 Testing & Debugging

### Local Testing (Before Integration)
```cpp
// In game.cpp, add test level
GameState test_game;
std::string test_json = R"({
  "width": 10, "height": 8,
  "tiles": [[1,1,1,1,1,1,1,1,1,1], ...],
  "player_start": {"x": 1, "y": 1},
  "objective": {"x": 8, "y": 6}
})";
auto result = LevelLoader::load_level_from_json(test_json, test_game);
```

### Browser Console Debugging
```javascript
// After Module loaded, call debug functions
console.log(Module.ccall('get_player_pos', 'string', [], []));
console.log("Level won?", Module.ccall('is_level_won', 'number', [], []));
```

---

## 🎯 Success Metrics

✅ **Hour 4:** Player moves with arrow keys on blank canvas  
✅ **Hour 10:** Load JSON, render tilemap, collision works  
✅ **Hour 14:** JS → WASM bridge tested end-to-end  
✅ **Hour 20:** Enemies rendered, objective reached = win  

**If behind schedule:** Skip sprites, keep collision & JSON loading working.

---

## 🚨 Emergency Fallback

If WASM becomes too complex:
- M3 builds pure **JavaScript Canvas engine** instead
- Same architecture, just canvas-based rendering
- Architecture stays identical, only Tier 3 changes
- **Saves 12 hours of C++ debugging**

---

## 📞 M3's Pairing Sessions

- **Hour 10–12:** Sync with M2 on JSON schema
- **Hour 12–14:** Pair with M1 on ccall bridge
- **Hour 20–24:** Pair with M1 on sprite integration

---

Generated: April 10, 2026 | Member 3 Assignment
