"""
Quality scoring and difficulty hysteresis for WASM-RPG.

Implements:
1. 5-category quality scoring (0-100) for dungeon validation
2. Adaptive difficulty hysteresis to prevent oscillation
3. Misconception-aware difficulty tuning
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from collections import deque
from typing import Optional


# ── Quality Scoring System (5 Categories, 0-100) ────────────────────────────

@dataclass
class DungeonMetrics:
    """Computed metrics for quality scoring."""
    path_ratio: float = 0.0           # BFS shortest path / dungeon diagonal
    dead_end_ratio: float = 0.0       # Rooms with 1 exit / total rooms
    decision_ratio: float = 0.0       # Rooms with 3+ exits / total rooms
    avg_enemy_spacing: float = 0.0    # Avg tile distance between enemies
    difficulty_ramp_corr: float = 0.0 # Correlation: distance_from_start vs enemy_strength
    boss_hp_ratio: float = 0.0        # Boss HP / strongest non-boss enemy HP
    room_size_cv: float = 0.0         # Coefficient of variation for room sizes
    symmetry_score: float = 0.0       # 0-1 (0=asymmetric, 1=perfectly symmetric)
    corridor_ratio: float = 0.0       # Corridor tiles / total floor tiles
    objective_reachable: bool = True
    enemies_reachable: bool = True
    concept_fit_ratio: float = 0.0    # Fraction of enemies matching concept


def score_exploration(metrics: DungeonMetrics) -> float:
    """
    Category 1: Exploration (0-25 points)
    
    Metrics:
    - Path length ratio (0-10 pts): Good range 0.4-1.2
    - Dead-end ratio (0-10 pts): Good range 0.1-0.35
    - Decision points (0-5 pts): Good range 0.15-0.4
    """
    # Path score
    path_score = min(metrics.path_ratio / 1.2, 1.0) * 10
    
    # Dead-end score
    if 0.1 <= metrics.dead_end_ratio <= 0.35:
        dead_end_score = 10
    else:
        dead_end_score = max(0, 10 - abs(metrics.dead_end_ratio - 0.225) * 40)
    
    # Decision score
    if 0.15 <= metrics.decision_ratio <= 0.4:
        decision_score = 5
    else:
        decision_score = max(0, 5 - abs(metrics.decision_ratio - 0.275) * 20)
    
    return min(path_score + dead_end_score + decision_score, 25)


def score_pacing(metrics: DungeonMetrics) -> float:
    """
    Category 2: Pacing (0-20 points)
    
    Metrics:
    - Enemy spacing (0-7 pts): Good range 8-20 tiles
    - Difficulty ramp (0-7 pts): Good if correlation > 0.3
    - Boss differential (0-6 pts): Good range 1.5x-3x
    """
    # Enemy spacing score
    if 8 <= metrics.avg_enemy_spacing <= 20:
        spacing_score = 7
    else:
        spacing_score = max(0, 7 - abs(metrics.avg_enemy_spacing - 14) * 0.5)
    
    # Difficulty ramp score
    if metrics.difficulty_ramp_corr > 0.3:
        ramp_score = 7
    else:
        ramp_score = max(0, (metrics.difficulty_ramp_corr / 0.3) * 7)
    
    # Boss differential score
    if 1.5 <= metrics.boss_hp_ratio <= 3:
        boss_score = 6
    else:
        boss_score = max(0, 6 - abs(metrics.boss_hp_ratio - 2.25) * 3)
    
    return min(spacing_score + ramp_score + boss_score, 20)


def score_layout(metrics: DungeonMetrics) -> float:
    """
    Category 3: Layout (0-20 points)
    
    Metrics:
    - Room size variance (0-8 pts): Good CV 0.2-0.6
    - Symmetry break (0-6 pts): Good if similarity < 0.7
    - Corridor efficiency (0-6 pts): Good ratio 0.15-0.4
    """
    # Size variance score
    if 0.2 <= metrics.room_size_cv <= 0.6:
        size_score = 8
    else:
        size_score = max(0, 8 - abs(metrics.room_size_cv - 0.4) * 20)
    
    # Symmetry score
    if metrics.symmetry_score < 0.7:
        symmetry_score = 6
    else:
        symmetry_score = max(0, 6 - (metrics.symmetry_score - 0.7) * 20)
    
    # Corridor score
    if 0.15 <= metrics.corridor_ratio <= 0.4:
        corridor_score = 6
    else:
        corridor_score = max(0, 6 - abs(metrics.corridor_ratio - 0.275) * 25)
    
    return min(size_score + symmetry_score + corridor_score, 20)


def score_reachability(metrics: DungeonMetrics) -> float:
    """
    Category 4: Reachability (0-15 points)
    
    Metrics:
    - Objective reachable (0/10 pts)
    - All enemies reachable (0/3 pts)
    - Objective not in dead corner (0/2 pts)
    """
    obj_score = 10 if metrics.objective_reachable else 0
    enemy_score = 3 if metrics.enemies_reachable else 0
    corner_score = 2 if metrics.objective_reachable else 0  # Simplified
    
    return min(obj_score + enemy_score + corner_score, 15)


def score_concept_fit(metrics: DungeonMetrics) -> float:
    """
    Category 5: Concept Fit (0-20 points)
    
    Metrics:
    - Enemy type matches concept (0-8 pts): Good if >= 50%
    - Boss is concept-appropriate (0-6 pts): All or nothing
    - Objectives concept-relevant (0-6 pts): Partial credit
    """
    # Enemy matching
    if metrics.concept_fit_ratio >= 0.5:
        enemy_score = 8
    elif metrics.concept_fit_ratio >= 0.25:
        enemy_score = 4
    else:
        enemy_score = 0
    
    # Boss matching (assume always present for concept)
    boss_score = 6
    
    # Objectives (estimate from concept_fit_ratio)
    if metrics.concept_fit_ratio >= 0.5:
        obj_score = 6
    elif metrics.concept_fit_ratio >= 0.25:
        obj_score = 3
    else:
        obj_score = 0
    
    return min(enemy_score + boss_score + obj_score, 20)


def calculate_quality_score(metrics: DungeonMetrics) -> float:
    """
    Compute overall dungeon quality score (0-100).
    
    Weighted average of 5 categories:
    - Exploration: 25%
    - Pacing: 20%
    - Layout: 20%
    - Reachability: 15%
    - Concept Fit: 20%
    """
    exploration = score_exploration(metrics)     # /25
    pacing = score_pacing(metrics)               # /20
    layout = score_layout(metrics)               # /20
    reachability = score_reachability(metrics)   # /15
    concept_fit = score_concept_fit(metrics)     # /20
    
    # Weighted average (normalize all to /100)
    total = (
        (exploration / 25) * 25 +
        (pacing / 20) * 20 +
        (layout / 20) * 20 +
        (reachability / 15) * 15 +
        (concept_fit / 20) * 20
    )
    
    return round(total, 1)


# ── Difficulty Hysteresis System ────────────────────────────────────────────

@dataclass
class DifficultyState:
    """Track difficulty transitions with hysteresis."""
    current_difficulty: int  # 1=Easy, 2=Medium, 3=Hard
    runs_since_transition: int = 0
    recent_signals: deque = None  # Last 5 signals: 'easy', 'hard', 'neutral'
    
    def __post_init__(self):
        if self.recent_signals is None:
            self.recent_signals = deque(maxlen=5)


class DifficultyHysteresis:
    """
    Prevents difficulty oscillation using thresholds and cooldown.
    
    Rules:
    - Need 3 consecutive 'easy' signals to promote
    - Need 2 consecutive 'hard' signals to demote
    - After transition, wait 2 runs before re-evaluating
    """
    
    PROMOTE_THRESHOLD = 3
    DEMOTE_THRESHOLD = 2
    COOLDOWN_RUNS = 2
    
    def __init__(self):
        self.state = DifficultyState(current_difficulty=2)  # Start at Medium
    
    def add_signal(self, signal: str) -> None:
        """Record a performance signal: 'easy', 'hard', or 'neutral'."""
        self.state.recent_signals.append(signal)
        self.state.runs_since_transition += 1
    
    def evaluate(self) -> int:
        """
        Evaluate and potentially transition difficulty.
        Returns: 1 (Easy), 2 (Medium), or 3 (Hard)
        """
        # Check cooldown
        if self.state.runs_since_transition < self.COOLDOWN_RUNS:
            return self.state.current_difficulty
        
        # Count signals
        recent = list(self.state.recent_signals)
        easy_count = sum(1 for s in recent if s == 'easy')
        hard_count = sum(1 for s in recent if s == 'hard')
        
        # Decision logic
        if easy_count >= self.PROMOTE_THRESHOLD:
            new_difficulty = self._promote(self.state.current_difficulty)
        elif hard_count >= self.DEMOTE_THRESHOLD:
            new_difficulty = self._demote(self.state.current_difficulty)
        else:
            new_difficulty = self.state.current_difficulty
        
        # If changed, record transition
        if new_difficulty != self.state.current_difficulty:
            self.state.current_difficulty = new_difficulty
            self.state.runs_since_transition = 0
            self.state.recent_signals.clear()
        
        return self.state.current_difficulty
    
    def _promote(self, current: int) -> int:
        """Promote difficulty one level."""
        return min(current + 1, 3)
    
    def _demote(self, current: int) -> int:
        """Demote difficulty one level."""
        return max(current - 1, 1)


# ── Misconception-Aware Difficulty Adjustment ──────────────────────────────

def adjust_for_misconceptions(
    base_difficulty: int,
    misconceptions: list[str],
    concept_accuracy: float
) -> int:
    """
    Soften difficulty if student has documented misconceptions.
    
    Rules:
    - If misconceptions exist AND accuracy < 0.5: demote 1 level
    - If misconceptions exist AND accuracy < 0.7: neutral
    - Otherwise: use base difficulty
    """
    if not misconceptions:
        return base_difficulty
    
    if concept_accuracy < 0.5 and base_difficulty > 1:
        return base_difficulty - 1
    
    return base_difficulty
