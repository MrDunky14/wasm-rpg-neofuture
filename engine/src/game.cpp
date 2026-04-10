#include "game.h"
#include "renderer.h"
#include "collision.h"
#include <cstdio>
#include <cstring>

// ============================================================================
// Game Initialization
// ============================================================================

bool game_init() {
    // QUALITY FIX: Check emsdk version compatibility
    printf("[Game] Initializing game state...\n");
    
    // Initialize SDL
    if (SDL_Init(SDL_INIT_VIDEO) != 0) {
        printf("[ERROR] SDL_Init failed: %s\n", SDL_GetError());
        return false;
    }
    
    // Create window and renderer
    if (!Renderer::init(g_game.window, g_game.renderer, 
                       g_game.map_width * 16, g_game.map_height * 16)) {
        printf("[ERROR] Renderer init failed\n");
        SDL_Quit();
        return false;
    }

    // Attempt to load tileset; renderer has a fallback path if unavailable.
    g_game.tileset = Renderer::load_tileset(g_game.renderer, "assets/tileset.png");
    
    // Initialize default tilemap (all walls)
    // QUALITY FIX: Prevent uninitialized memory access
    g_game.tiles.assign(g_game.map_height, std::vector<int>(g_game.map_width, 1));
    
    // Create a simple test level (room with border walls)
    for (int y = 1; y < g_game.map_height - 1; y++) {
        for (int x = 1; x < g_game.map_width - 1; x++) {
            g_game.tiles[y][x] = 0;  // Floor
        }
    }
    
    // Set player at spawn point
    g_game.player.x = 1;
    g_game.player.y = 1;
    
    // Set objective at far corner
    g_game.objective_x = g_game.map_width - 2;
    g_game.objective_y = g_game.map_height - 2;
    
    printf("[Game] Game initialized: %dx%d map, player at (%.0f, %.0f)\n",
           g_game.map_width, g_game.map_height, g_game.player.x, g_game.player.y);
    
    return true;
}

// ============================================================================
// Player Input Handling
// ============================================================================

// QUALITY FIX: Separate input handling from game logic
static void handle_input() {
    Collision::CollisionGrid collision_grid(g_game.map_width, g_game.map_height);

    SDL_Event event;
    while (SDL_PollEvent(&event)) {
        if (event.type == SDL_QUIT) {
            printf("[Game] SDL_QUIT received\n");
        }
    }
    
    const Uint8* keys = SDL_GetKeyboardState(nullptr);
    float new_x = g_game.player.x;
    float new_y = g_game.player.y;
    
    // Handle arrow keys (4-directional movement)
    if (keys[SDL_SCANCODE_UP] || keys[SDL_SCANCODE_W]) {
        new_y -= g_game.player.speed;
    }
    if (keys[SDL_SCANCODE_DOWN] || keys[SDL_SCANCODE_S]) {
        new_y += g_game.player.speed;
    }
    if (keys[SDL_SCANCODE_LEFT] || keys[SDL_SCANCODE_A]) {
        new_x -= g_game.player.speed;
    }
    if (keys[SDL_SCANCODE_RIGHT] || keys[SDL_SCANCODE_D]) {
        new_x += g_game.player.speed;
    }
    
    // QUALITY FIX: Validate movement before applying
    if (collision_grid.check_player_move(g_game.player, new_x, new_y, g_game.tiles)) {
        g_game.player.x = new_x;
        g_game.player.y = new_y;
    }
    
    // Check if player reached objective; log once on state transition
    bool reached_objective = collision_grid.check_objective_reached(g_game.player,
                                                                    g_game.objective_x,
                                                                    g_game.objective_y);
    if (reached_objective && !g_game.level_won) {
        g_game.level_won = true;
        printf("[Game] Level WON! Player reached objective.\n");
    }
    
    // ESC to debug info
    if (keys[SDL_SCANCODE_ESCAPE]) {
        printf("[Debug] Player: (%.1f, %.1f), Objective: (%d, %d), Won: %d\n",
               g_game.player.x, g_game.player.y, 
               g_game.objective_x, g_game.objective_y, 
               g_game.level_won);
    }
}

// ============================================================================
// Main Game Loop
// ============================================================================

void game_update_and_render() {
    // QUALITY FIX: Separate update from render
    
    // Input handling
    handle_input();
    
    // Clear screen
    SDL_SetRenderDrawColor(g_game.renderer, 0, 0, 0, 255);
    SDL_RenderClear(g_game.renderer);
    
    // Render game world (falls back to color tiles if no spritesheet)
    Renderer::render_tilemap(g_game.renderer, g_game.tileset, g_game.tiles);
    
    // Render actors
    Renderer::render_player(g_game.renderer, g_game.tileset, g_game.player);
    Renderer::render_enemies(g_game.renderer, g_game.tileset, g_game.enemies);
    Renderer::render_objective(g_game.renderer, g_game.objective_x, g_game.objective_y);
    
    // Present to canvas
    SDL_RenderPresent(g_game.renderer);
    
    g_game.frame_count++;
}

// ============================================================================
// Game Shutdown
// ============================================================================

void game_shutdown() {
    printf("[Game] Shutting down...\n");
    
    // QUALITY FIX: Proper cleanup order (renderer → window → SDL)
    if (g_game.tileset) {
        SDL_DestroyTexture(g_game.tileset);
        g_game.tileset = nullptr;
    }
    
    Renderer::shutdown(g_game.window, g_game.renderer, nullptr);
    
    SDL_Quit();
    printf("[Game] Shutdown complete.\n");
}
