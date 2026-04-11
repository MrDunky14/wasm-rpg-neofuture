import { useState, useEffect } from 'react';
import api from '../lib/api';
import GBAButton from '../components/GBAButton';
import GBAWindow from '../components/GBAWindow';

type QuizOption = {
  id: string;
  text: string;
};

type QuizQuestion = {
  id: number;
  topic: string;
  question: string;
  options: QuizOption[];
};

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

type QuizProps = {
  onSubmit: (studentId: string, result: QuizResult) => void;
};

const Quiz = ({ onSubmit }: QuizProps) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [studentId, setStudentId] = useState(() => {
    if (typeof window === 'undefined') {
      return 'student_' + Date.now();
    }

    const stored = window.localStorage.getItem('wasm_rpg_student_id')?.trim();
    return stored || ('student_' + Date.now());
  });

  useEffect(() => {
    let cancelled = false;

    api.get<QuizQuestion[]>('/api/quiz/questions')
      .then((res) => {
        if (cancelled) return;
        const randomized = [...res.data].sort(() => Math.random() - 0.5).slice(0, 6);
        setQuestions(randomized);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        console.error(fetchError);
        setError('Unable to load quiz questions. Ensure backend is running and refresh.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async () => {
    if (questions.length === 0) {
      setError('No questions loaded yet.');
      return;
    }

    const payload = {
      student_id: studentId,
      answers: questions.map((q) => ({
        question_id: q.id,
        selected_option: answers[q.id] || 'a'
      }))
    };

    try {
      setSubmitting(true);
      setError('');
      const res = await api.post<QuizResult>('/api/quiz/submit', payload);
      console.log('Quiz Result:', res.data);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('wasm_rpg_student_id', studentId);
      }
      onSubmit(studentId, res.data);
    } catch (submitError) {
      console.error('Submit error:', submitError);
      setError('Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <GBAWindow title="LOADING" width="w-80">
          <p className="font-pixel text-xs text-secondary text-center animate-pulse">
            Loading Questions...
          </p>
        </GBAWindow>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <GBAWindow title="ERROR" width="w-96">
          <div className="text-center space-y-4">
            <p className="text-danger font-pixel text-[11px]">QUIZ UNAVAILABLE</p>
            <p className="text-sm text-gray-300">{error}</p>
            <GBAButton onClick={() => window.location.reload()} variant="red">
              Retry
            </GBAButton>
          </div>
        </GBAWindow>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center overflow-y-auto overflow-x-hidden pt-24 md:pt-32 pb-20 px-4 md:px-8 with-scanlines">
      <div className="w-full max-w-7xl z-10 space-y-5">
        {/* Header Window */}
        <GBAWindow title="DIAGNOSTIC QUIZ" width="w-full">
          <div className="space-y-4">
            <p className="text-xs text-gray-200">
              Answer 6 randomized questions to generate your adaptive dungeon.
            </p>
            <div>
              <label className="font-pixel text-[10px] text-gray-400 uppercase tracking-wider block mb-2">
                Student ID
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter your student ID"
                className="w-full bg-window-dark border-2 border-window-border px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </GBAWindow>

        {error && (
          <div className="gba-dialog border-danger/50 bg-red-950/20">
            <div className="text-danger font-pixel text-[11px] mb-2">ERROR</div>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Questions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {questions.map((q, index) => (
            <div key={q.id} className="gba-window w-full h-full">
              <div className="gba-window-title">
                Q{index + 1}: {q.topic.toUpperCase()}
              </div>
              <div className="gba-window-content space-y-4">
                <p className="text-sm leading-relaxed text-window-text font-inter">
                  {q.question}
                </p>

                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt.id;

                    return (
                      <label
                        key={opt.id}
                        className={`block p-3 border-2 cursor-pointer transition-all ${
                          selected
                            ? 'border-primary bg-primary/20'
                            : 'border-white/20 hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name={`q${q.id}`}
                            value={opt.id}
                            checked={selected}
                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                            className="mt-1 cursor-pointer"
                          />
                          <div className="flex-1">
                            <span className="font-pixel text-[9px] text-accent uppercase tracking-widest">
                              Option {opt.id}
                              {selected && ' ✓'}
                            </span>
                            <p className="text-sm text-gray-200 mt-1">{opt.text}</p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progress & Submit */}
        <div className="space-y-3">
          <div className="gba-stat-container">
            <div className="gba-stat-label">Progress</div>
            <div className="gba-stat-bar">
              <div
                className="gba-stat-fill bg-gradient-to-r from-green-500 to-emerald-600"
                style={{
                  width: `${((Object.keys(answers).length / questions.length) * 100)}%`,
                }}
              >
                <div className="gba-stat-text">
                  {Object.keys(answers).length}/{questions.length}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <GBAButton
              onClick={handleSubmit}
              disabled={submitting || Object.keys(answers).length < questions.length}
              variant="green"
              size="lg"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </GBAButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
