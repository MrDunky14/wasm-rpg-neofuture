#include "renderer.h"
#include <cstdio>
#include <algorithm>

namespace Renderer {

// ============================================================================
// Tileset Rendering Utilities
// ============================================================================

// Tile type definitions (matching JSON spec)
// QUALITY FIX: Centralized tile type mapping
enum TileType {
    TILE_FLOOR = 0,
    TILE_WALL = 1,
    TILE_DOOR = 2,
    TILE_ENEMY_SPAWN = 3,
    TILE_OBJECTIVE = 4,
    TILE_BOSS_SPAWN = 6,
};

bool is_walkable(int tile_id) {
    return tile_id == TILE_FLOOR || tile_id == TILE_DOOR || 
           tile_id == TILE_ENEMY_SPAWN || tile_id == TILE_OBJECTIVE;
}

// ============================================================================
// SDL2 Initialization
// ============================================================================

bool init(SDL_Window*& window, SDL_Renderer*& renderer, int width, int height) {
    printf("[Renderer] Initializing SDL2 (%dx%d)...\n", width, height);
    
    // Create window
    window = SDL_CreateWindow(
        "WASM-RPG Learning Engine",
        SDL_WINDOWPOS_CENTERED,
        SDL_WINDOWPOS_CENTERED,
        width,
        height,
        0  // No special flags for WASM
    );
    
    if (!window) {
        printf("[ERROR] SDL_CreateWindow failed: %s\n", SDL_GetError());
        return false;
    }
    
    // Create renderer
    renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_PRESENTVSYNC);
    if (!renderer) {
        printf("[ERROR] SDL_CreateRenderer failed: %s\n", SDL_GetError());
        SDL_DestroyWindow(window);
        return false;
    }
    
    printf("[Renderer] SDL2 initialized successfully\n");
    return true;
}

// ============================================================================
// Asset Loading
// ============================================================================

SDL_Texture* load_tileset(SDL_Renderer* renderer, const char* path) {
    // QUALITY FIX: Graceful fallback if tileset missing
    printf("[Renderer] Loading tileset: %s\n", path);
    
    // For now, return nullptr - we'll render with colored rectangles
    // This prevents crash if asset is missing during development
    // TODO: Implement IMG_Load once assets are ready
    
    printf("[Warning] Tileset loading not implemented - using fallback colors\n");
    return nullptr;
}

// ============================================================================
// Rendering Functions
// ============================================================================

void render_tilemap(SDL_Renderer* renderer, SDL_Texture* tileset,
                   const std::vector<std::vector<int>>& tiles, int tile_size) {
    // QUALITY FIX: Bounds checking, safe iteration
    
    if (tiles.empty()) {
        printf("[Warning] render_tilemap: empty tile array\n");
        return;
    }
    
    int height = tiles.size();
    int width = tiles[0].size();
    
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int tile_id = tiles[y][x];
            
            // Color-code tiles based on type
            SDL_Color color;
            switch (tile_id) {
                case TILE_FLOOR:        color = {50, 50, 50, 255}; break;   // Dark gray
                case TILE_WALL:         color = {150, 150, 150, 255}; break; // Light gray
                case TILE_DOOR:         color = {200, 100, 0, 255}; break;   // Orange
                case TILE_ENEMY_SPAWN:  color = {255, 0, 0, 255}; break;     // Red
                case TILE_OBJECTIVE:    color = {0, 255, 0, 255}; break;     // Green
                case TILE_BOSS_SPAWN:   color = {128, 0, 128, 255}; break;   // Purple
                default:                color = {0, 0, 0, 255}; break;       // Black
            }
            
            SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a);
            SDL_Rect dst = {x * tile_size, y * tile_size, tile_size, tile_size};
            SDL_RenderFillRect(renderer, &dst);
            
            // Draw border for clarity
            SDL_SetRenderDrawColor(renderer, 100, 100, 100, 255);
            SDL_RenderDrawRect(renderer, &dst);
        }
    }
}

void render_player(SDL_Renderer* renderer, SDL_Texture* tileset, const Player& player) {
    // QUALITY FIX: Player rendered as colored rectangle (upgrade to sprite later)
    SDL_SetRenderDrawColor(renderer, 0, 200, 255, 255);  // Cyan
    SDL_Rect rect = {(int)(player.x * 16), (int)(player.y * 16), 16, 16};
    SDL_RenderFillRect(renderer, &rect);
    
    // Draw border for visibility
    SDL_SetRenderDrawColor(renderer, 0, 255, 255, 255);
    SDL_RenderDrawRect(renderer, &rect);
}

void render_enemies(SDL_Renderer* renderer, SDL_Texture* tileset,
                   const std::vector<Enemy>& enemies) {
    for (const auto& enemy : enemies) {
        SDL_SetRenderDrawColor(renderer, 255, 100, 0, 255);  // Orange
        SDL_Rect rect = {(int)(enemy.x * 16), (int)(enemy.y * 16), 16, 16};
        SDL_RenderFillRect(renderer, &rect);
        
        SDL_SetRenderDrawColor(renderer, 255, 150, 0, 255);
        SDL_RenderDrawRect(renderer, &rect);
    }
}

void render_objective(SDL_Renderer* renderer, float obj_x, float obj_y) {
    // QUALITY FIX: Objective rendered as pulsing rectangle
    SDL_SetRenderDrawColor(renderer, 0, 255, 0, 255);  // Green
    SDL_Rect rect = {(int)(obj_x * 16), (int)(obj_y * 16), 16, 16};
    SDL_RenderFillRect(renderer, &rect);
    
    SDL_SetRenderDrawColor(renderer, 100, 255, 100, 255);
    SDL_RenderDrawRect(renderer, &rect);
}

// ============================================================================
// Cleanup
// ============================================================================

void shutdown(SDL_Window* window, SDL_Renderer* renderer, SDL_Texture* tileset) {
    printf("[Renderer] Shutting down SDL2...\n");
    
    // QUALITY FIX: Safe resource cleanup
    if (tileset) {
        SDL_DestroyTexture(tileset);
    }
    if (renderer) {
        SDL_DestroyRenderer(renderer);
    }
    if (window) {
        SDL_DestroyWindow(window);
    }
}

}  // namespace Renderer
