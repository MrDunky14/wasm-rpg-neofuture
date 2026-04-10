"""Game Engine Mechanics Explanation

WHY DO ENEMIES EXIST?
======================
Each enemy represents a learning challenge you must overcome.

When you encounter an enemy:
1. You are tested on the DSA concept (Stack, Queue, Sorting, etc.)
2. Answer the question correctly to defeat the enemy
3. Wrong answers damage you but don't kill you - you can retry
4. Each enemy defeated proves mastery of the concept

GAMEPLAY LOOP
=============
Quiz (Failed Topics Identified)
↓
Lesson (Learn the concept from AI-generated content)
↓
Challenge Room (Quick self-check test)
↓
Enter Dungeon (WASM Game)
  ↓
  Navigate through rooms
  ↓
  Encounter enemies (concept questions)
  ↓
  Defeat boss (final mastery test)
  ↓
  VICTORY - You've mastered the concept!

WHY THIS GAME MECHANICS?
========================
Traditional games: Kill enemies for points (meaningless)
WASM-RPG game:  Defeat enemies to PROVE CONCEPT MASTERY (meaningful)

Each enemy = 1 concept question
Boss = 3 concept questions (multi-part final test)

PROGRESSION
===========
Easy:   Few enemies (2-3), weak hits, easy questions
Medium: Average enemies (5-6), medium difficulty
Hard:   Many enemies (8-10), hard questions, boss is tough

WHAT YOU'RE ACTUALLY LEARNING
==============================
- Stack Dungeon → Enemy asks "Push 5, Push 3, Pop - what's on top?"
  Defeat enemy = prove you understand LIFO
  
- Queue Dungeon → Enemy asks "Enqueue A, B, Dequeue - what's first?"
  Defeat enemy = prove you understand FIFO
  
- Sorting Dungeon → Enemy asks "Sort this array"
  Defeat enemy = prove you can sort

This is ACTIVE LEARNING not passive consumption.
Your game score = your learning score.
"""