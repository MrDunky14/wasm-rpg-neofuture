#ifndef COLLISION_H
#define COLLISION_H

#include <SDL.h>
#include <vector>
#include "game.h"

// ============================================================================
// Collision Detection
// ============================================================================

namespace Collision {

// QUALITY FIX: Optimized with spatial grid (not O(n²))
class CollisionGrid {
public:
    CollisionGrid(int grid_width, int grid_height);
    
    // Check if a point hits a walkable tile
    bool can_walk(float x, float y, const std::vector<std::vector<int>>& tiles) const;
    
    // Check if player can move to new position
    bool check_player_move(const Player& player, float new_x, float new_y,
                          const std::vector<std::vector<int>>& tiles) const;
    
    // AABB collision between two rectangles
    static bool aabb_overlap(const SDL_Rect& a, const SDL_Rect& b);
    
    // Check if player is on the objective
    bool check_objective_reached(const Player& player, int obj_x, int obj_y) const;
    
private:
    int grid_width, grid_height;
};

}  // namespace Collision

#endif  // COLLISION_H
