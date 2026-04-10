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

from collections import deque
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


# ── Procedural dungeon generation ────────────────────────────────────────

FLOOR = 0
WALL = 1
DOOR = 2
ENEMY_SPAWN = 3
OBJECTIVE = 4

Room = tuple[int, int, int, int]  # (x, y, width, height)
Point = tuple[int, int]            # (x, y)


def _is_interior(x: int, y: int, width: int, height: int) -> bool:
    return 0 < x < width - 1 and 0 < y < height - 1


def _is_walkable(tile: int) -> bool:
    return tile in (FLOOR, DOOR, ENEMY_SPAWN, OBJECTIVE)


def _room_center(room: Room) -> Point:
    rx, ry, rw, rh = room
    return rx + (rw // 2), ry + (rh // 2)


def _rooms_overlap(a: Room, b: Room, padding: int = 1) -> bool:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    return not (
        ax + aw + padding <= bx
        or bx + bw + padding <= ax
        or ay + ah + padding <= by
        or by + bh + padding <= ay
    )


def _carve_room(tiles: list[list[int]], room: Room) -> None:
    width = len(tiles[0])
    height = len(tiles)
    rx, ry, rw, rh = room
    for y in range(ry, ry + rh):
        for x in range(rx, rx + rw):
            if _is_interior(x, y, width, height):
                tiles[y][x] = FLOOR


def _carve_corridor(
    tiles: list[list[int]],
    start: Point,
    end: Point,
    horizontal_first: bool,
) -> list[Point]:
    width = len(tiles[0])
    height = len(tiles)

    x, y = start
    tx, ty = end
    carved: list[Point] = []

    def carve(px: int, py: int) -> None:
        if _is_interior(px, py, width, height):
            if tiles[py][px] == WALL:
                tiles[py][px] = FLOOR
            carved.append((px, py))

    carve(x, y)

    if horizontal_first:
        while x != tx:
            x += 1 if tx > x else -1
            carve(x, y)
        while y != ty:
            y += 1 if ty > y else -1
            carve(x, y)
    else:
        while y != ty:
            y += 1 if ty > y else -1
            carve(x, y)
        while x != tx:
            x += 1 if tx > x else -1
            carve(x, y)

    return carved


def _distance_grid(tiles: list[list[int]], start: Point) -> list[list[int]]:
    width = len(tiles[0])
    height = len(tiles)
    dist = [[-1] * width for _ in range(height)]
    sx, sy = start

    if not _is_interior(sx, sy, width, height) or not _is_walkable(tiles[sy][sx]):
        return dist

    queue = deque([(sx, sy)])
    dist[sy][sx] = 0

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if not _is_interior(nx, ny, width, height):
                continue
            if dist[ny][nx] != -1:
                continue
            if not _is_walkable(tiles[ny][nx]):
                continue
            dist[ny][nx] = dist[y][x] + 1
            queue.append((nx, ny))

    return dist


def _layout_is_valid(
    tiles: list[list[int]],
    enemy_positions: list[Point],
    objective: Point,
    start: Point,
) -> bool:
    width = len(tiles[0])
    height = len(tiles)
    sx, sy = start
    ox, oy = objective

    if not _is_interior(sx, sy, width, height) or not _is_walkable(tiles[sy][sx]):
        return False
    if not _is_interior(ox, oy, width, height) or tiles[oy][ox] != OBJECTIVE:
        return False

    dist = _distance_grid(tiles, start)
    if dist[oy][ox] == -1:
        return False

    for ex, ey in enemy_positions:
        if not _is_interior(ex, ey, width, height):
            return False
        if tiles[ey][ex] != ENEMY_SPAWN:
            return False
        if dist[ey][ex] == -1:
            return False

    return True


def _generate_fallback_dungeon(
    width: int,
    height: int,
    num_enemies: int,
    seed: int | None,
) -> tuple[list[list[int]], list[Point], Point, Point]:
    """Guaranteed-valid open layout used if procedural attempts fail."""
    rng = random.Random(seed)
    tiles = [[WALL] * width for _ in range(height)]

    for y in range(1, height - 1):
        for x in range(1, width - 1):
            tiles[y][x] = FLOOR

    start = (2, 2)
    objective = (width - 3, height - 3)

    enemy_pool = []
    for y in range(1, height - 1):
        for x in range(1, width - 1):
            if (x, y) in (start, objective):
                continue
            if abs(x - start[0]) + abs(y - start[1]) < 4:
                continue
            if abs(x - objective[0]) + abs(y - objective[1]) < 3:
                continue
            enemy_pool.append((x, y))

    rng.shuffle(enemy_pool)
    enemy_positions = enemy_pool[: min(num_enemies, len(enemy_pool))]
    for ex, ey in enemy_positions:
        tiles[ey][ex] = ENEMY_SPAWN

    ox, oy = objective
    tiles[oy][ox] = OBJECTIVE
    return tiles, list(enemy_positions), objective, start


def _generate_dungeon_tiles(
    width: int, height: int, num_enemies: int, seed: int | None = None
) -> tuple[list[list[int]], list[Point], Point, Point]:
    """
    Generate a room-graph dungeon layout with guaranteed connectivity.

    Returns: (tiles, enemy_positions, objective_position, player_start)

    Tile codes:
      0 = floor, 1 = wall, 2 = door, 3 = enemy_spawn, 4 = objective
    """
    base_seed = seed if seed is not None else random.randrange(1, 10_000_000)

    for attempt in range(8):
        rng = random.Random(base_seed + attempt * 9973)
        tiles = [[WALL] * width for _ in range(height)]

        target_rooms = max(4, min(9, (width * height) // 70))
        room_attempts = target_rooms * 14

        min_rw = 4
        max_rw = max(min_rw, min(width // 3, 10))
        min_rh = 4
        max_rh = max(min_rh, min(height // 3, 8))

        rooms: list[Room] = []
        for _ in range(room_attempts):
            rw = rng.randint(min_rw, max_rw)
            rh = rng.randint(min_rh, max_rh)

            if rw >= width - 2 or rh >= height - 2:
                continue

            rx = rng.randint(1, width - rw - 1)
            ry = rng.randint(1, height - rh - 1)
            candidate = (rx, ry, rw, rh)

            if any(_rooms_overlap(candidate, existing, padding=1) for existing in rooms):
                continue

            rooms.append(candidate)
            if len(rooms) >= target_rooms:
                break

        if len(rooms) < 3:
            continue

        for room in rooms:
            _carve_room(tiles, room)

        centers = [_room_center(room) for room in rooms]

        connected = {0}
        links: list[tuple[int, int]] = []

        # Build a sparse backbone so every room is reachable.
        while len(connected) < len(rooms):
            best: tuple[int, int, int] | None = None
            for i in connected:
                cx, cy = centers[i]
                for j in range(len(rooms)):
                    if j in connected:
                        continue
                    tx, ty = centers[j]
                    dist = abs(cx - tx) + abs(cy - ty)
                    if best is None or dist < best[0]:
                        best = (dist, i, j)

            if best is None:
                break

            _, src, dst = best
            links.append((src, dst))
            connected.add(dst)

        if len(connected) != len(rooms):
            continue

        existing_pairs = {tuple(sorted(link)) for link in links}
        pair_pool = [(i, j) for i in range(len(rooms)) for j in range(i + 1, len(rooms))]
        rng.shuffle(pair_pool)
        extra_links = max(1, len(rooms) // 4)
        added = 0
        for pair in pair_pool:
            if pair in existing_pairs:
                continue
            if rng.random() > 0.28:
                continue
            links.append(pair)
            existing_pairs.add(pair)
            added += 1
            if added >= extra_links:
                break

        for src, dst in links:
            corridor = _carve_corridor(
                tiles,
                centers[src],
                centers[dst],
                horizontal_first=(rng.random() < 0.5),
            )

            if len(corridor) > 4 and rng.random() < 0.7:
                door_idx = max(1, min(len(corridor) - 2, len(corridor) // 2))
                dx, dy = corridor[door_idx]
                if tiles[dy][dx] == FLOOR:
                    tiles[dy][dx] = DOOR

        start_room_idx = min(range(len(rooms)), key=lambda i: centers[i][0] + centers[i][1])
        start_room = rooms[start_room_idx]
        start_candidates = [
            (x, y)
            for y in range(start_room[1], start_room[1] + start_room[3])
            for x in range(start_room[0], start_room[0] + start_room[2])
            if _is_interior(x, y, width, height) and tiles[y][x] in (FLOOR, DOOR)
        ]
        if not start_candidates:
            continue

        start_x, start_y = rng.choice(start_candidates)
        if tiles[start_y][start_x] == DOOR:
            tiles[start_y][start_x] = FLOOR

        distances = _distance_grid(tiles, (start_x, start_y))

        room_distance_order = sorted(
            range(len(rooms)),
            key=lambda i: abs(centers[i][0] - centers[start_room_idx][0])
            + abs(centers[i][1] - centers[start_room_idx][1]),
            reverse=True,
        )
        objective_room_idx = next((idx for idx in room_distance_order if idx != start_room_idx), start_room_idx)
        objective_room = rooms[objective_room_idx]

        objective_candidates = [
            (x, y)
            for y in range(objective_room[1], objective_room[1] + objective_room[3])
            for x in range(objective_room[0], objective_room[0] + objective_room[2])
            if _is_interior(x, y, width, height)
            and tiles[y][x] in (FLOOR, DOOR)
            and distances[y][x] > 0
        ]

        if not objective_candidates:
            objective_candidates = [
                (x, y)
                for y in range(1, height - 1)
                for x in range(1, width - 1)
                if tiles[y][x] in (FLOOR, DOOR) and distances[y][x] > 0
            ]

        if not objective_candidates:
            continue

        farthest = max(distances[y][x] for x, y in objective_candidates)
        far_candidates = [
            (x, y)
            for x, y in objective_candidates
            if distances[y][x] >= max(1, farthest - 2)
        ]
        obj_x, obj_y = rng.choice(far_candidates)
        tiles[obj_y][obj_x] = OBJECTIVE

        enemy_candidates: list[tuple[float, int, int]] = []
        for y in range(1, height - 1):
            for x in range(1, width - 1):
                if tiles[y][x] != FLOOR:
                    continue
                if (x, y) == (start_x, start_y):
                    continue
                dist_from_start = distances[y][x]
                if dist_from_start < 3:
                    continue
                if abs(x - obj_x) + abs(y - obj_y) < 3:
                    continue
                score = dist_from_start + rng.random()
                enemy_candidates.append((score, x, y))

        enemy_candidates.sort(reverse=True)
        enemy_positions: list[Point] = []
        for _, ex, ey in enemy_candidates:
            if len(enemy_positions) >= num_enemies:
                break
            if any(abs(ex - px) + abs(ey - py) < 2 for px, py in enemy_positions):
                continue
            tiles[ey][ex] = ENEMY_SPAWN
            enemy_positions.append((ex, ey))

        if len(enemy_positions) < num_enemies:
            fallback_enemy_cells = [
                (x, y)
                for y in range(1, height - 1)
                for x in range(1, width - 1)
                if tiles[y][x] == FLOOR
                and (x, y) not in {(start_x, start_y), (obj_x, obj_y)}
                and distances[y][x] > 0
            ]
            rng.shuffle(fallback_enemy_cells)
            for ex, ey in fallback_enemy_cells:
                if len(enemy_positions) >= num_enemies:
                    break
                tiles[ey][ex] = ENEMY_SPAWN
                enemy_positions.append((ex, ey))

        if _layout_is_valid(tiles, enemy_positions, (obj_x, obj_y), (start_x, start_y)):
            return tiles, enemy_positions, (obj_x, obj_y), (start_x, start_y)

    return _generate_fallback_dungeon(width, height, num_enemies, seed)


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
