import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { LevelData } from '../types/level';

type BackendLevel = {
  topic: string;
  filename: string;
  exists: boolean;
};

type PrebuiltLevel = {
  topic: string;
  description: string;
  difficulty: string;
  enemies_count: number;
  boss_present: boolean;
};

const Map = () => {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<PrebuiltLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [studentId] = useState(() => {
    if (typeof window === 'undefined') return 'demo_player';
    return window.localStorage.getItem('wasm_rpg_student_id') || 'demo_player';
  });

  useEffect(() => {
    let cancelled = false;
    
    const loadLevels = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get<{levels: BackendLevel[]}>('/api/level/list-prebuilt');
        
        if (cancelled) return;
        
        // Only include levels that exist, map to display format
        const mappedLevels: PrebuiltLevel[] = (res.data.levels || [])
          .filter((l) => l.exists)
          .map((l) => ({
            topic: l.topic,
            description: `${l.topic.charAt(0).toUpperCase() + l.topic.slice(1)} Challenge`,
            difficulty: ['stack', 'queue'].includes(l.topic) ? 'Medium' : 'Hard',
            enemies_count: ['stack', 'queue'].includes(l.topic) ? 4 : 5,
            boss_present: true,
          }));
        setLevels(mappedLevels);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load levels:', err);
        setError('Could not load available dungeons. Using demo levels.');
        // Fallback demo levels
        setLevels([
          {
            topic: 'stack',
            description: 'Stack Fundamentals - LIFO data structure',
            difficulty: 'Easy',
            enemies_count: 3,
            boss_present: true,
          },
          {
            topic: 'queue',
            description: 'Queue Fundamentals - FIFO data structure',
            difficulty: 'Medium',
            enemies_count: 4,
            boss_present: true,
          },
          {
            topic: 'sorting',
            description: 'Sorting Algorithms - Multiple strategies',
            difficulty: 'Hard',
            enemies_count: 5,
            boss_present: true,
          },
        ]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadLevels();
    
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectLevel = async (topic: string) => {
    setSelectedTopic(topic);
    try {
      // Fetch the pre-built level for the selected topic
      await api.get<LevelData>('/api/level/prebuilt/' + topic);
      // Store level in sessionStorage for the game to pick up
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('selected_level_topic', topic);
      }
      // Navigate to game with the level loaded
      navigate(`/game?topic=${topic}`);
    } catch (err) {
      console.error('Failed to load level:', err);
      setError('Could not load the selected dungeon.');
      setSelectedTopic(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#020205] flex flex-col items-center justify-center overflow-auto p-4 md:p-8 with-scanlines">
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-1/2 -translate-x-1/2 md:top-6 z-20 pixel-btn-ghost text-[7px] py-1.5 px-3 opacity-70 hover:opacity-100"
      >
        ◀ Back To Home
      </button>

      <div className="w-full max-w-6xl mt-12">
        {/* World Map Title */}
        <div className="text-center mb-8">
          <h1 className="gba-title text-2xl md:text-3xl mb-3">WORLD MAP</h1>
          <p className="text-center text-gray-400 text-sm">
            Select a dungeon to explore and master its concepts.
          </p>
        </div>

        {error && (
          <div
            className="gba-window mb-6 border-amber-600"
            role="alert"
            aria-live="polite"
          >
            <div className="gba-window-title bg-amber-600">WARNING</div>
            <div className="gba-window-content text-amber-200">{error}</div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-live="polite" aria-busy="true">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                className="retro-card rounded-sm p-4 animate-pulse"
              >
                <div className="w-full h-32 bg-slate-700/50 rounded-sm mb-4 border-2 border-slate-600" />
                <div className="h-3 bg-slate-700/50 rounded w-1/2 mb-3" />
                <div className="h-2 bg-slate-700/50 rounded w-4/5 mb-2" />
                <div className="h-2 bg-slate-700/50 rounded w-3/5 mb-4" />
                <div className="h-6 bg-slate-700/50 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {levels.map((level) => (
              <button
                key={level.topic}
                onClick={() => handleSelectLevel(level.topic)}
                disabled={selectedTopic === level.topic}
                className="retro-card rounded-sm p-0 border-4 hover:border-primary/80 transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                {/* Card top section with icon */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 border-b-4 border-slate-600">
                  <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                    {'⚔️'}
                  </div>
                  <h2 className="font-pixel text-xs text-window-border tracking-wider uppercase text-left">
                    {level.topic}
                  </h2>
                </div>

                {/* Card content */}
                <div className="bg-slate-900/80 p-4">
                  <p className="text-xs text-gray-300 mb-4 text-left leading-relaxed">
                    {level.description}
                  </p>

                  {/* Stats Grid */}
                  <div className="space-y-2 text-[10px] mb-4">
                    <div className="flex justify-between items-center font-pixel">
                      <span className="text-gray-400">DIFFICULTY:</span>
                      <span
                        className={
                          level.difficulty === 'Easy'
                            ? 'text-success'
                            : level.difficulty === 'Medium'
                            ? 'text-accent'
                            : 'text-danger'
                        }
                      >
                        {level.difficulty}
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-pixel">
                      <span className="text-gray-400">ENEMIES:</span>
                      <span className="text-secondary">{level.enemies_count}</span>
                    </div>
                    <div className="flex justify-between items-center font-pixel">
                      <span className="text-gray-400">BOSS:</span>
                      <span className="text-accent">
                        {level.boss_present ? '✓' : '×'}
                      </span>
                    </div>
                  </div>

                  {/* Enter Button */}
                  <div className="gba-btn text-[8px] w-full text-center py-2 font-pixel tracking-wider">
                    {selectedTopic === level.topic ? 'LOADING...' : 'ENTER'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Bottom info panel */}
        <div className="mt-12">
          <div className="gba-window w-full md:w-96 mx-auto">
            <div className="gba-window-title">SESSION INFO</div>
            <div className="gba-window-content">
              <div className="font-pixel text-[8px] text-gray-400 uppercase mb-2">PLAYER ID</div>
              <div className="font-mono text-sm text-window-text break-all">{studentId}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;
