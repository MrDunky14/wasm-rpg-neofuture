import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { Enemy, LevelData, Position } from '../types/level';
import GameHUD from '../components/GameHUD';
import PlayerSprite from '../components/PlayerSprite';
import EnemySprite from '../components/EnemySprite';

// Fallback heuristic judge in case API is unavailable
import { judgeConceptAnswer as fallbackJudge } from '../lib/answerJudge';

type GameProps = {
  level: LevelData;
  studentId?: string;
};

type JudgeResult = {
  isCorrect: boolean;
  hint: string;
};

// AI-powered answer grading via backend
const gradeAnswerWithAI = async (question: string, answer: string): Promise<JudgeResult> => {
  try {
    const response = await api.post('/api/grade/answer', {
      question,
      student_answer: answer,
    });
    
    const { is_correct, reasoning } = response.data;
    const hint = reasoning || (is_correct ? 'Correct!' : 'Try again with the core concepts from your lesson.');
    
    return {
      isCorrect: is_correct,
      hint,
    };
  } catch (error) {
    // Fallback to heuristic grading if API fails
    console.warn('[Grading] API error, falling back to heuristics:', error);
    return fallbackJudge(question, answer);
  }
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

const Game = ({ level, studentId }: GameProps) => {
  const navigate = useNavigate();
  const timeoutIdsRef = useRef<number[]>([]);
  const [playerPos, setPlayerPos] = useState<Position>({ x: 0, y: 0 });
  const [playerHp, setPlayerHp] = useState(100);
  const [moves, setMoves] = useState(0);
  const [levelWon, setLevelWon] = useState(false);
  const [message, setMessage] = useState('Navigate to the objective to clear the dungeon.');
  const [encounteredEnemies, setEncounteredEnemies] = useState<Record<string, boolean>>({});
  const [activeEnemyKey, setActiveEnemyKey] = useState<string | null>(null);
  const [enemyAnswer, setEnemyAnswer] = useState('');
  const [bossPrompt, setBossPrompt] = useState('');
  const [bossQuestionIndex, setBossQuestionIndex] = useState(0);
  const [bossAnswer, setBossAnswer] = useState('');
  const [bossDefeated, setBossDefeated] = useState(false);
  const [runStartedAt, setRunStartedAt] = useState<number>(Date.now());
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressSaved, setProgressSaved] = useState(false);

  // Animation states
  const [isDamageAnimating, setIsDamageAnimating] = useState(false);
  const [defeatingEnemyKey, setDefeatingEnemyKey] = useState<string | null>(null);
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false);
  const [isGradingAnswer, setIsGradingAnswer] = useState(false);
  const [combatLog, setCombatLog] = useState<string[]>([]);

  const queueUiTimeout = useCallback((callback: () => void, delayMs: number) => {
    const timeoutId = window.setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
      callback();
    }, delayMs);
    timeoutIdsRef.current.push(timeoutId);
  }, []);

  const clearUiTimeouts = useCallback(() => {
    for (const timeoutId of timeoutIdsRef.current) {
      window.clearTimeout(timeoutId);
    }
    timeoutIdsRef.current = [];
  }, []);

  const appendCombatLog = useCallback((entry: string) => {
    setCombatLog((prev) => [entry, ...prev].slice(0, 5));
  }, []);

  const applyDamage = useCallback((damage: number, source: string, currentHp: number) => {
    const nextHp = Math.max(0, currentHp - damage);
    setPlayerHp(nextHp);
    appendCombatLog(`${source} dealt ${damage} damage (${currentHp} -> ${nextHp}).`);

    if (nextHp === 0) {
      appendCombatLog('HP reached 0. Defeat consequences applied.');
    }

    return nextHp;
  }, [appendCombatLog]);

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

  const bossQuestions = useMemo(
    () => {
      const questions = level.boss?.question_sequence ?? [];
      console.log('[Level Setup] Boss questions loaded:', questions);
      return questions;
    },
    [level.boss?.question_sequence],
  );
  const hasBossQuestions = bossQuestions.length > 0;
  console.log('[Level Setup] Has boss questions:', hasBossQuestions, 'count:', bossQuestions.length);
  const activeEnemy = useMemo(
    () => (activeEnemyKey ? enemyMap[activeEnemyKey] : undefined),
    [activeEnemyKey, enemyMap],
  );
  const inEnemyCombat = Boolean(activeEnemyKey && activeEnemy && !encounteredEnemies[activeEnemyKey]);

  useEffect(() => {
    clearUiTimeouts();
    setPlayerPos(level.player_start ?? { x: 0, y: 0 });
    setPlayerHp(100);
    setMoves(0);
    setLevelWon(false);
    setEncounteredEnemies({});
    setActiveEnemyKey(null);
    setEnemyAnswer('');
    setBossPrompt('');
    setBossQuestionIndex(0);
    setBossAnswer('');
    setBossDefeated(false);
    setProgressSaved(false);
    setSavingProgress(false);
    setIsGradingAnswer(false);
    setIsDamageAnimating(false);
    setDefeatingEnemyKey(null);
    setShowCorrectFeedback(false);
    setCombatLog([`Run started for ${level.concept.replace('_', ' ')} training.`]);
    setRunStartedAt(Date.now());
    setMessage('Navigate to the objective to clear the dungeon.');
  }, [clearUiTimeouts, level]);

  const isWalkable = useCallback((x: number, y: number) => {
    if (x < 0 || y < 0 || y >= level.height || x >= level.width) {
      return false;
    }
    return (level.tiles?.[y]?.[x] ?? 1) !== 1;
  }, [level.height, level.tiles, level.width]);

  const movePlayer = useCallback((dx: number, dy: number) => {
    if (levelWon || playerHp <= 0 || inEnemyCombat) {
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
  }, [inEnemyCombat, isWalkable, levelWon, playerHp]);

  useEffect(() => {
    const key = posKey(playerPos.x, playerPos.y);

    if (key === objectiveKey && !levelWon) {
      setLevelWon(true);
      if (hasBossQuestions) {
        setBossQuestionIndex(0);
        setBossPrompt(bossQuestions[0]);
        setMessage(`Objective reached. Boss challenge started (1/${bossQuestions.length}).`);
      } else {
        setMessage('Objective reached. Level complete.');
      }
      return;
    }

    if (enemyMap[key] && !encounteredEnemies[key] && activeEnemyKey !== key) {
      const enemy = enemyMap[key];
      setActiveEnemyKey(key);
      setEnemyAnswer('');
      setMessage(`Enemy encounter: ${enemy.type}. Answer correctly to defeat it.`);
    }
  }, [activeEnemyKey, bossQuestions, encounteredEnemies, enemyMap, hasBossQuestions, levelWon, objectiveKey, playerPos]);

  const submitEnemyAnswer = useCallback(async () => {
    if (isGradingAnswer || playerHp <= 0 || !activeEnemyKey) {
      return;
    }

    const trimmedAnswer = enemyAnswer.trim();

    if (!trimmedAnswer) {
      setMessage('Write an answer before submitting enemy combat.');
      return;
    }

    const enemy = enemyMap[activeEnemyKey];
    if (!enemy) {
      setActiveEnemyKey(null);
      setEnemyAnswer('');
      return;
    }

    const question = enemy.concept_question?.trim() || `Defeat ${enemy.type}`;
    const enemyKey = activeEnemyKey;
    let releaseGradingLock = true;
    
    try {
      setIsGradingAnswer(true);
      setMessage('Grading answer with AI...');
      const judgement = await gradeAnswerWithAI(question, trimmedAnswer);

      if (playerHp <= 0) {
        return;
      }

      if (judgement.isCorrect) {
        console.log('[Enemy Combat] Correct answer:', trimmedAnswer, 'Enemy defeated:', enemy.type);
        appendCombatLog(`Correct answer vs ${enemy.type}. Enemy defeated.`);
        
        // Trigger enemy defeat animation
        setDefeatingEnemyKey(enemyKey);
        setShowCorrectFeedback(true);
        releaseGradingLock = false;
        
        // Wait for animation before updating state
        queueUiTimeout(() => {
          if (playerHp <= 0) {
            setIsGradingAnswer(false);
            return;
          }

          setEncounteredEnemies((prev) => ({ ...prev, [enemyKey]: true }));
          setActiveEnemyKey(null);
          setEnemyAnswer('');
          setMessage(`✓ Correct! ${enemy.type} defeated.`);
          setShowCorrectFeedback(false);
          setDefeatingEnemyKey(null);
          setIsGradingAnswer(false);
        }, 500);
        return;
      }

      const damage = enemy.damage ?? 10;
      console.log('[Enemy Combat] Wrong answer:', trimmedAnswer, 'Damage:', damage);
      
      // Trigger damage animation
      setIsDamageAnimating(true);
      queueUiTimeout(() => setIsDamageAnimating(false), 400);
      
      const nextHp = applyDamage(damage, enemy.type, playerHp);
      setMessage(
        nextHp === 0
          ? `✗ Wrong. ${enemy.type} reduced your HP to 0.`
          : `✗ Wrong. ${enemy.type} attacks for ${damage} HP. ${judgement.hint}`,
      );
    } catch (error) {
      console.error('[Enemy Combat] Grading error:', error);
      appendCombatLog('Enemy grading API error. Fallback handling executed.');
      setMessage('Error grading answer. Please try again.');
    } finally {
      if (releaseGradingLock) {
        setIsGradingAnswer(false);
      }
    }
  }, [activeEnemyKey, appendCombatLog, applyDamage, enemyAnswer, enemyMap, isGradingAnswer, playerHp, queueUiTimeout]);

  const submitBossAnswer = useCallback(async () => {
    console.log('[Boss Combat] submitBossAnswer called with:', {bossQuestionIndex, bossQuestionsCount: bossQuestions.length, isGradingAnswer, bossDefeated, playerHp});
    if (isGradingAnswer || !hasBossQuestions || bossDefeated || playerHp <= 0) {
      console.log('[Boss Combat] Early return - isGrading:', isGradingAnswer, 'hasQuestions:', hasBossQuestions, 'defeated:', bossDefeated, 'hp:', playerHp);
      return;
    }

    if (!bossAnswer.trim()) {
      setMessage('Write a short answer before continuing the boss fight.');
      return;
    }

    if (!bossQuestions || bossQuestions.length === 0) {
      console.error('[Boss Combat] ERROR: No boss questions loaded!');
      setMessage('ERROR: Boss questions not loaded. Please refresh the page.');
      return;
    }

    const currentQuestion = bossQuestions[bossQuestionIndex] ?? '';
    if (!currentQuestion) {
      console.error('[Boss Combat] ERROR: Current question is empty at index', bossQuestionIndex);
      setMessage('ERROR: Current question is missing. Please refresh.');
      return;
    }

    console.log('[Boss Combat] Q' + (bossQuestionIndex + 1) + ':', currentQuestion);
    console.log('[Boss Combat] Answer:', bossAnswer.trim());
    let releaseGradingLock = true;

    try {
      setIsGradingAnswer(true);
      setMessage('Grading boss answer with AI...');
      const judgement = await gradeAnswerWithAI(currentQuestion, bossAnswer);
      console.log('[Boss Combat] Judgement:', judgement);

      if (playerHp <= 0) {
        return;
      }

      if (!judgement.isCorrect) {
        const bossDamage = level.boss?.damage_per_wrong_answer ?? level.boss?.damage ?? 20;
        
        // Trigger damage animation
        setIsDamageAnimating(true);
        queueUiTimeout(() => setIsDamageAnimating(false), 400);
        
        const nextHp = applyDamage(bossDamage, 'Boss', playerHp);
        setMessage(
          nextHp === 0
            ? `✗ Wrong. Boss dealt ${bossDamage} damage and your HP reached 0.`
            : `✗ Wrong. Boss dealt ${bossDamage} damage. ${judgement.hint}`,
        );
        return;
      }

      // Correct answer for boss
      setShowCorrectFeedback(true);
      appendCombatLog(`Correct boss answer ${bossQuestionIndex + 1}/${bossQuestions.length}.`);
      console.log('[Boss Combat] Checking if final question - index:', bossQuestionIndex, 'length:', bossQuestions.length, 'comparison:', bossQuestionIndex >= bossQuestions.length - 1);
      
      if (bossQuestionIndex >= bossQuestions.length - 1) {
        console.log('[Boss Combat] All questions answered correctly. Boss defeated!');
        releaseGradingLock = false;
        
        // Boss defeat - wait a bit longer for final victory
        queueUiTimeout(() => {
          try {
            console.log('[Boss Combat] Defeat timeout callback executing...');
            if (playerHp <= 0) {
              console.log('[Boss Combat] Player dead, not setting bossDefeated');
              setIsGradingAnswer(false);
              return;
            }

            console.log('[Boss Combat] Setting boss as defeated');
            setBossDefeated(true);
            setBossPrompt('');
            setBossAnswer('');
            setMessage('✓ Boss defeated. Dungeon mastered.');
            setShowCorrectFeedback(false);
            setIsGradingAnswer(false);
            console.log('[Boss Combat] Boss defeat state updates queued');
          } catch (error) {
            console.error('[Boss Combat] Error in defeat callback:', error);
            setIsGradingAnswer(false);
          }
        }, 500);
        return;
      }

      // Correct but boss still has more questions - advance
      releaseGradingLock = false;
      queueUiTimeout(() => {
        try {
          console.log('[Boss Combat] Advance timeout callback executing...');
          if (playerHp <= 0) {
            console.log('[Boss Combat] Player dead during advance, aborting');
            setIsGradingAnswer(false);
            return;
          }

          const nextIndex = bossQuestionIndex + 1;
          console.log('[Boss Combat] Advancing from question', bossQuestionIndex, 'to', nextIndex);
          setBossQuestionIndex(nextIndex);
          setBossPrompt(bossQuestions[nextIndex]);
          setBossAnswer('');
          console.log('[Boss Combat] Advanced to question ' + (nextIndex + 1) + '/' + bossQuestions.length);
          setMessage(`✓ Correct. Boss challenged (${nextIndex + 1}/${bossQuestions.length}).`);
          setShowCorrectFeedback(false);
          setIsGradingAnswer(false);
          console.log('[Boss Combat] Question advance completed');
        } catch (error) {
          console.error('[Boss Combat] Error in advance callback:', error);
          setIsGradingAnswer(false);
        }
      }, 400);
    } catch (error) {
      console.error('[Boss Combat] Grading error:', error);
      appendCombatLog('Boss grading API error. Fallback handling executed.');
      setMessage('Error grading boss answer. Please try again.');
    } finally {
      if (releaseGradingLock) {
        setIsGradingAnswer(false);
      }
    }
  }, [appendCombatLog, applyDamage, bossAnswer, bossQuestionIndex, bossQuestions, hasBossQuestions, isGradingAnswer, level.boss?.damage, level.boss?.damage_per_wrong_answer, playerHp, queueUiTimeout]);

  useEffect(() => {
    if (playerHp > 0) {
      return;
    }

    clearUiTimeouts();
    setIsGradingAnswer(false);
    setIsDamageAnimating(false);
    setShowCorrectFeedback(false);
    setDefeatingEnemyKey(null);
    setActiveEnemyKey(null);
    setBossPrompt('');
    appendCombatLog('Defeat consequence synchronized: encounters closed at 0 HP.');
    setMessage('You were defeated. Exit to map and retry the dungeon.');
  }, [appendCombatLog, clearUiTimeouts, playerHp]);

  useEffect(() => () => {
    clearUiTimeouts();
  }, [clearUiTimeouts]);

  useEffect(() => {
    const shouldSave = levelWon && (!hasBossQuestions || bossDefeated);
    if (!shouldSave || progressSaved || savingProgress) {
      return;
    }

    let cancelled = false;

    const saveRun = async () => {
      setSavingProgress(true);

      try {
        const elapsedSeconds = Math.max(1, Math.round((Date.now() - runStartedAt) / 1000));
        const computedScore = Math.max(10, 150 - moves * 2 + (bossDefeated ? 50 : 20) + Math.max(playerHp, 0));
        const resolvedStudentId = studentId?.trim() || 'anonymous';

        console.log('[Progress Save] Sending:', {
          student_id: resolvedStudentId,
          level_name: level.level_name,
          concept: level.concept,
          completed: true,
          time_seconds: elapsedSeconds,
          score: computedScore,
          boss_defeated: bossDefeated,
        });

        const response = await api.post('/api/progress/save', {
          student_id: resolvedStudentId,
          level_name: level.level_name,
          concept: level.concept,
          completed: true,
          time_seconds: elapsedSeconds,
          score: computedScore,
          boss_defeated: bossDefeated,
        });

        console.log('[Progress Save] Success:', response.data);
        if (!cancelled) {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('wasm_rpg_student_id', resolvedStudentId);
          }
          setProgressSaved(true);
          setMessage('Run complete. Progress saved to Adventure Log.');
        }
      } catch (saveError: unknown) {
        const errorMsg = saveError instanceof Error ? saveError.message : String(saveError);
        console.error('[Progress Save Error]', errorMsg);
        if (!cancelled) {
          setMessage('Run complete, but progress could not be saved. Check console.');
        }
      } finally {
        if (!cancelled) {
          setSavingProgress(false);
        }
      }
    };

    void saveRun();

    return () => {
      cancelled = true;
    };
  }, [
    bossDefeated,
    hasBossQuestions,
    level.concept,
    level.level_name,
    levelWon,
    moves,
    playerHp,
    progressSaved,
    runStartedAt,
    savingProgress,
    studentId,
  ]);

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
                          className="absolute inset-0 m-auto w-4 h-4 object-contain animate-idle-bob animate-pulse-glow"
                        />
                      )}

                      {enemy && !enemyDefeated && (
                        <div className="absolute inset-0 m-auto w-fit h-fit">
                          <EnemySprite
                            enemyType={enemy.type}
                            isDefeating={defeatingEnemyKey === key}
                            isAlert={true}
                            animationDelay={((x + y) % 4) * 120}
                          />
                        </div>
                      )}

                      {isPlayer && (
                        <div className="absolute inset-0 m-auto w-fit h-fit">
                          <PlayerSprite
                            animationType={isDamageAnimating ? 'damage' : 'idle'}
                            hpPercentage={(playerHp / 100) * 100}
                          />
                        </div>
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

        <aside className="space-y-4">
          <GameHUD
            playerHp={playerHp}
            maxHp={100}
            levelName={level.level_name}
            defeatedEnemies={defeatedEnemies}
            totalEnemies={totalEnemies}
            moves={moves}
            message={message}
            showCorrectFeedback={showCorrectFeedback}
            combatLog={combatLog}
            message_status={
              showCorrectFeedback ? 'success' :
              playerHp <= 0 ? 'danger' :
              playerHp < 33 ? 'warning' : 'neutral'
            }
          />

          {inEnemyCombat && activeEnemy && (
            <div className="game-panel rounded p-3 border border-white/[0.05]">
              <div className="flex items-start gap-2">
                <img src="/game-assets/enemy-reptile.png" alt="Enemy portrait" className={`w-8 h-8 object-contain mt-0.5 ${isDamageAnimating ? 'animate-bounce' : 'animate-idle-bob'}`} />
                <div className="w-full">
                  <div className="font-pixel text-[7px] text-accent tracking-widest mb-1">
                    ENEMY CHALLENGE
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {activeEnemy.concept_question?.trim() || `Defeat the ${activeEnemy.type} with a concept answer.`}
                  </p>
                  <textarea
                    value={enemyAnswer}
                    onChange={(event) => setEnemyAnswer(event.target.value)}
                    rows={2}
                    placeholder="Type your answer to defeat this enemy..."
                    disabled={isGradingAnswer || playerHp <= 0}
                    className="mt-2 w-full bg-[#0b1224] border border-white/[0.12] rounded px-2 py-2 text-xs text-white outline-none focus:border-secondary resize-none"
                  />
                  <button
                    className="pixel-btn-ghost text-[7px] py-1.5 px-3 mt-2"
                    onClick={submitEnemyAnswer}
                    disabled={isGradingAnswer || playerHp <= 0}
                  >
                    {isGradingAnswer ? 'Grading...' : 'Submit Enemy Answer'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {bossPrompt && (
            <div className="game-panel rounded p-3 border border-white/[0.05]">
              <div className="flex items-start gap-2">
                <img src="/game-assets/boss-slime-idle.png" alt="Boss portrait" className="w-8 h-8 object-contain mt-0.5 animate-idle-bob" />
                <div>
                  <div className="font-pixel text-[7px] text-danger tracking-widest mb-1">
                    BOSS QUESTION {bossQuestionIndex + 1}/{bossQuestions.length}
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{bossPrompt}</p>
                  <textarea
                    value={bossAnswer}
                    onChange={(event) => setBossAnswer(event.target.value)}
                    rows={2}
                    placeholder="Type your answer to advance..."
                    disabled={isGradingAnswer || playerHp <= 0}
                    className="mt-2 w-full bg-[#0b1224] border border-white/[0.12] rounded px-2 py-2 text-xs text-white outline-none focus:border-secondary resize-none"
                  />
                  <button
                    className="pixel-btn-ghost text-[7px] py-1.5 px-3 mt-2"
                    onClick={submitBossAnswer}
                    disabled={isGradingAnswer || playerHp <= 0}
                  >
                    {isGradingAnswer ? 'Grading...' : 'Submit Boss Answer'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {levelWon && hasBossQuestions && !bossDefeated && (
            <div className="rounded p-3 border border-danger/40 bg-danger/10">
              <div className="font-pixel text-[8px] text-danger tracking-widest">BOSS ACTIVE</div>
              <p className="text-xs text-gray-200 mt-1">Answer each boss question to finish the run.</p>
            </div>
          )}

          {levelWon && (!hasBossQuestions || bossDefeated) && (
            <div className="rounded p-3 border border-success/40 bg-success/10">
              <div className="font-pixel text-[8px] text-success tracking-widest">RUN COMPLETE</div>
              <p className="text-xs text-gray-200 mt-1">
                {savingProgress ? 'Saving your run...' : progressSaved ? 'Saved. Check your Adventure Log.' : 'Completed.'}
              </p>
              <button className="pixel-btn-ghost text-[7px] py-1.5 px-3 mt-3" onClick={() => navigate('/progress')}>
                Open Adventure Log
              </button>
            </div>
          )}

          <div className="text-[11px] text-gray-500 leading-relaxed">
            Use WASD or Arrow Keys for movement. Walls block movement. Enemy and boss prompts must be answered correctly to win.
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Game;
