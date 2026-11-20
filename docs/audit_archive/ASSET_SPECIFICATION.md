# WASM-RPG: Comprehensive Asset Specification
**Complete Guide to Downloading & Integrating Game Assets**

---

## 📦 Asset Inventory Overview

| Category | Status | Count | Format | Total Size |
|----------|--------|-------|--------|-----------|
| Tilesets | **REQUIRED** | 1 | PNG (16x16 grid) | ~120 KB |
| Character Sprites | REQUIRED | 1 | PNG (spritesheet) | ~80 KB |
| Enemy Sprites | REQUIRED | 8 | PNG (spritesheet) | ~100 KB |
| Boss Sprites | RECOMMENDED | 8 | PNG (individual) | ~150 KB |
| UI Icons | REQUIRED | 20+ | PNG/SVG | ~40 KB |
| Fonts | REQUIRED | 2 | WOFF2 | ~50 KB |
| Sound Effects | OPTIONAL | 16 | OGG/MP3 | ~200 KB |
| **TOTAL** | | | | **~740 KB** |

---

## 🎮 TIER 1: CRITICAL ASSETS (Download Now)

### **1. 16x16 Dungeon Tileset**

**What You Need:** A tileset PNG containing all basic tiles (floor, wall, door, enemy_spawn, objective, trap, boss_spawn).

**Technical Specs:**
- **Dimensions:** 112×16 pixels (7 tiles × 1 row) OR flexible grid
- **Tile Size:** 16×16 pixels per tile (no scaling)
- **Format:** PNG with transparency (RGBA)
- **Tile Order (left to right):**
  1. Floor (walkable, neutral)
  2. Wall (solid, obstacle)
  3. Door (walkable transition)
  4. Enemy Spawn (walkable, enemy starts here)
  5. Objective (walkable, goal)
  6. Trap (walkable, hazard)
  7. Boss Spawn (walkable, boss lair)

**Recommended Source: itch.io**

✅ **BEST CHOICE:** 0x72 DungeonTileset II
- **URL:** https://0x72.itch.io/dungeontilesetii
- **Why:** Pre-made 16×16 grid, comprehensive, CC0 licensed
- **Download:** Click "Download" → Get `dungeontileset-ii.zip`
- **Extract:** Look for `colored/` folder or `tileset.png`
- **Files You Need:**
  - `tileset.png` (or rename any base tileset)
  - Copy to: `engine/assets/tileset.png`

**Alternative:** Kenney 1-Bit Pack
- **URL:** https://kenney.nl/assets/1-bit-pack
- **Why:** Monochrome, clean, extremely reliable
- **File:** `1-Bit Pack.zip` → Extract `Tileset/` folder
- **Note:** Monochrome means single color; will need to apply different colors in CSS/shader for concept distinction

---

### **2. Player Character Sprite**

**What You Need:** A single player sprite or small spritesheet (16×16 or 32×32 with frames).

**Technical Specs:**
- **Base Size:** 16×16 pixels (matches tiles)
- **Animation Frames (Optional):** 
  - Idle (1 frame)
  - Walk Up/Down/Left/Right (4 directions × 4 frames = 16 frames)
  - Attack (4 frames)
  - Damaged (1 frame)
- **Format:** PNG with transparency
- **Total Spritesheet Size:** Recommended 64×64 or 128×128 (small enough for quick loading)

**Recommended Source: itch.io**

✅ **BEST CHOICE:** Ninja Adventure Asset Pack
- **URL:** https://pixel-boy.itch.io/ninja-adventure-asset-pack
- **Why:** Includes player character, enemies, animations, all 16-bit style
- **Download:** Click "Download" → Get full pack
- **Extract:** Look for `Player/` folder or character file
- **Files You Need:**
  - Any player sprite (e.g., `player.png` or spritesheet)
  - Copy to: `engine/assets/player.png`

**Alternative:** Kenney Micro Roguelike
- **URL:** https://kenney.nl/assets/micro-roguelike
- **Download:** `Micro Roguelike.zip`
- **File:** Look for `character.png` or `player/` folder

---

### **3. Enemy Sprites (8 Concept-Based Types)**

**What You Need:** Individual enemy sprites for each DSA concept threat.

