#ifndef LEVEL_LOADER_H
#define LEVEL_LOADER_H

#include <string>
#include <vector>
#include "game.h"

// ============================================================================
// JSON Level Loading
// ============================================================================

namespace LevelLoader {

// QUALITY FIX: Structured error handling for JSON parsing
enum class ParseError {
    OK = 0,
    INVALID_JSON,           // JSON syntax error
    MISSING_REQUIRED_FIELD, // width, height, tiles, player_start, objective
    INVALID_TILE_ARRAY,     // tiles not 2D array
    EMPTY_LEVEL,            // width or height is 0
    PLAYER_OUT_OF_BOUNDS,   // player_start outside map
};

struct ParseResult {
    ParseError error;
    std::string message;
};

// Load level from JSON string
// QUALITY FIX: Returns error info instead of crashing
ParseResult load_level_from_json(const std::string& json_str, GameState& game);

// Helper: Validate JSON structure
bool validate_level_schema(const std::string& json_str);

// Helper: Safe tile access
int get_tile_safe(const std::vector<std::vector<int>>& tiles, int x, int y, int default_tile = 1);

}  // namespace LevelLoader

#endif  // LEVEL_LOADER_H
