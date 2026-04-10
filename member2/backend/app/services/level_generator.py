"""
Level generator service.

Takes a list of failed topics from the quiz and produces a complete
LevelPayload JSON that the C++ WASM engine consumes to build a dungeon.

Design decisions:
  - Each topic maps to a unique dungeon theme (name, tileset palette, enemies)
  - Difficulty scales enemy HP / boss damage
  - Dungeon layout uses a simple template-based approach (not full procgen)
    to keep it reliable for the hackathon MVP
  - Boss encounters embed concept-specific questions
"""

from __future__ import annotations

import random
from typing import Any

from app.models.schemas import (
    BossData,
    ConceptTopic,
    Difficulty,
    EnemyData,
    LevelPayload,
    ObjectiveData,
    Position,
)


# ── Topic → Dungeon theme mapping ────────────────────────────────────────

TOPIC_THEMES: dict[ConceptTopic, dict[str, Any]] = {
    ConceptTopic.STACK: {
        "name": "The Tower of LIFO",
        "enemy_type": "stack_golem",
        "boss_type": "stack_overlord",
        "boss_mechanic": "stack_push_pop",
        "boss_questions": [
            "Push 5, Push 3, Pop → What was popped?",
            "Push A, Push B, Push C, Pop, Pop → What remains?",
            "What does peek() do on a stack?",
        ],
    },
    ConceptTopic.QUEUE: {
        "name": "The Queue Caverns",
        "enemy_type": "queue_serpent",
        "boss_type": "queue_warden",
        "boss_mechanic": "queue_enqueue_dequeue",
        "boss_questions": [
            "Enqueue 1, Enqueue 2, Dequeue → What was removed?",
            "Which end do you enqueue at?",
            "Name a real-world example of a queue.",
        ],
    },
    ConceptTopic.SORTING: {
        "name": "The Unsorted Abyss",
        "enemy_type": "chaos_sorter",
        "boss_type": "sort_master",
        "boss_mechanic": "sorting_sequence",
        "boss_questions": [
            "Sort [5, 2, 8, 1] in ascending order.",
            "What is the worst-case complexity of Bubble Sort?",
            "Is MergeSort a stable sort?",
        ],
    },
    ConceptTopic.BINARY_SEARCH: {
        "name": "The Bifurcation Maze",
        "enemy_type": "search_phantom",
        "boss_type": "binary_sentinel",
        "boss_mechanic": "binary_search_steps",
        "boss_questions": [
            "In [1,3,5,7,9], to find 7, what is the first mid?",
            "Binary Search requires the data to be ___?",
            "What is the time complexity of Binary Search?",
        ],
    },
    ConceptTopic.RECURSION: {
        "name": "The Infinite Descent",
        "enemy_type": "recursive_shade",
        "boss_type": "recursion_hydra",
        "boss_mechanic": "recursion_base_case",
        "boss_questions": [
            "What stops a recursive function from running forever?",
            "What is factorial(4)?",
            "Recursion uses which data structure internally?",
        ],
    },
    ConceptTopic.LINKED_LIST: {
        "name": "The Chain Dungeon",
        "enemy_type": "node_crawler",
        "boss_type": "list_leviathan",
        "boss_mechanic": "linked_list_ops",
        "boss_questions": [
            "What does each node in a singly linked list contain?",
            "How do you delete the head of a linked list?",
            "What is the time to access the nth element?",
        ],
    },
    ConceptTopic.GRAPH_TRAVERSAL: {
        "name": "The Interconnected Labyrinth",
        "enemy_type": "graph_wraith",
        "boss_type": "graph_colossus",
        "boss_mechanic": "graph_bfs_dfs",
        "boss_questions": [
            "BFS uses a ___ data structure.",
            "DFS uses a ___ data structure.",
            "Which algorithm finds shortest path in unweighted graph?",
        ],
    },
    ConceptTopic.MATH_ALGEBRA: {
        "name": "The Equation Fortress",
        "enemy_type": "algebra_imp",
        "boss_type": "equation_titan",
        "boss_mechanic": "solve_equation",
        "boss_questions": [
            "Solve: 3x - 9 = 0",
            "What is 2^4?",
            "Simplify: (x+2)(x-2)",
        ],
    },
}


