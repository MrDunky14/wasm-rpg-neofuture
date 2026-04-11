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
  retryable?: boolean;
  source?: string;
};

const localJudgeWithStatus = (question: string, answer: string, source: string): JudgeResult => {
  const local = fallbackJudge(question, answer);
  const statusPrefix = 'AI busy - graded locally.';
  const hint = local.isCorrect ? statusPrefix : `${statusPrefix} ${local.hint}`;

  return {
    isCorrect: local.isCorrect,
    hint,
    source: `local:${source}`,
  };
};

// AI-powered answer grading via backend with retry logic for rate limiting
const gradeAnswerWithAI = async (question: string, answer: string): Promise<JudgeResult> => {
  const maxRetries = 3;
  const baseWaitMs = 1000; // 1 second base wait
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await api.post('/api/grade/answer', {
        question,
        student_answer: answer,
      });
      
      // Handle both 'is_correct' and 'correct' field names for compatibility
      const responseData = response.data || {};
      let is_correct = responseData.is_correct !== undefined ? responseData.is_correct : responseData.correct;
      const reasoning = responseData.reasoning || responseData.hint;
      const source = typeof responseData.source === 'string' ? responseData.source : undefined;
      
      if (is_correct === undefined || is_correct === null) {
        console.warn('[Grading] Invalid API response - no is_correct field:', responseData);
        return fallbackJudge(question, answer);
      }
      
      // Properly handle boolean conversion - be defensive about string values
      if (typeof is_correct === 'string') {
        is_correct = is_correct.toLowerCase() === 'true' || is_correct === '1';
      } else {
        is_correct = Boolean(is_correct);
      }
      
      // Ensure is_correct is a boolean before returning
      if (typeof is_correct !== 'boolean') {
        console.warn('[Grading] is_correct field is not a boolean after conversion:', { is_correct, type: typeof is_correct });
        return fallbackJudge(question, answer);
      }

      if (source?.startsWith('fallback:')) {
        return localJudgeWithStatus(question, answer, source);
      }
      
      const hint = reasoning || (is_correct ? 'Excellent!' : 'Try again—review the core concept.');
      
      console.log('[Grading] API success:', { question: question.slice(0, 50), is_correct, hint });
      return {
        isCorrect: is_correct,
        hint,
        source,
      };
    } catch (error: any) {
      // Check for rate limiting (429) error
      const status = error?.response?.status;
      const retryAfterHeader = error?.response?.headers?.['retry-after'];
      
      if (status === 429 && attempt < maxRetries - 1) {
        // Rate limited - wait with exponential backoff, honoring Retry-After when valid
        const fallbackWaitMs = baseWaitMs * Math.pow(2, attempt);
        const parsedRetryAfter = Number.parseInt(String(retryAfterHeader ?? ''), 10);
        const waitMs = Number.isFinite(parsedRetryAfter) && parsedRetryAfter > 0
          ? parsedRetryAfter * 1000
          : fallbackWaitMs;
        console.log(`[Grading] Rate limited (429). Retry ${attempt + 1}/${maxRetries} after ${waitMs}ms`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue; // Retry
      }
      
      // Other errors - use fallback
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn('[Grading] API error:', errorMsg, 'Status:', status);
      
      if (status === 429) {
        // Even after retries, keep gameplay moving with strict local grading.
        console.warn('[Grading] Rate limit persists after retries - switching to local strict judge');
        return localJudgeWithStatus(question, answer, 'fallback:rate_limit');
      }
      
      // Use fallback for other errors
      return fallbackJudge(question, answer);
    }
  }
  
  // Should not reach here, but fallback just in case
  return fallbackJudge(question, answer);
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
  const [boardScale, setBoardScale] = useState(1);

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

      if (judgement.retryable) {
        appendCombatLog(`Enemy grading delayed (${judgement.source ?? 'temporary issue'}). No damage applied.`);
        setMessage(judgement.hint);
        return;
      }

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

      if (judgement.retryable) {
        appendCombatLog(`Boss grading delayed (${judgement.source ?? 'temporary issue'}). No damage applied.`);
        setMessage(judgement.hint);
        return;
      }

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

  const boardBaseWidth = level.width * TILE_SIZE;
  const boardBaseHeight = level.height * TILE_SIZE;

  useEffect(() => {
    const updateBoardScale = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const desktop = viewportWidth >= 1024;

      const horizontalPadding = desktop ? 180 : 40;
      const sidebarReserve = desktop ? Math.min(460, viewportWidth * 0.34) : 0;
      const verticalPadding = desktop ? 230 : 280;

      const availableWidth = Math.max(220, viewportWidth - horizontalPadding - sidebarReserve);
      const availableHeight = Math.max(220, viewportHeight - verticalPadding);

      const rawScale = Math.min(
        availableWidth / boardBaseWidth,
        availableHeight / boardBaseHeight,
      );

      const clampedScale = Math.min(2.35, Math.max(0.6, rawScale));
      setBoardScale(clampedScale);
    };

    updateBoardScale();
    window.addEventListener('resize', updateBoardScale);
    return () => window.removeEventListener('resize', updateBoardScale);
  }, [boardBaseHeight, boardBaseWidth]);

  const totalEnemies = level.enemies?.length ?? 0;
  const defeatedEnemies = Object.keys(encounteredEnemies).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#020205] flex flex-col items-center justify-start overflow-auto p-3 md:p-6">
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-1/2 -translate-x-1/2 md:top-6 z-20 pixel-btn-ghost text-[9px] py-1.5 px-3 opacity-70 hover:opacity-100"
      >
        Exit To Map
      </button>

      <div className="w-[min(98vw,1800px)] grid grid-cols-1 lg:grid-cols-[max-content_clamp(320px,30vw,440px)] gap-4 md:gap-6 mt-12 lg:mt-16 lg:justify-center lg:items-start">
        <section className="game-panel pixel-border rounded-lg p-3 md:p-4 w-full lg:w-fit">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-pixel text-[13px] md:text-[14px] text-secondary tracking-wider">
              {level.level_name}
            </h1>
            <span className="font-pixel text-[10px] text-gray-400 tracking-widest">
              {level.width}x{level.height}
            </span>
          </div>

          <div className="relative mx-auto">
            <div
              className="relative border-2 border-primary/40 rounded overflow-hidden"
              style={{
                width: `${boardBaseWidth * boardScale}px`,
                height: `${boardBaseHeight * boardScale}px`,
              }}
            >
              <div
                className="origin-top-left"
                style={{
                  transform: `scale(${boardScale})`,
                  width: `${boardBaseWidth}px`,
                  height: `${boardBaseHeight}px`,
                }}
              >
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${level.width}, ${TILE_SIZE}px)`,
                    width: `${boardBaseWidth}px`,
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
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <button className="pixel-btn-ghost text-[10px] py-2 px-4" onClick={() => movePlayer(0, -1)}>Up</button>
            <button className="pixel-btn-ghost text-[10px] py-2 px-4" onClick={() => movePlayer(-1, 0)}>Left</button>
            <button className="pixel-btn-ghost text-[10px] py-2 px-4" onClick={() => movePlayer(1, 0)}>Right</button>
            <button className="pixel-btn-ghost text-[10px] py-2 px-4" onClick={() => movePlayer(0, 1)}>Down</button>
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
            <div className="game-panel rounded p-4 border-2 border-accent/60 bg-gradient-to-b from-[#1a2847] to-[#0f1628]">
              <div className="flex items-start gap-3">
                <div
                  aria-label="Enemy portrait"
                  className={`w-10 h-10 mt-0.5 flex-shrink-0 sprite ${isDamageAnimating ? 'animate-bounce' : 'animate-idle-bob'}`}
                  style={{
                    backgroundImage: 'url(/game-assets/enemy-reptile.png)',
                    backgroundSize: '400% 400%',
                    backgroundPosition: '0% 0%',
                    backgroundRepeat: 'no-repeat',
                    imageRendering: 'pixelated',
                  }}
                />
                <div className="w-full">
                  <div className="font-pixel text-[10px] text-accent tracking-widest mb-2 uppercase">
                    ⚔️ ENEMY CHALLENGE
                  </div>
                  <p className="text-sm text-gray-200 leading-relaxed mb-3 font-medium">
                    {activeEnemy.concept_question?.trim() || `Defeat the ${activeEnemy.type} with a concept answer.`}
                  </p>
                  <textarea
                    value={enemyAnswer}
                    onChange={(event) => setEnemyAnswer(event.target.value)}
                    rows={3}
                    placeholder=" Type your answer here  →"
                    disabled={isGradingAnswer || playerHp <= 0}
                    className="mt-2 w-full bg-[#0a0f1f] border-2 border-accent/40 rounded px-3 py-2 text-sm text-white outline-none focus:border-accent focus:border-2 focus:shadow-[0_0_8px_rgba(6,182,212,0.4)] resize-none transition-all placeholder:text-gray-500"
                  />
                  <button
                    className="pixel-btn-ghost text-[10px] py-2 px-4 mt-3 border-accent/60 hover:border-accent hover:text-accent transition-all"
                    onClick={submitEnemyAnswer}
                    disabled={isGradingAnswer || playerHp <= 0}
                  >
                    {isGradingAnswer ? '⏳ GRADING...' : '↳ SUBMIT ANSWER'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {bossPrompt && (
            <div className="game-panel rounded p-4 border-2 border-danger/60 bg-gradient-to-b from-[#2a1a1a] to-[#1a0f0f]">
              <div className="flex items-start gap-3">
                <div
                  aria-label="Boss portrait"
                  className="w-10 h-10 mt-0.5 flex-shrink-0 sprite animate-idle-bob"
                  style={{
                    backgroundImage: 'url(/game-assets/boss-slime-idle.png)',
                    backgroundSize: '500% 100%',
                    backgroundPosition: '50% 0%',
                    backgroundRepeat: 'no-repeat',
                    imageRendering: 'pixelated',
                  }}
                />
                <div className="w-full">
                  <div className="font-pixel text-[10px] text-danger tracking-widest mb-2 uppercase">
                    👑 BOSS {bossQuestionIndex + 1}/{bossQuestions.length}
                  </div>
                  <p className="text-sm text-gray-100 leading-relaxed mb-3 font-medium">{bossPrompt}</p>
                  <textarea
                    value={bossAnswer}
                    onChange={(event) => setBossAnswer(event.target.value)}
                    rows={3}
                    placeholder=" Type your answer  →"
                    disabled={isGradingAnswer || playerHp <= 0}
                    className="mt-2 w-full bg-[#0a0f1f] border-2 border-danger/40 rounded px-3 py-2 text-sm text-white outline-none focus:border-danger focus:border-2 focus:shadow-[0_0_8px_rgba(239,68,68,0.4)] resize-none transition-all placeholder:text-gray-500"
                  />
                  <button
                    className="pixel-btn-ghost text-[10px] py-2 px-4 mt-3 border-danger/60 hover:border-danger hover:text-danger transition-all"
                    onClick={submitBossAnswer}
                    disabled={isGradingAnswer || playerHp <= 0}
                  >
                    {isGradingAnswer ? '⏳ GRADING...' : '↳ SUBMIT ANSWER'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {levelWon && hasBossQuestions && !bossDefeated && (
            <div className="rounded p-4 border-2 border-danger/60 bg-gradient-to-b from-danger/20 to-transparent">
              <div className="font-pixel text-[11px] text-danger tracking-widest uppercase mb-1">⚡ BOSS INCOMING</div>
              <p className="text-sm text-gray-100">Answer all boss questions to complete the challenge.</p>
            </div>
          )}

          {levelWon && (!hasBossQuestions || bossDefeated) && (
            <div className="rounded p-4 border-2 border-success/60 bg-gradient-to-b from-success/20 to-transparent animate-pulse">
              <div className="font-pixel text-[11px] text-success tracking-widest uppercase mb-1">✨ LEVEL COMPLETE</div>
              <p className="text-sm text-gray-100 mb-3">
                {savingProgress ? '💾 Saving progress...' : progressSaved ? '✓ Progress saved!' : 'Challenge conquered!'}
              </p>
              <button className="pixel-btn-ghost text-[10px] py-2 px-4 border-success/60 hover:border-success hover:text-success transition-all" onClick={() => navigate('/progress')}>
                🔖 ADVENTURE LOG
              </button>
            </div>
          )}

          <div className="text-[13px] text-gray-400 leading-relaxed border-t border-white/[0.1] pt-3 mt-3">
            ⌨️ <span className="text-accent">WASD</span> or <span className="text-accent">Arrow Keys</span> to move • Answer questions to defeat enemies
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Game;
