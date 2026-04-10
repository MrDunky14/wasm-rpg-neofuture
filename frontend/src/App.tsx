import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import api from './lib/api';
import Home from './pages/Home';
import Quiz from './pages/Quiz';
import Results from './pages/Results';
import Game from './pages/Game';
import Progress from './pages/Progress';
import Map from './pages/Map';
import LessonView from './pages/LessonView';
import ChallengeRoom from './pages/ChallengeRoom';
import Navbar from './components/Navbar';
import type { LevelData } from './types/level';

type TopicScore = {
  topic: string;
  correct: number;
  total: number;
  passed: boolean;
};

type QuizResult = {
  student_id: string;
  total_score: number;
  total_questions: number;
  percentage: number;
  topic_scores: TopicScore[];
  failed_topics: string[];
};

type DungeonEntry = {
  level: LevelData;
  topic: string;
  failedConcepts: string[];
  studentId: string;
};

type GameRouteProps = {
  currentLevel: LevelData | null;
  challengeCleared: boolean;
  entry: DungeonEntry | null;
};

function GameRouteHandler(props: GameRouteProps) {
  const [searchParams] = useSearchParams();
  const [levelFromTopic, setLevelFromTopic] = useState<LevelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const topic = searchParams.get('topic');
    
    if (topic && !props.currentLevel && !levelFromTopic) {
      setIsLoading(true);
      setLoadError('');
      
      api.get<LevelData>(`/api/level/prebuilt/${topic}`)
        .then((res) => {
          if (!cancelled) {
            setLevelFromTopic(res.data);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            console.error('Failed to load level:', err);
            setLoadError('Could not load dungeon. Please try again from the map.');
            setIsLoading(false);
          }
        });
    }
    
    return () => {
      cancelled = true;
    };
  }, [searchParams, props.currentLevel, levelFromTopic]);

  const level = props.currentLevel || levelFromTopic;
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="game-panel rounded-xl p-6 text-center border border-white/[0.08]">
          <h2 className="font-pixel text-[11px] tracking-wider text-secondary mb-4">LOADING DUNGEON</h2>
          <p className="text-sm text-gray-300">Preparing your adventure...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="game-panel rounded-xl p-6 text-center border border-danger/20">
          <h2 className="font-pixel text-[11px] tracking-wider text-danger mb-4">LOAD FAILED</h2>
          <p className="text-sm text-gray-300 mb-4">{loadError}</p>
          <div className="flex gap-3 justify-center">
            <button className="pixel-btn" onClick={() => navigate('/map')}>Back To Map</button>
            <button className="pixel-btn-ghost" onClick={() => navigate('/quiz')}>New Quiz</button>
          </div>
        </div>
      </div>
    );
  }

  if (!level) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="game-panel rounded-xl p-6 text-center border border-white/[0.08]">
          <h2 className="font-pixel text-[11px] tracking-wider text-secondary mb-4">NO LEVEL LOADED</h2>
          <p className="text-sm text-gray-300 mb-6">Complete quiz, lesson, and challenge before entering dungeon.</p>
          <button className="pixel-btn" onClick={() => navigate('/quiz')}>Go To Quiz</button>
        </div>
      </div>
    );
  }

  const studentId = props.entry?.studentId || (typeof window !== 'undefined' ? window.localStorage.getItem('wasm_rpg_student_id') : null) || 'anonymous';
  
  return <Game level={level} studentId={studentId} />;
}

function App() {
  const navigate = useNavigate();
  const [currentLevel, setCurrentLevel] = useState<LevelData | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [entry, setEntry] = useState<DungeonEntry | null>(null);
  const [challengeCleared, setChallengeCleared] = useState(false);

  return (
    <div className="min-h-screen w-full bg-background text-white">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/quiz" element={
          <Quiz onSubmit={(studentId, result) => {
            console.log('Quiz submitted by:', studentId);
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('wasm_rpg_student_id', studentId);
            }
            setCurrentLevel(null);
            setEntry(null);
            setChallengeCleared(false);
            setQuizResult(result);
            navigate('/results');
          }} />
        } />

        <Route path="/results" element={
          <Results
            quizResult={quizResult}
            onEnterDungeon={(nextEntry) => {
            setCurrentLevel(nextEntry.level);
            setEntry(nextEntry);
            setChallengeCleared(false);
            navigate('/lesson');
            }}
          />
        } />

        <Route path="/lesson" element={
          entry ? (
            <LessonView
              studentId={entry.studentId}
              topic={entry.topic}
              failedConcepts={entry.failedConcepts}
              onBack={() => navigate('/results')}
              onContinue={() => navigate('/challenge')}
            />
          ) : (
            <div className="min-h-screen flex items-center justify-center px-4">
              <div className="game-panel rounded-xl p-6 text-center border border-white/[0.08]">
                <h2 className="font-pixel text-[11px] tracking-wider text-secondary mb-4">NO LESSON CONTEXT</h2>
                <p className="text-sm text-gray-300 mb-6">Generate a dungeon from quiz results first.</p>
                <button className="pixel-btn" onClick={() => navigate('/results')}>Back To Results</button>
              </div>
            </div>
          )
        } />

        <Route path="/challenge" element={
          entry ? (
            <ChallengeRoom
              topic={entry.topic}
              onBack={() => navigate('/lesson')}
              onComplete={() => {
                setChallengeCleared(true);
                navigate('/game');
              }}
            />
          ) : (
            <div className="min-h-screen flex items-center justify-center px-4">
              <div className="game-panel rounded-xl p-6 text-center border border-white/[0.08]">
                <h2 className="font-pixel text-[11px] tracking-wider text-secondary mb-4">NO CHALLENGE CONTEXT</h2>
                <p className="text-sm text-gray-300 mb-6">Start from quiz results to unlock your challenge room.</p>
                <button className="pixel-btn" onClick={() => navigate('/results')}>Back To Results</button>
              </div>
            </div>
          )
        } />

        <Route path="/game" element={
          <GameRouteHandler
            currentLevel={currentLevel}
            challengeCleared={challengeCleared}
            entry={entry}
          />
        } />

        <Route path="/map" element={<Map />} />

        <Route path="/progress" element={<Progress />} />
      </Routes>
    </div>
  );
}

export default App;
