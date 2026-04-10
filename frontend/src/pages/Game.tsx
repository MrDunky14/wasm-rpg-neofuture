import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Position = { x: number; y: number };

type Enemy = {
  x: number;
  y: number;
  type: string;
  hp?: number;
  damage?: number;
};

type Boss = {
  type: string;
  hp?: number;
  damage?: number;
  mechanic_type?: string;
  question_sequence?: string[];
};

type LevelData = {
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

type GameProps = {
  level: LevelData;
};

const TILE_SIZE = 28;

const tileStyle: Record<number, string> = {
  0: 'bg-slate-800/60',
  1: 'bg-slate-950',
  2: 'bg-amber-700/70',
  3: 'bg-emerald-900/70',
  4: 'bg-cyan-900/70',
};

const posKey = (x: number, y: number) => `${x},${y}`;

const Game = ({ level }: GameProps) => {
  const navigate = useNavigate();
  const [playerPos, setPlayerPos] = useState<Position>({ x: 0, y: 0 });
  const [playerHp, setPlayerHp] = useState(100);
  const [moves, setMoves] = useState(0);
  const [levelWon, setLevelWon] = useState(false);
  const [message, setMessage] = useState('Navigate to the objective to clear the dungeon.');
  const [encounteredEnemies, setEncounteredEnemies] = useState<Record<string, boolean>>({});
  const [bossPrompt, setBossPrompt] = useState('');

  const enemyMap = useMemo(() => {
    const map: Record<string, Enemy> = {};
    for (const enemy of level.enemies ?? []) {
      map[posKey(enemy.x, enemy.y)] = enemy;
    }
    return map;
  }, [level.enemies]);

  const objectiveKey = useMemo(
    () => posKey(level.objective?.x ?? 0, level.objective?.y ?? 0),
    [level.objective?.x, level.objective?.y],
  );

  useEffect(() => {
    setPlayerPos(level.player_start ?? { x: 0, y: 0 });
    setPlayerHp(100);
    setMoves(0);
    setLevelWon(false);
    setEncounteredEnemies({});
    setBossPrompt('');
    setMessage('Navigate to the objective to clear the dungeon.');
  }, [level]);

  const isWalkable = useCallback((x: number, y: number) => {
    if (x < 0 || y < 0 || y >= level.height || x >= level.width) {
      return false;
    }
    return (level.tiles?.[y]?.[x] ?? 1) !== 1;
  }, [level.height, level.tiles, level.width]);

  const movePlayer = useCallback((dx: number, dy: number) => {
    if (levelWon || playerHp <= 0) {
      return;
    }

    setPlayerPos((prev) => {
      const next = { x: prev.x + dx, y: prev.y + dy };

      if (!isWalkable(next.x, next.y)) {
        setMessage('A wall blocks your path.');
        return prev;
      }

      setMoves((m) => m + 1);
      return next;
    });
  }, [isWalkable, levelWon, playerHp]);

  useEffect(() => {
    const key = posKey(playerPos.x, playerPos.y);

    if (key === objectiveKey && !levelWon) {
      setLevelWon(true);
      if (level.boss?.question_sequence?.length) {
        setBossPrompt(level.boss.question_sequence[0]);
        setMessage('Objective reached. Boss challenge unlocked.');
      } else {
        setMessage('Objective reached. Level complete.');
      }
      return;
    }

    if (enemyMap[key] && !encounteredEnemies[key]) {
      const damage = enemyMap[key].damage ?? 10;
      setEncounteredEnemies((prev) => ({ ...prev, [key]: true }));
      setPlayerHp((hp) => Math.max(0, hp - damage));
      setMessage(`Enemy encounter: ${enemyMap[key].type}. You took ${damage} damage.`);
    }
  }, [encounteredEnemies, enemyMap, level.boss, levelWon, objectiveKey, playerPos]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') movePlayer(0, -1);
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') movePlayer(0, 1);
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') movePlayer(-1, 0);
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') movePlayer(1, 0);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [movePlayer]);

  const hpWidth = `${Math.max(0, Math.min(100, playerHp))}%`;
  const totalEnemies = level.enemies?.length ?? 0;
  const defeatedEnemies = Object.keys(encounteredEnemies).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#020205] flex flex-col items-center justify-center overflow-auto p-4 md:p-8">
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-1/2 -translate-x-1/2 md:top-6 z-20 pixel-btn-ghost text-[7px] py-1.5 px-3 opacity-70 hover:opacity-100"
      >
        Exit To Map
      </button>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 md:gap-6 mt-12">
        <section className="game-panel pixel-border rounded-lg p-3 md:p-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-pixel text-[10px] md:text-[11px] text-secondary tracking-wider">
              {level.level_name}
            </h1>
            <span className="font-pixel text-[8px] text-gray-400 tracking-widest">
              {level.width}x{level.height}
            </span>
          </div>

          <div
            className="relative border-2 border-primary/40 rounded overflow-hidden"
            style={{
              width: `${level.width * TILE_SIZE}px`,
              maxWidth: '100%',
              margin: '0 auto',
            }}
          >
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${level.width}, ${TILE_SIZE}px)`,
                width: `${level.width * TILE_SIZE}px`,
              }}
            >
              {Array.from({ length: level.height }).map((_, y) => (
                Array.from({ length: level.width }).map((__, x) => {
                  const tile = level.tiles?.[y]?.[x] ?? 1;
                  const key = posKey(x, y);
                  const isPlayer = playerPos.x === x && playerPos.y === y;
                  const isObjective = key === objectiveKey;
                  const enemy = enemyMap[key];
                  const enemyDefeated = Boolean(encounteredEnemies[key]);

                  return (
                    <div
                      key={key}
                      className={`relative border border-black/20 ${tileStyle[tile] ?? tileStyle[0]}`}
                      style={{
                        width: TILE_SIZE,
                        height: TILE_SIZE,
                        backgroundImage: "url('/game-assets/tileset-dungeon.png')",
                        backgroundSize: '192px 64px',
                        backgroundBlendMode: 'overlay',
                      }}
                    >
                      {isObjective && (
                        <img
                          src="/game-assets/objective-book.png"
                          alt="Objective"
                          className="absolute inset-0 m-auto w-4 h-4 object-contain"
                        />
                      )}

                      {enemy && !enemyDefeated && (
                        <img
                          src="/game-assets/enemy-face.png"
                          alt="Enemy"
                          className="absolute inset-0 m-auto w-5 h-5 object-contain"
                        />
                      )}

                      {isPlayer && (
                        <img
                          src="/game-assets/player-face.png"
                          alt="Player"
                          className="absolute inset-0 m-auto w-6 h-6 object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                        />
                      )}
                    </div>
                  );
                })
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <button className="pixel-btn-ghost text-[8px] py-2 px-4" onClick={() => movePlayer(0, -1)}>Up</button>
            <button className="pixel-btn-ghost text-[8px] py-2 px-4" onClick={() => movePlayer(-1, 0)}>Left</button>
            <button className="pixel-btn-ghost text-[8px] py-2 px-4" onClick={() => movePlayer(1, 0)}>Right</button>
            <button className="pixel-btn-ghost text-[8px] py-2 px-4" onClick={() => movePlayer(0, 1)}>Down</button>
          </div>
        </section>

        <aside className="game-panel pixel-border rounded-lg p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-3">
            <img src="/game-assets/player-face.png" alt="Player portrait" className="w-10 h-10 object-contain" />
            <div>
              <div className="font-pixel text-[8px] text-gray-400 tracking-widest">PLAYER</div>
              <div className="font-pixel text-[10px] text-white tracking-wider">CAVEMAN</div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-pixel text-[7px] text-danger tracking-widest">HP</span>
              <span className="font-pixel text-[7px] text-gray-400">{playerHp}</span>
            </div>
            <div className="stat-bar">
              <div className="stat-bar-fill bg-danger" style={{ width: hpWidth }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="game-panel rounded p-2 border border-white/[0.05]">
              <div className="font-pixel text-[7px] text-gray-500">MOVES</div>
              <div className="font-pixel text-[10px] text-accent mt-1">{moves}</div>
            </div>
            <div className="game-panel rounded p-2 border border-white/[0.05]">
              <div className="font-pixel text-[7px] text-gray-500">ENEMIES</div>
              <div className="font-pixel text-[10px] text-secondary mt-1">{defeatedEnemies}/{totalEnemies}</div>
            </div>
          </div>

          <div className="game-panel rounded p-3 border border-white/[0.05]">
            <div className="font-pixel text-[7px] text-gray-500 tracking-widest mb-2">MISSION</div>
            <p className="text-xs text-gray-200 leading-relaxed">{message}</p>
            {bossPrompt && (
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <div className="flex items-start gap-2">
                  <img src="/game-assets/boss-face.png" alt="Boss portrait" className="w-8 h-8 object-contain mt-0.5" />
                  <div>
                    <div className="font-pixel text-[7px] text-danger tracking-widest mb-1">BOSS QUESTION</div>
                    <p className="text-xs text-gray-300 leading-relaxed">{bossPrompt}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {levelWon && (
            <div className="rounded p-3 border border-success/40 bg-success/10">
              <div className="font-pixel text-[8px] text-success tracking-widest">LEVEL COMPLETE</div>
              <p className="text-xs text-gray-200 mt-1">You reached the objective and unlocked the boss prompt.</p>
            </div>
          )}

          <div className="text-[11px] text-gray-500 leading-relaxed">
            Use WASD or Arrow Keys for movement. Walls block movement. Enemy tiles deal damage once.
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Game;
