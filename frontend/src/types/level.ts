export type Position = { x: number; y: number };

export type Enemy = {
  x: number;
  y: number;
  type: string;
  max_hp?: number;
  hp?: number;
  damage?: number;
  concept_question?: string;
};

export type Boss = {
  type: string;
  max_hp?: number;
  hp?: number;
  damage?: number;
  damage_per_wrong_answer?: number;
  mechanic_type?: string;
  question_sequence?: string[];
};

export type LevelData = {
  level_name: string;
  concept: string;
  difficulty: number;
  width: number;
  height: number;
  tiles: number[][];
  player_start: Position;
  objective: Position & { type?: string };
  enemies: Enemy[];
  boss?: Boss;
};