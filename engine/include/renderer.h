#ifndef RENDERER_H
#define RENDERER_H

#include <SDL.h>
#include "game.h"

// ============================================================================
// Rendering Functions
// ============================================================================

namespace Renderer {
    
// Initialize SDL2 and create window/renderer
bool init(SDL_Window*& window, SDL_Renderer*& renderer, int width, int height);

// Load tileset texture from disk
SDL_Texture* load_tileset(SDL_Renderer* renderer, const char* path);

// Render the tilemap
void render_tilemap(SDL_Renderer* renderer, SDL_Texture* tileset,
                   const std::vector<std::vector<int>>& tiles,
                   int tile_size = 16);

// Render player sprite
void render_player(SDL_Renderer* renderer, SDL_Texture* tileset, const Player& player);

// Render enemies
void render_enemies(SDL_Renderer* renderer, SDL_Texture* tileset,
                   const std::vector<Enemy>& enemies);

// Render objective marker (hardcoded as colored rectangle)
void render_objective(SDL_Renderer* renderer, float obj_x, float obj_y);

// Check if tile is a wall (non-walkable)
// QUALITY FIX: Centralized tile type checking
bool is_walkable(int tile_id);

// Cleanup SDL resources
void shutdown(SDL_Window* window, SDL_Renderer* renderer, SDL_Texture* tileset);

}  // namespace Renderer

#endif  // RENDERER_H
