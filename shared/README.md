# WASM-RPG: Shared Resources

**This folder contains resources that ALL team members must follow.**

---

## 📋 Shared Contracts

### level_schema.json
**Status:** LOCKED (Do not modify without team consensus)

This is the JSON contract between:
- **M2 (Backend):** Generates level JSON matching this schema
- **M3 (Engine):** Parses JSON and renders the level

All levels MUST conform to this schema, or the pipeline breaks.

**Key Fields:**
- `width`, `height` — Map dimensions
- `tiles` — 2D array of tile IDs
- `player_start` — Player spawn position
- `objective` — Goal position
- `enemies` — (Optional) Enemy list

See `level_schema.json` for full specification and examples.

---

## 🎯 How to Use

### For M2 (Backend):
```python
import json

# When generating a level, ensure it matches the schema
level = {
    "level_name": "Stack Surge",
    "concept": "stack",
    "width": 12,
    "height": 10,
    "tiles": [ ... ],  # 2D array, height × width
    "player_start": {"x": 1, "y": 1},
    "objective": {"x": 5, "y": 8}
}

# Validate before returning
with open('../shared/level_schema.json') as f:
    schema = json.load(f)
    # Use jsonschema to validate...
```

### For M3 (Engine):
```cpp
// Parse JSON and populate GameState
auto result = LevelLoader::load_level_from_json(json_str, g_game);

// Result will contain errors if schema mismatches
if (result.error != ParseError::OK) {
    printf("Schema error: %s\n", result.message.c_str());
}
```

### For M1 (Frontend):
```javascript
// Generate level from API
const levelJson = await axios.get('/api/level/generate');

// Pass to WASM (schema handled by M2 + M3)
Module.ccall('load_level', null, ['string'], [JSON.stringify(levelJson)]);
```

---

## ⚠️ Modification Protocol

If someone needs to change the schema:

1. **Propose** the change (Slack/Discord)
2. **All 3 members** discuss
3. **Update** `level_schema.json`
4. **Notify** the other two members
5. **Update** generating code (M2) + parsing code (M3)

**Avoid mid-project schema changes.** They cause integration nightmares.

---

## 🧪 Pre-Generated Test Levels

### Stack Level
```json
{
  "level_name": "Stack Surge",
  "concept": "stack",
  "width": 12,
  "height": 10,
  ...
}
```

(See `level_schema.json` examples for full JSON)

---

**Last Updated:** April 10, 2026  
**Owner:** All Three Members
