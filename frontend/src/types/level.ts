export type Position = { x: number; y: number };

export type Enemy = {
  x: number;
  y: number;
  type: string;
  hp?: number;
  damage?: number;
};

export type Boss = {
  type: string;
  hp?: number;
  damage?: number;
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