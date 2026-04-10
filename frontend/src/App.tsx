import { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import Quiz from './pages/Quiz';
import Results from './pages/Results';
import Game from './pages/Game';
import Progress from './pages/Progress';
import Navbar from './components/Navbar';

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

function App() {
  const navigate = useNavigate();
  const [currentLevel, setCurrentLevel] = useState<any>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  return (
    <div className="min-h-screen w-full bg-background text-white">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route path="/quiz" element={
          <Quiz onSubmit={(studentId, result) => {
            console.log('Quiz submitted by:', studentId);
            setQuizResult(result);
            navigate('/results');
          }} />
        } />

        <Route path="/results" element={
          <Results
            quizResult={quizResult}
            onEnterDungeon={(level) => {
            setCurrentLevel(level);
            navigate('/game');
            }}
          />
        } />

        <Route path="/game" element={
          currentLevel ? (
            <Game level={currentLevel} />
          ) : (
            <div className="min-h-screen flex items-center justify-center px-4">
              <div className="game-panel rounded-xl p-6 text-center border border-white/[0.08]">
                <h2 className="font-pixel text-[11px] tracking-wider text-secondary mb-4">NO LEVEL LOADED</h2>
                <p className="text-sm text-gray-300 mb-6">Complete the quiz and generate a dungeon first.</p>
                <button className="pixel-btn" onClick={() => navigate('/quiz')}>Go To Quiz</button>
              </div>
            </div>
          )
        } />

        <Route path="/progress" element={<Progress />} />
      </Routes>
    </div>
  );
}

export default App;
