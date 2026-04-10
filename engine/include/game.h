#ifndef GAME_H
#define GAME_H

#include <SDL.h>
#include <vector>
#include <string>

// ============================================================================
// Game State & Configuration
// ============================================================================

struct Player {
    float x, y;                // Position in tiles
    int width = 16, height = 16;  // Size in pixels
    float speed = 0.1f;        // Tiles per frame
    bool moving = false;       // Current movement state
    
    SDL_Rect get_rect() const {
        return {(int)(x * 16), (int)(y * 16), width, height};
    }
};

struct Enemy {
    float x, y;
    int width = 16, height = 16;
    int tile_id = 3;           // Tile index in spritesheet
    
    // Combat fields (from backend JSON)
    std::string type;          // e.g. "push_sentinel", "queue_serpent"
    int hp = 30;               // Current health
    int max_hp = 30;           // Maximum health
    int damage = 10;           // Damage per hit to player
    std::string concept_question;  // Quiz Q for defeating this enemy
    
    SDL_Rect get_rect() const {
        return {(int)(x * 16), (int)(y * 16), width, height};
    }
};

struct Boss {
    float x = -1, y = -1;      // Position on map (-1 = not spawned)
    std::string type;          // e.g. "stack_overlord"
    int hp = 100;
    int max_hp = 100;
    int damage = 20;           // Damage per hit to player
    std::string mechanic_type; // e.g. "stack_push_pop"
    std::vector<std::string> question_sequence;  // Multi-part questions
    int damage_per_wrong_answer = 25;
    int current_question_index = 0;
    bool is_defeated = false;
    bool is_active = false;    // In combat?
    
    SDL_Rect get_rect() const {
        return {(int)(x * 16), (int)(y * 16), 16, 16};
    }
};

struct GameState {
    // Rendering
    SDL_Window* window = nullptr;
    SDL_Renderer* renderer = nullptr;
    SDL_Texture* tileset = nullptr;
    
    // Game world
    int map_width = 20;
    int map_height = 15;
    std::vector<std::vector<int>> tiles;  // Tile IDs
    
    // Actors
    Player player;
    int player_hp = 100;       // ← NEW: Player health (from combat/traps)
    int player_max_hp = 100;
    std::vector<Enemy> enemies;
    Boss boss;                 // ← NEW: Boss encounter (optional)
    
    // Level metadata
    std::string level_name;
    std::string concept;       // ← NEW: Educational topic
    int difficulty = 1;        // ← NEW: 1=Easy, 2=Medium, 3=Hard
    int objective_x = -1;
    int objective_y = -1;
    bool level_won = false;
    bool boss_room_triggered = false;  // ← NEW: Boss encounter started?
    
    // FPS tracking
    int frame_count = 0;
    float delta_time = 0.016f;  // ~60 FPS
};

// ============================================================================
// Game Functions (called from main.cpp)
// ============================================================================

extern GameState g_game;

// Initialize game (called once at startup)
bool game_init();

// Main game loop (called 60 times per second)
void game_update_and_render();

// Cleanup (called on exit)
void game_shutdown();

// Load level from JSON string (called from JavaScript via ccall)
extern "C" {
    void load_level(const char* json_str);
}

#endif  // GAME_H
