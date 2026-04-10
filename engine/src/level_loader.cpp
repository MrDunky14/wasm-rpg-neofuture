#include "level_loader.h"
#include <nlohmann/json.hpp>
#include <cstdio>

using json = nlohmann::json;

namespace LevelLoader {

// ============================================================================
// JSON Level Loading with Error Handling
// ============================================================================

ParseResult load_level_from_json(const std::string& json_str, GameState& game) {
    // QUALITY FIX: Comprehensive error handling for JSON parsing
    
    try {
        // Parse JSON
        json level_json = json::parse(json_str);
        
        // Validate required fields
        if (!level_json.contains("width") || !level_json.contains("height")) {
            return {ParseError::MISSING_REQUIRED_FIELD, "Missing 'width' or 'height'"};
        }
        
        if (!level_json.contains("tiles")) {
            return {ParseError::MISSING_REQUIRED_FIELD, "Missing 'tiles' array"};
        }
        
        if (!level_json.contains("player_start")) {
            return {ParseError::MISSING_REQUIRED_FIELD, "Missing 'player_start'"};
        }
        
        if (!level_json.contains("objective")) {
            return {ParseError::MISSING_REQUIRED_FIELD, "Missing 'objective'"};
        }
        
        int width = level_json["width"];
        int height = level_json["height"];
        
        // Validate dimensions
        if (width <= 0 || height <= 0) {
            return {ParseError::EMPTY_LEVEL, "Width and height must be positive"};
        }
        
        // Load tilemap
        auto tiles_array = level_json["tiles"];
        if (!tiles_array.is_array() || tiles_array.size() != height) {
            return {ParseError::INVALID_TILE_ARRAY, "Tiles must be 2D array matching height"};
        }
        
        std::vector<std::vector<int>> tiles;
        tiles.reserve(height);
        
        for (int y = 0; y < height; y++) {
            if (!tiles_array[y].is_array() || tiles_array[y].size() != width) {
                return {ParseError::INVALID_TILE_ARRAY, "Each row must have width tiles"};
            }
            
            std::vector<int> row;
            row.reserve(width);
            
            for (int x = 0; x < width; x++) {
                row.push_back(tiles_array[y][x].get<int>());
            }
            tiles.push_back(row);
        }
        
        // Load player start position
        auto player_start = level_json["player_start"];
        float player_x = player_start["x"];
        float player_y = player_start["y"];
        
        if (player_x < 0 || player_x >= width || player_y < 0 || player_y >= height) {
            return {ParseError::PLAYER_OUT_OF_BOUNDS, "Player spawn outside map bounds"};
        }
        
        // Load objective
        auto objective = level_json["objective"];
        int objective_x = objective["x"];
        int objective_y = objective["y"];
        
        // Load enemies (optional) — EXTENDED: now includes combat stats
        std::vector<Enemy> enemies;
        if (level_json.contains("enemies") && level_json["enemies"].is_array()) {
            for (const auto& enemy_json : level_json["enemies"]) {
                Enemy enemy;
                enemy.x = enemy_json["x"];
                enemy.y = enemy_json["y"];
                enemy.tile_id = enemy_json.value("tile_id", 3);
                
                // QUALITY FIX: Parse combat fields with defaults (for backend compatibility)
                if (enemy_json.contains("type")) {
                    enemy.type = enemy_json["type"].get<std::string>();
                }
                enemy.hp = enemy_json.value("hp", 30);
                enemy.max_hp = enemy.hp;
                enemy.damage = enemy_json.value("damage", 10);
                if (enemy_json.contains("concept_question")) {
                    enemy.concept_question = enemy_json["concept_question"].get<std::string>();
                }
                
                enemies.push_back(enemy);
                printf("[LevelLoader] Enemy '%s' at (%.0f, %.0f): hp=%d dmg=%d\n",
                       enemy.type.c_str(), enemy.x, enemy.y, enemy.hp, enemy.damage);
            }
        }
        
        // Load boss (optional) — NEW: Full boss encounter support
        Boss boss;
        if (level_json.contains("boss") && !level_json["boss"].is_null()) {
            const auto& boss_json = level_json["boss"];
            boss.type = boss_json.value("type", "generic_boss");
            boss.hp = boss_json.value("hp", 100);
            boss.max_hp = boss.hp;
            boss.damage = boss_json.value("damage", 20);
            boss.mechanic_type = boss_json.value("mechanic_type", "unknown");
            boss.damage_per_wrong_answer = boss_json.value("damage_per_wrong_answer", 25);
            
            // Parse question sequence
            if (boss_json.contains("question_sequence") && boss_json["question_sequence"].is_array()) {
                for (const auto& q : boss_json["question_sequence"]) {
                    boss.question_sequence.push_back(q.get<std::string>());
                }
            }
            
            printf("[LevelLoader] Boss '%s': hp=%d dmg=%d mechanic=%s questions=%zu\n",
                   boss.type.c_str(), boss.hp, boss.damage, boss.mechanic_type.c_str(),
                   boss.question_sequence.size());
        }
        
        // QUALITY FIX: Atomic update - all or nothing
        game.map_width = width;
        game.map_height = height;
        game.tiles = tiles;
        game.player.x = player_x;
        game.player.y = player_y;
        game.objective_x = objective_x;
        game.objective_y = objective_y;
        game.enemies = enemies;
        game.boss = boss;
        
        // NEW: Store level metadata
        if (level_json.contains("level_name")) {
            game.level_name = level_json["level_name"].get<std::string>();
        }
        if (level_json.contains("concept")) {
            game.concept = level_json["concept"].get<std::string>();
        }
        game.difficulty = level_json.value("difficulty", 1);
        game.player_hp = game.player_max_hp;  // Reset player health
        game.level_won = false;
        game.boss_room_triggered = false;
        game.frame_count = 0;
        
        printf("[LevelLoader] Level '%s' (concept=%s, difficulty=%d) loaded: %dx%d with %zu enemies\n",
               game.level_name.c_str(), game.concept.c_str(), game.difficulty,
               width, height, enemies.size());
        
        return {ParseError::OK, "Level loaded successfully"};
        
    } catch (const json::exception& e) {
        // QUALITY FIX: Catch JSON parsing errors
        std::string error_msg = std::string("JSON parse error: ") + e.what();
        printf("[ERROR] %s\n", error_msg.c_str());
        return {ParseError::INVALID_JSON, error_msg};
    } catch (const std::exception& e) {
        // Catch any other exceptions
        std::string error_msg = std::string("Unknown error: ") + e.what();
        printf("[ERROR] %s\n", error_msg.c_str());
        return {ParseError::INVALID_JSON, error_msg};
    }
}

bool validate_level_schema(const std::string& json_str) {
    // QUALITY FIX: Quick validation without full load
    try {
        json j = json::parse(json_str);
        return j.contains("width") && j.contains("height") &&
               j.contains("tiles") && j.contains("player_start") &&
               j.contains("objective");
    } catch(...) {
        return false;
    }
}

int get_tile_safe(const std::vector<std::vector<int>>& tiles, int x, int y, int default_tile) {
    // QUALITY FIX: Safe array access with default
    if (y < 0 || y >= (int)tiles.size()) {
        return default_tile;
    }
    if (x < 0 || x >= (int)tiles[y].size()) {
        return default_tile;
    }
    return tiles[y][x];
}

}  // namespace LevelLoader