# ── Dungeon templates (tile layouts) ─────────────────────────────────────

def _generate_dungeon_tiles(
    width: int, height: int, num_enemies: int, seed: int | None = None
) -> tuple[list[list[int]], list[tuple[int, int]], tuple[int, int], tuple[int, int]]:
    """
    Generate a simple dungeon layout.

    Returns: (tiles, enemy_positions, objective_position, player_start)

    Tile codes:
      0 = floor, 1 = wall, 2 = door, 3 = enemy_spawn, 4 = objective
    """
    rng = random.Random(seed)

    # Start with all walls
    tiles = [[1] * width for _ in range(height)]

    # Carve out rooms using a simple room-based approach
    rooms: list[tuple[int, int, int, int]] = []  # (x, y, w, h)

    # Room 1: Start room (top-left area)
    r1 = (1, 1, width // 3, height // 3)
    rooms.append(r1)

    # Room 2: Middle room
    mid_x = width // 3 + 2
    mid_y = height // 3 + 2
    r2 = (mid_x, mid_y, width // 3, height // 3)
    rooms.append(r2)

    # Room 3: Boss room (bottom-right area)
    r3_x = 2 * width // 3 + 1
    r3_y = 2 * height // 3 + 1
    r3_w = max(min(width // 3 - 1, width - r3_x - 1), 2)
    r3_h = max(min(height // 3 - 1, height - r3_y - 1), 2)
    r3 = (r3_x, r3_y, r3_w, r3_h)
    rooms.append(r3)

    # Carve rooms into floor
    for rx, ry, rw, rh in rooms:
        for dy in range(rh):
            for dx in range(rw):
                ny, nx = ry + dy, rx + dx
                if 0 < nx < width - 1 and 0 < ny < height - 1:
                    tiles[ny][nx] = 0

    # Carve corridors between rooms
    for i in range(len(rooms) - 1):
        x1 = rooms[i][0] + rooms[i][2] // 2
        y1 = rooms[i][1] + rooms[i][3] // 2
        x2 = rooms[i + 1][0] + rooms[i + 1][2] // 2
        y2 = rooms[i + 1][1] + rooms[i + 1][3] // 2

        # Horizontal then vertical corridor
        cx = x1
        while cx != x2:
            if 0 < cx < width - 1 and 0 < y1 < height - 1:
                tiles[y1][cx] = 0
            cx += 1 if x2 > x1 else -1
        if 0 < cx < width - 1 and 0 < y1 < height - 1:
            tiles[y1][cx] = 0

        cy = y1
        while cy != y2:
            if 0 < x2 < width - 1 and 0 < cy < height - 1:
                tiles[cy][x2] = 0
            cy += 1 if y2 > y1 else -1
        if 0 < x2 < width - 1 and 0 < cy < height - 1:
            tiles[cy][x2] = 0

    # Place doors at corridor entrances (between rooms)
    for i in range(len(rooms) - 1):
        x1 = rooms[i][0] + rooms[i][2] // 2
        y1 = rooms[i][1] + rooms[i][3] // 2
        x2 = rooms[i + 1][0] + rooms[i + 1][2] // 2
        door_x = (x1 + x2) // 2
        door_y = y1
        if 0 < door_x < width - 1 and 0 < door_y < height - 1:
            tiles[door_y][door_x] = 2

    # Determine player start position from center of start room
    start_x = r1[0] + r1[2] // 2
    start_y = r1[1] + r1[3] // 2
    start_x = max(1, min(start_x, width - 2))
    start_y = max(1, min(start_y, height - 2))
    # Ensure player starts on a floor tile
    if tiles[start_y][start_x] != 0:
        # Fallback: find nearest floor tile in start room
        for dy in range(r1[3]):
            for dx in range(r1[2]):
                ny, nx = r1[1] + dy, r1[0] + dx
                if 0 < nx < width - 1 and 0 < ny < height - 1 and tiles[ny][nx] == 0:
                    start_x, start_y = nx, ny
                    break
            else:
                continue
            break

    # Place enemies in the middle room
    enemy_positions: list[tuple[int, int]] = []
    floor_cells_room2 = []
    for dy in range(r2[3]):
        for dx in range(r2[2]):
            ny, nx = r2[1] + dy, r2[0] + dx
            if 0 < nx < width - 1 and 0 < ny < height - 1 and tiles[ny][nx] == 0:
                floor_cells_room2.append((nx, ny))

    if floor_cells_room2:
        chosen = rng.sample(floor_cells_room2, min(num_enemies, len(floor_cells_room2)))
        for ex, ey in chosen:
            tiles[ey][ex] = 3
            enemy_positions.append((ex, ey))

    # Place objective in boss room — ensure it's on a floor tile
    obj_x = r3[0] + r3[2] // 2
    obj_y = r3[1] + r3[3] // 2
    obj_x = max(1, min(obj_x, width - 2))
    obj_y = max(1, min(obj_y, height - 2))
    if tiles[obj_y][obj_x] != 0:
        # Fallback: scan boss room for any floor tile
        for dy in range(r3[3]):
            for dx in range(r3[2]):
                ny, nx = r3[1] + dy, r3[0] + dx
                if 0 < nx < width - 1 and 0 < ny < height - 1 and tiles[ny][nx] == 0:
                    obj_x, obj_y = nx, ny
                    break
            else:
                continue
            break
    tiles[obj_y][obj_x] = 4

    return tiles, enemy_positions, (obj_x, obj_y), (start_x, start_y)


# ── Difficulty scaling ───────────────────────────────────────────────────

DIFFICULTY_SCALE = {
    Difficulty.EASY:   {"enemy_hp": 20, "enemy_dmg": 5,  "boss_hp": 60,  "boss_dmg": 10, "num_enemies": 2},
    Difficulty.MEDIUM: {"enemy_hp": 35, "enemy_dmg": 10, "boss_hp": 100, "boss_dmg": 20, "num_enemies": 3},
    Difficulty.HARD:   {"enemy_hp": 50, "enemy_dmg": 15, "boss_hp": 150, "boss_dmg": 30, "num_enemies": 5},
}


# ── Public API ───────────────────────────────────────────────────────────

def generate_level(
    topic: ConceptTopic,
    difficulty: Difficulty = Difficulty.MEDIUM,
    width: int = 20,
    height: int = 15,
    seed: int | None = None,
) -> LevelPayload:
    """
    Generate a complete dungeon level for the given topic and difficulty.

    Returns a LevelPayload that can be serialized to JSON and sent to
    the C++ WASM engine via ccall('load_level', ...).
    """
    theme = TOPIC_THEMES[topic]
    scale = DIFFICULTY_SCALE[difficulty]

    tiles, enemy_positions, (obj_x, obj_y), (start_x, start_y) = _generate_dungeon_tiles(
        width, height, num_enemies=scale["num_enemies"], seed=seed
    )

    # Build enemy list
    enemies = []
    for i, (ex, ey) in enumerate(enemy_positions):
        enemies.append(
            EnemyData(
                type=theme["enemy_type"],
                x=ex,
                y=ey,
                hp=scale["enemy_hp"],
                damage=scale["enemy_dmg"],
                concept_question=theme["boss_questions"][i % len(theme["boss_questions"])],
            )
        )

    # Build boss
    boss = BossData(
        type=theme["boss_type"],
        hp=scale["boss_hp"],
        damage=scale["boss_dmg"],
        mechanic_type=theme["boss_mechanic"],
        question_sequence=theme["boss_questions"],
        damage_per_wrong_answer=scale["boss_dmg"],
    )

    return LevelPayload(
        level_name=theme["name"],
        concept=topic,
        difficulty=difficulty,
        width=width,
        height=height,
        tiles=tiles,
        player_start=Position(x=start_x, y=start_y),
        objective=ObjectiveData(x=obj_x, y=obj_y, type="reach_exit"),
        enemies=enemies,
        boss=boss,
    )


def generate_levels_for_failures(
    failed_topics: list[ConceptTopic],
    difficulty: Difficulty = Difficulty.MEDIUM,
) -> list[LevelPayload]:
    """Generate one dungeon level per failed topic."""
    return [generate_level(topic, difficulty) for topic in failed_topics]