**Technical Specs:**
- **Size:** 16×16 or 32×32 pixels per enemy
- **Quantity:** 8 different enemy types (one per concept):
  1. **Stack Golem** — Tall, blocky (represents stacking)
  2. **Queue Serpent** — Long, segmented (represents queue segments)
  3. **Chaos Sorter** — Chaotic appearance (represents unsorted chaos)
  4. **Search Phantom** — Ghostly, bifurcated appearance
  5. **Recursive Shade** — Nested/layered appearance
  6. **Node Crawler** — Chain-like, linked segments
  7. **Graph Wraith** — Interconnected, web-like
  8. **Algebra Imp** — Formula-like, mathematical
- **Format:** PNG with transparency
- **Animation:** Optional (idle + walk cycle recommended)

**Recommended Source: Combined**

✅ **BEST OPTION:** Download 2 packs and mix:

**Pack A: Ninja Adventure (same as player)**
- Already downloaded above
- Use different characters/enemies for each concept type
- File: `Enemies/` folder contains ~20 enemy sprites

**Pack B: 0x72 DungeonTileset II**
- URL: https://0x72.itch.io/dungeontilesetii
- Contains animated enemy sprites already included
- Use these as base enemies, rename by concept

**Organization in Your Project:**
```
engine/assets/
├── enemies/
│   ├── stack_golem.png       (16x16 or 32x32)
│   ├── queue_serpent.png
│   ├── chaos_sorter.png
│   ├── search_phantom.png
│   ├── recursive_shade.png
│   ├── node_crawler.png
│   ├── graph_wraith.png
│   └── algebra_imp.png
```

**Alternative:** Kenney Mini Roguelike
- Multiple enemy types included
- Simpler, more reliable
- URL: https://kenney.nl/assets/micro-roguelike

---

### **4. Boss Sprites (8 Concept-Based Bosses)**

**What You Need:** Larger, more distinctive sprites for each concept boss.

**Technical Specs:**
- **Size:** 32×32 or 48×48 pixels (larger than regular enemy)
- **Quantity:** 8 unique boss sprites
- **Format:** PNG with transparency
- **Animation:** Recommended idle + attack cycle (8-12 frames)

**Boss Name → Sprite Mapping:**
```
Stack Overlord       → Tall, pyramid-like structure
Queue Warden        → Guard-like, organizational aesthetic
Sort Master         → Organizing/sorting motion pose
Binary Sentinel     → Dual-faced or split appearance
Recursion Hydra     → Multi-headed (nested copies of same head)
List Leviathan      → Long, segmented, chain-like
Graph Colossus      → Interconnected, many limbs/connections
Equation Titan      → Formula-adorned, mathematical appearance
```

**Recommended Source:**

✅ **BEST OPTION:** Pixel Art Boss Pack (Generic + Customize)
- Search: "16-bit boss sprite" on itch.io
- Popular indie packs include boss templates
- Alternative: Design simple placeholder bosses (see "Simple DIY" below)

