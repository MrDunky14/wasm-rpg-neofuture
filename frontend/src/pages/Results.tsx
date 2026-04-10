import { useState, useEffect } from 'react';
import api from '../lib/api';

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

type ResultsProps = {
  quizResult: QuizResult | null;
  onEnterDungeon: (level: any) => void;
};

const Results = ({ quizResult, onEnterDungeon }: ResultsProps) => {
  const [level, setLevel] = useState<any>(null);
  const [levelError, setLevelError] = useState('');
  const [levelLoading, setLevelLoading] = useState(false);

  useEffect(() => {
    if (!quizResult) {
      return;
    }

    if (quizResult.failed_topics.length === 0) {
      setLevel(null);
      setLevelError('');
      return;
    }

    setLevelLoading(true);
    setLevelError('');

    api.post<any[]>('/api/level/generate', {
      failed_topics: quizResult.failed_topics,
      difficulty: 1,
    })
      .then((res) => {
        setLevel(res.data[0] ?? null);
      })
      .catch((error) => {
        console.error(error);
        setLevelError('Could not generate dungeon level. Please try quiz again.');
      })
      .finally(() => {
        setLevelLoading(false);
      });
  }, [quizResult]);

  if (!quizResult) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="game-panel rounded-xl p-6 border border-white/[0.08] text-center">
          <h2 className="font-pixel text-[10px] text-secondary tracking-wider mb-3">NO QUIZ RESULT FOUND</h2>
          <p className="text-sm text-gray-300">Please complete the diagnostic quiz first.</p>
        </div>
      </div>
    );
  }

  const result = quizResult;

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center overflow-y-auto overflow-x-hidden pt-24 md:pt-32 pb-20 px-4 md:px-8">
      <div className="w-full max-w-3xl z-10">
        <div className="game-panel rounded-xl p-6 md:p-8 border border-white/[0.08]">
          <div className="text-center mb-6">
            <span className="font-pixel text-[8px] tracking-[0.3em] text-secondary">DIAGNOSTIC COMPLETE</span>
            <h1 className="mt-3 font-pixel text-[14px] md:text-[16px] text-white tracking-wider">QUIZ RESULTS</h1>
          </div>

          <div className="game-panel rounded-lg p-4 border border-white/[0.06] mb-5">
            <h2 className="font-sans text-xl text-white mb-2">
              Score: {result.percentage.toFixed(1)}% ({result.total_score}/{result.total_questions})
            </h2>
            <p className="text-sm text-gray-300">
              {result.failed_topics.length > 0
                ? `Topics to review: ${result.failed_topics.join(', ')}`
                : 'Great run. You passed all topics.'}
            </p>
          </div>

          <div className="mb-5">
            <h3 className="font-pixel text-[8px] text-gray-500 tracking-widest mb-3">TOPIC BREAKDOWN</h3>
            <div className="space-y-2">
              {result.topic_scores.map((ts) => (
                <div
                  key={ts.topic}
                  className={[
                    'p-3 rounded border flex items-center justify-between',
                    ts.passed ? 'bg-success/10 border-success/30' : 'bg-danger/10 border-danger/30',
                  ].join(' ')}
                >
                  <span className="font-medium text-white capitalize">{ts.topic.replace(/_/g, ' ')}</span>
                  <span className={['font-pixel text-[8px] tracking-wider', ts.passed ? 'text-success' : 'text-danger'].join(' ')}>
                    {ts.correct}/{ts.total} {ts.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {levelError && <p className="text-danger text-sm mb-3">{levelError}</p>}
          {levelLoading && <p className="text-sm text-gray-300 mb-3">Generating dungeon...</p>}

          <div className="flex justify-end">
            {level && (
              <button onClick={() => onEnterDungeon(level)} className="pixel-btn">
                Enter Dungeon
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
