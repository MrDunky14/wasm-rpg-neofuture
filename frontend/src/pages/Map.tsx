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
    <div className="fixed inset-0 z-50 bg-[#020205] flex flex-col items-center justify-center overflow-auto p-4 md:p-8">
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-1/2 -translate-x-1/2 md:top-6 z-20 pixel-btn-ghost text-[7px] py-1.5 px-3 opacity-70 hover:opacity-100"
      >
        Exit To Home
      </button>

      <div className="w-full max-w-6xl mt-12">
        <h1 className="font-pixel text-[14px] md:text-[16px] text-secondary tracking-wider text-center mb-3">
          WORLD MAP
        </h1>
        <p className="text-center text-gray-400 text-sm mb-8">
          Select a dungeon to explore and master its concepts.
        </p>

        {error && (
          <div className="rounded p-3 mb-6 border border-yellow-500/40 bg-yellow-500/10 text-yellow-200 text-xs text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400">
            <p>Loading dungeons...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {levels.map((level) => (
              <div
                key={level.topic}
                className="game-panel rounded-lg p-5 border border-white/[0.07] hover:border-cyan-500/50 transition-all cursor-pointer group"
                onClick={() => handleSelectLevel(level.topic)}
              >
                {/* Level thumbnail placeholder */}
                <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-secondary/20 rounded mb-4 flex items-center justify-center border border-white/[0.1] group-hover:border-secondary/30 transition-all">
                  <div className="text-4xl">{'🗺️'}</div>
                </div>

                {/* Level info */}
                <h2 className="font-pixel text-[10px] text-white tracking-wider mb-2 uppercase">
                  {level.topic}
                </h2>
                <p className="text-xs text-gray-300 mb-3 leading-relaxed">
                  {level.description}
                </p>

                {/* Level stats */}
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Difficulty:</span>
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
                  <div className="flex justify-between">
                    <span className="text-gray-500">Enemies:</span>
                    <span className="text-secondary">{level.enemies_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Boss:</span>
                    <span className="text-accent">
                      {level.boss_present ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                {/* Select button */}
                <button
                  className="pixel-btn-ghost text-[7px] py-2 px-4 w-full mt-4 group-hover:border-primary transition-all"
                  disabled={selectedTopic === level.topic}
                >
                  {selectedTopic === level.topic ? 'LOADING...' : 'ENTER DUNGEON'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Bottom info */}
        <div className="mt-12 text-center text-gray-500 text-xs">
          <p>
            Logged in as:{' '}
            <span className="text-secondary font-pixel">{studentId}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Map;
