import { useState, useEffect } from 'react';
import api from '../lib/api';
import GBAWindow from '../components/GBAWindow';
import GBAButton from '../components/GBAButton';

type ProgressRecord = {
  id: number;
  level_name: string;
  completed: boolean;
  time_seconds: number;
  score: number;
  boss_defeated: boolean;
};

type ProgressHistory = {
  student_id: string;
  records: ProgressRecord[];
  total_levels_completed: number;
  total_bosses_defeated: number;
};

const Progress = () => {
  const [progress, setProgress] = useState<ProgressHistory | null>(null);
  const [studentId, setStudentId] = useState(() => {
    if (typeof window === 'undefined') {
      return 'demo_player';
    }

    const stored = window.localStorage.getItem('wasm_rpg_student_id')?.trim();
    return stored || 'demo_player';
  });
  const [draftStudentId, setDraftStudentId] = useState(studentId);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    api.get<ProgressHistory>(`/api/progress/${studentId}`)
      .then((res) => {
        setProgress(res.data);
      })
      .catch((fetchError) => {
        console.error(fetchError);
        setProgress(null);
        setError('Could not load progress yet. Play and save one run first.');
      });
  }, [studentId]);

  const loadStudentProgress = () => {
    const normalized = draftStudentId.trim() || 'demo_player';
    setStudentId(normalized);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('wasm_rpg_student_id', normalized);
    }
  };

  const totalScore = progress?.records.reduce((sum, r) => sum + r.score, 0) ?? 0;
  const completionPercentage = (progress?.records?.length ?? 0) > 0 
    ? Math.round(((progress?.records?.filter(r => r.completed).length ?? 0) / (progress?.records?.length ?? 1)) * 100)
    : 0;

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center overflow-y-auto overflow-x-hidden pt-24 md:pt-32 pb-20 px-4 md:px-8 with-scanlines">
      <div className="w-full max-w-3xl z-10 space-y-5">
        {/* Header Window */}
        <GBAWindow title="ADVENTURE LOG" width="w-full">
          <div className="space-y-4">
            {error && (
              <div className="p-3 border border-danger bg-danger/10 text-danger text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1">
                <label className="font-pixel text-[10px] text-gray-400 uppercase tracking-wider block mb-2">
                  Search Player
                </label>
                <input
                  type="text"
                  value={draftStudentId}
                  onChange={(event) => setDraftStudentId(event.target.value)}
                  placeholder="Enter student ID..."
                  className="w-full bg-window-dark border-2 border-window-border px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <GBAButton onClick={loadStudentProgress} size="md">
                LOAD PLAYER
              </GBAButton>
            </div>
          </div>
        </GBAWindow>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="gba-stat-container">
            <div className="gba-stat-label">PLAYER ID</div>
            <div className="text-sm text-window-text font-mono break-all">{studentId}</div>
          </div>
          <div className="gba-stat-container">
            <div className="gba-stat-label">LEVELS CLEARED</div>
            <div className="text-xl font-pixel text-secondary">{progress?.total_levels_completed ?? 0}</div>
          </div>
          <div className="gba-stat-container">
            <div className="gba-stat-label">BOSSES DEFEATED</div>
            <div className="text-xl font-pixel text-danger">{progress?.total_bosses_defeated ?? 0}</div>
          </div>
          <div className="gba-stat-container">
            <div className="gba-stat-label">TOTAL SCORE</div>
            <div className="text-xl font-pixel text-accent">{totalScore}</div>
          </div>
        </div>

        {/* Timeline Window */}
        <GBAWindow title="RUN HISTORY" width="w-full">
          {!progress || progress.records.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400 mb-3">No completed levels yet.</p>
              <p className="text-xs text-gray-500">Start the quiz to unlock dungeons and track your progress.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary Header */}
              <div className="mb-4 p-3 bg-window-border/20 border border-window-border/40 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-pixel text-[10px] text-gray-400">COMPLETION</span>
                  <span className="text-sm font-pixel text-primary">{completionPercentage}%</span>
                </div>
                <div className="gba-stat-bar">
                  <div 
                    className="gba-stat-fill bg-gradient-to-r from-green-500 to-emerald-600"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Run List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {progress.records.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`p-3 border-2 transition-colors ${
                      p.completed
                        ? 'border-success bg-success/10'
                        : 'border-warning bg-warning/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h3 className="font-pixel text-sm text-window-text uppercase tracking-wider">
                          Run #{progress.records.length - idx}: {p.level_name}
                        </h3>
                      </div>
                      <span className={`font-pixel text-[9px] px-2 py-1 border ${
                        p.completed
                          ? 'text-success border-success bg-success/20'
                          : 'text-warning border-warning bg-warning/20'
                      }`}>
                        {p.completed ? 'CLEARED' : 'ACTIVE'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-300 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Duration:</span>
                        <span>{p.time_seconds}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Score:</span>
                        <span className="text-accent font-pixel">+{p.score}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Boss:</span>
                        <span className={p.boss_defeated ? 'text-danger' : 'text-gray-500'}>
                          {p.boss_defeated ? '✓ Defeated' : '✗ Not Defeated'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GBAWindow>

        {/* Footer Info */}
        {progress && progress.records.length > 0 && (
          <GBAWindow title="STATS SUMMARY" width="w-full">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400 font-pixel text-[10px]">AVG SCORE</span>
                <div className="text-lg font-pixel text-accent mt-1">
                  {Math.round(totalScore / progress.records.length)}
                </div>
              </div>
              <div>
                <span className="text-gray-400 font-pixel text-[10px]">TOTAL TIME</span>
                <div className="text-lg font-pixel text-secondary mt-1">
                  {Math.floor(progress.records.reduce((sum, r) => sum + r.time_seconds, 0) / 60)}m
                </div>
              </div>
            </div>
          </GBAWindow>
        )}
      </div>
    </div>
  );
};

export default Progress;
