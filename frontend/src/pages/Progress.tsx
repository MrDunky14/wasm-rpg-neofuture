import { useState, useEffect } from 'react';
import api from '../lib/api';

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
  const [studentId] = useState('demo_player');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<ProgressHistory>(`/api/progress/${studentId}`)
      .then((res) => {
        setProgress(res.data);
      })
      .catch((fetchError) => {
        console.error(fetchError);
        setError('Could not load progress yet. Play and save one run first.');
      });
  }, [studentId]);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center overflow-y-auto overflow-x-hidden pt-24 md:pt-32 pb-20 px-4 md:px-8">
      <div className="w-full max-w-3xl z-10 space-y-5">
        <div className="game-panel rounded-xl p-5 md:p-6 border border-white/[0.08]">
          <h1 className="font-pixel text-[11px] md:text-[12px] text-secondary tracking-wider">ADVENTURE LOG</h1>
          {error && <p className="text-danger text-sm mt-2">{error}</p>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <div className="game-panel rounded p-3 border border-white/[0.05]">
              <div className="font-pixel text-[7px] text-gray-500">PLAYER</div>
              <div className="text-xs text-gray-200 mt-1 break-all">{studentId}</div>
            </div>
            <div className="game-panel rounded p-3 border border-white/[0.05]">
              <div className="font-pixel text-[7px] text-gray-500">LEVELS</div>
              <div className="font-pixel text-[10px] text-white mt-1">{progress?.total_levels_completed ?? 0}</div>
            </div>
            <div className="game-panel rounded p-3 border border-white/[0.05]">
              <div className="font-pixel text-[7px] text-gray-500">BOSSES</div>
              <div className="font-pixel text-[10px] text-white mt-1">{progress?.total_bosses_defeated ?? 0}</div>
            </div>
            <div className="game-panel rounded p-3 border border-white/[0.05]">
              <div className="font-pixel text-[7px] text-gray-500">SCORE</div>
              <div className="font-pixel text-[10px] text-accent mt-1">{progress?.records.reduce((sum, r) => sum + r.score, 0) ?? 0}</div>
            </div>
          </div>
        </div>

        <div className="game-panel rounded-xl p-5 md:p-6 border border-white/[0.08]">
          <h2 className="font-pixel text-[9px] text-gray-400 tracking-widest mb-4">TIMELINE</h2>
          {!progress || progress.records.length === 0 ? (
            <p className="text-sm text-gray-400">No completed levels yet. Start the quiz to unlock dungeons.</p>
          ) : (
            <div className="space-y-2">
              {progress.records.map((p) => (
                <div key={p.id} className="p-3 rounded border border-success/30 bg-success/10">
                  <div className="font-medium text-white">{p.level_name}</div>
                  <div className="text-xs text-gray-300 mt-1">
                    {p.completed ? 'Completed' : 'In Progress'} • {p.time_seconds}s • +{p.score} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Progress;