**DIY Simple Option (No Download):**
- Use HTML5 Canvas or Aseprite (free trial) to create 32×32 colored blocks
- Assign different colors per boss:
  - Stack Overlord: Purple (#7c3aed)
  - Queue Warden: Teal (#0d9488)
  - Sort Master: Orange (#ea580c)
  - Etc. (use colors from Color Palette section in UI Specs)
- Save as PNG

---

## 🎨 TIER 2: HIGH-PRIORITY ASSETS (Download Next)

### **5. UI Icons (20+ icons)**

**What You Need:** Icons for buttons, HUD elements, status indicators.

**Icon Types (with counts):**
- Health/HP: ❤️ (1)
- Damage: ⚔️ (1)
- Shield: 🛡️ (1)
- Pause: ⏸️ (1)
- Menu: ☰ (1)
- Topic Tags: Stack, Queue, Sorting × 3 (3)
- Difficulty Badges: Easy ●, Medium ●●, Hard ●●● (3)
- Status: Victory ✓, Defeat ✗, Boss 👹 (3)
- Misc: Settings ⚙️, Help ❓, Sound 🔊 (3)

**Technical Specs:**
- **Format:** PNG (24x24 or 32x32) OR SVG (scalable)
- **Style:** Match 16-bit RPG aesthetic
- **Color Palette:** Must match design tokens (Purple, Cyan, Gold, Red, Green)

**Recommended Source:**

✅ **BEST OPTION:** Kenney Game Icons
- **URL:** https://kenney.nl/assets/game-icons
- **Why:** 500+ icons, all 16-bit, CC0 licensed, PNG format
- **Download:** `Game Icons.zip`
- **Files You Need:**
  - `heart.png`, `sword.png`, `shield.png`, `pause.png`, `menu.png`
  - Copy to: `frontend/public/icons/`

**Alternative:** itch.io Icon Packs
- Search: "16-bit ui icons"
- Many free packs available
- Pick one that matches your color palette

---

### **6. Fonts (Typography Files)**

**What You Need:** 2 font files in WOFF2 format (optimized for web).

**Font 1: Pixel/RPG Font**
- **Name:** Press Start 2P
- **Usage:** Headers, CTA buttons, game overlays
- **URL:** https://fonts.google.com/specimen/Press+Start+2P
- **Download:** Click "Download Family" → Unzip
- **Convert to WOFF2:** https://cloudconvert.com (Search "TTF to WOFF2")
- **File:** `PressStart2P-Regular.woff2`
- **Copy to:** `frontend/public/fonts/`

**Font 2: Modern Readable Font**
- **Name:** Inter (system fonts fallback to system sans-serif if not available)
- **Usage:** Quiz questions, instructions, body text
- **URL:** https://fonts.google.com/specimen/Inter
- **Download:** Click "Download Family"
- **Convert to WOFF2:** Use CloudConvert (same as above)
- **File:** `Inter-Regular.woff2`, `Inter-Bold.woff2`
- **Copy to:** `frontend/public/fonts/`

**CSS Integration (in `src/index.css`):**
```css
@font-face {
  font-family: 'Press Start 2P';
  src: url('/fonts/PressStart2P-Regular.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
}
```

---

## 🎵 TIER 3: OPTIONAL POLISH (Nice-to-Have)

### **7. Sound Effects (16 SFX)**

**What You Need:** Audio files for gameplay feedback.

**Sound Types:**
| Event | File | Format | Size |
|-------|------|--------|------|
| Quiz Submit | quiz_answer.ogg | OGG | ~5 KB |
| Level Start | dungeon_enter.ogg | OGG | ~8 KB |
| Enemy Hit | enemy_takes_damage.ogg | OGG | ~3 KB |
| Player Hit | player_takes_damage.ogg | OGG | ~4 KB |
| Boss Defeated | boss_victory.ogg | OGG | ~10 KB |
| Level Complete | level_complete.ogg | OGG | ~15 KB |
| Correct Answer | correct_answer.ogg | OGG | ~3 KB |
| Incorrect Answer | incorrect_answer.ogg | OGG | ~3 KB |
| UI Click | ui_click.ogg | OGG | ~2 KB |
| Powerup | powerup.ogg | OGG | ~5 KB |
| Enemy Alert | enemy_alert.ogg | OGG | ~4 KB |
| Ambient BGM | dungeon_music_lo.ogg | OGG | ~100 KB |

**Technical Specs:**
- **Format:** OGG Vorbis (better compression than MP3)
- **Bitrate:** 128 kbps (acceptable quality)
- **Sample Rate:** 44100 Hz
- **Channels:** Mono for effects, Stereo for music

**Recommended Source:**

✅ **BEST OPTION:** Kenney RPG Sound Pack
- **URL:** https://kenney.nl/assets (search RPG audio)
- **Download:** `RPG Audio/` packs
- **Why:** Pre-mixed, balanced, CC0 licensed

**Alternative:** FreeSound.org
- **URL:** https://freesound.org
- **License:** Filter by CC0 / Free Download
- **Search Terms:** "8-bit game sound effect", "retro sfx"

**Implementation (in React - optional):**
```typescript
// audio/useGameSounds.ts
import { useSound } from 'use-sound';

export function useGameSounds() {
  const [playCorrect] = useSound('/sounds/correct_answer.ogg');
  const [playIncorrect] = useSound('/sounds/incorrect_answer.ogg');
  const [playBossDefeated] = useSound('/sounds/boss_victory.ogg');
  
  return { playCorrect, playIncorrect, playBossDefeated };
}
```

---

## 📁 Asset Directory Structure (Final)

After downloading, organize as follows:

```
wasm-rpg-neofuture/
├── engine/
│   └── assets/
│       ├── tileset.png                    (CRITICAL - 112×16 or larger grid)
│       ├── player.png                    (CRITICAL - 16×16 or spritesheet)
│       ├── enemies/
│       │   ├── stack_golem.png
│       │   ├── queue_serpent.png
│       │   ├── chaos_sorter.png
│       │   ├── search_phantom.png
│       │   ├── recursive_shade.png
│       │   ├── node_crawler.png
│       │   ├── graph_wraith.png
│       │   └── algebra_imp.png
│       ├── bosses/
│       │   ├── stack_overlord.png
│       │   ├── queue_warden.png
│       │   ├── sort_master.png
│       │   ├── binary_sentinel.png
│       │   ├── recursion_hydra.png
│       │   ├── list_leviathan.png
│       │   ├── graph_colossus.png
│       │   └── equation_titan.png
│       └── levels/                        (Prebuilt dungeons - already exists)
│           ├── stack_dungeon.json
│           ├── queue_dungeon.json
│           └── sorting_dungeon.json
│
└── frontend/
    └── public/
        ├── icons/
        │   ├── heart.png
        │   ├── sword.png
        │   ├── shield.png
        │   ├── pause.png
        │   └── ... (18 more)
        ├── fonts/
        │   ├── PressStart2P-Regular.woff2
        │   ├── Inter-Regular.woff2
        │   └── Inter-Bold.woff2
        └── sounds/                        (OPTIONAL)
            ├── quiz_answer.ogg
            ├── dungeon_enter.ogg
            ├── enemy_takes_damage.ogg
            └── ... (13 more)
```

---

## 🔧 Integration Checklist

### **Frontend (Member 1)**

- [ ] Download and place fonts in `frontend/public/fonts/`
- [ ] Add `@font-face` declarations to `src/index.css`
- [ ] Download and place UI icons in `frontend/public/icons/`
- [ ] Update UI components to reference icon paths
- [ ] (Optional) Download SFX and add to `frontend/public/sounds/`
- [ ] Test font loading: `npm run dev` → should see Press Start 2P in headers

### **Engine (Member 3)**

- [ ] Download tileset and place at `engine/assets/tileset.png`
- [ ] Download player sprite and place at `engine/assets/player.png`
- [ ] Download and place enemy sprites in `engine/assets/enemies/`
- [ ] Download and place boss sprites in `engine/assets/bosses/` (optional for MVP)
- [ ] Update `renderer.cpp` to load tileset:
  ```cpp
  // In load_tileset function:
  SDL_Surface* surface = IMG_Load("assets/tileset.png");
  if (!surface) {
    printf("[Warning] Tileset not found, using fallback colors\n");
    return nullptr;
  }
  return SDL_CreateTextureFromSurface(renderer, surface);
  ```
- [ ] Rebuild WASM: `cd engine && bash build.sh`
- [ ] Test smoke page: `http://localhost:4173/engine/wasm-smoke-test.html`

---

## 🎯 Quick Start (30-Minute Asset Grab)

If you want to get something working quickly:

1. **Download 0x72 DungeonTileset II:** https://0x72.itch.io/dungeontilesetii
   - Extract and place `tileset.png` in `engine/assets/`

2. **Download Ninja Adventure Pack:** https://pixel-boy.itch.io/ninja-adventure-asset-pack
   - Extract character sprite to `engine/assets/player.png`
   - Extract enemy sprites to `engine/assets/enemies/`

3. **Download Kenney Game Icons:** https://kenney.nl/assets/game-icons
   - Extract and place icons in `frontend/public/icons/`

4. **Add fonts from Google Fonts:**
   - Download Press Start 2P and Inter
   - Convert to WOFF2 using CloudConvert
   - Place in `frontend/public/fonts/`

5. **Rebuild and test:**
   ```bash
   cd engine && bash build.sh
   cd ../frontend && npm run dev
   ```

---

## 📊 Asset File Size Budget

| Item | Download Size | Compressed Size | Installed Size |
|------|---|---|---|
| Tilesets | ~100 KB | ~30 KB | ~120 KB |
| Sprites | ~150 KB | ~40 KB | ~200 KB |
| Icons | ~80 KB | ~25 KB | ~80 KB |
| Fonts | ~60 KB | ~20 KB | ~60 KB |
| SFX (optional) | ~300 KB | ~100 KB | ~300 KB |
| **TOTAL** | **~690 KB** | **~215 KB** | **~760 KB** |

---

## 🚀 Next Steps

1. **Immediately:** Download Tier 1 assets (Tileset, Player, Enemy sprites)
2. **Today:** Integrate into engine and test with smoke page
3. **This week:** Download UI icons and fonts, integrate into frontend
4. **Polish phase:** Add optional SFX and boss sprites

**Questions?** Reference itch.io asset pages directly or use their download buttons. All recommended sources are CC0 licensed (free for commercial use).

