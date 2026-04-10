#include "collision.h"
#include "renderer.h"
#include <cstdio>
#include <cmath>

namespace Collision {

// ============================================================================
// Collision Grid Implementation
// ============================================================================

CollisionGrid::CollisionGrid(int grid_width, int grid_height)
    : grid_width(grid_width), grid_height(grid_height) {}

bool CollisionGrid::can_walk(float x, float y, const std::vector<std::vector<int>>& tiles) const {
    // QUALITY FIX: Bounds checking to prevent segfault
    
    // Convert tile coordinates to grid index
    int tile_x = static_cast<int>(x);
    int tile_y = static_cast<int>(y);
    
    // Out of bounds = wall
    if (tile_x < 0 || tile_x >= grid_width || tile_y < 0 || tile_y >= grid_height) {
        return false;
    }
    
    // Check if empty
    if (tiles.empty() || tile_y >= (int)tiles.size()) {
        return false;
    }
    if (tile_x >= (int)tiles[tile_y].size()) {
        return false;
    }
    
    int tile_id = tiles[tile_y][tile_x];
    return Renderer::is_walkable(tile_id);
}

bool CollisionGrid::check_player_move(const Player& player, float new_x, float new_y,
                                     const std::vector<std::vector<int>>& tiles) const {
    // QUALITY FIX: Check all 4 corners of player sprite to prevent clipping
    
    float x0 = new_x;
    float y0 = new_y;
    float x1 = new_x + (player.width / 16.0f) - 0.1f;  // Slight margin
    float y1 = new_y + (player.height / 16.0f) - 0.1f;
    
    // All corners must be walkable
    return can_walk(x0, y0, tiles) &&
           can_walk(x1, y0, tiles) &&
           can_walk(x0, y1, tiles) &&
           can_walk(x1, y1, tiles);
}

bool CollisionGrid::aabb_overlap(const SDL_Rect& a, const SDL_Rect& b) {
    // Standard AABB collision formula
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
}

bool CollisionGrid::check_objective_reached(const Player& player, int obj_x, int obj_y) const {
    // QUALITY FIX: Player within 1.5 tiles of objective = reached
    float dist_x = fabs(player.x - obj_x);
    float dist_y = fabs(player.y - obj_y);
    
    return dist_x < 1.0f && dist_y < 1.0f;
}

}  // namespace Collision
