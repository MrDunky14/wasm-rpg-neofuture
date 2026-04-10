#include <emscripten.h>
#include <emscripten/html5.h>
#include <SDL.h>
#include <cstdio>
#include "game.h"
#include "level_loader.h"

// ============================================================================
// Global Game State
// ============================================================================

GameState g_game;

// ============================================================================
// Emscripten Main Loop Callback
// ============================================================================

void main_loop_callback() {
    game_update_and_render();
}

// ============================================================================
// Entry Point
// ============================================================================

int main() {
    printf("[Engine] WASM-RPG Game Engine Starting...\n");
    
    if (!game_init()) {
        printf("[ERROR] Failed to initialize game\n");
        return -1;
    }
    
    printf("[Engine] Game initialized successfully\n");
    printf("[Engine] Canvas: %dx%d tiles, %dx%d pixels\n",
           g_game.map_width, g_game.map_height,
           g_game.map_width * 16, g_game.map_height * 16);
    
    // QUALITY FIX: Proper Emscripten game loop setup
    // 0 = use requestAnimationFrame (optimal for web)
    // fps = 0 (use default 60 FPS)
    // simulate_infinite_loop = 1 (mandatory for Emscripten)
    emscripten_set_main_loop(main_loop_callback, 0, 1);
    
    // This line is unreachable in normal execution, but leave for compilation safety
    game_shutdown();
    return 0;
}

// ============================================================================
// JavaScript Bridge - Exported Functions (called via Module.ccall)
// ============================================================================

extern "C" {
    
    // QUALITY FIX: Wrapper that catches errors and logs them
    EMSCRIPTEN_KEEPALIVE
    void load_level(const char* json_str) {
        if (!json_str) {
            printf("[ERROR] load_level: JSON string is NULL\n");
            return;
        }
        
        printf("[Engine] load_level() called with JSON\n");
        
        auto result = LevelLoader::load_level_from_json(json_str, g_game);
        if (result.error != LevelLoader::ParseError::OK) {
            printf("[ERROR] Failed to load level: %s\n", result.message.c_str());
        } else {
            printf("[Engine] Level loaded successfully: %dx%d\n",
                   g_game.map_width, g_game.map_height);
        }
    }
    
    // Debug function: Get current player position
    EMSCRIPTEN_KEEPALIVE
    const char* get_player_pos() {
        static char buf[64];
        snprintf(buf, sizeof(buf), "Player: (%.1f, %.1f)", g_game.player.x, g_game.player.y);
        return buf;
    }
    
    // Debug function: Get level status
    EMSCRIPTEN_KEEPALIVE
    int is_level_won() {
        return g_game.level_won ? 1 : 0;
    }
}
