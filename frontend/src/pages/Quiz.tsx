import { useState, useEffect } from 'react';
import api from '../lib/api';

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
        <div className="game-panel rounded-xl px-6 py-5 border border-white/[0.08]">
          <p className="font-pixel text-[9px] text-secondary tracking-widest">LOADING QUESTIONS...</p>
        </div>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="game-panel rounded-xl p-6 border border-danger/40 max-w-md text-center">
          <h2 className="font-pixel text-[10px] text-danger tracking-wider mb-3">QUIZ UNAVAILABLE</h2>
          <p className="text-sm text-gray-300 mb-5">{error}</p>
          <button onClick={() => window.location.reload()} className="pixel-btn">
          Retry
        </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center overflow-y-auto overflow-x-hidden pt-24 md:pt-32 pb-20 px-4 md:px-8">
      <div className="w-full max-w-4xl z-10 space-y-5">
        <div className="game-panel pixel-border rounded-lg p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="font-pixel text-[11px] md:text-[12px] text-secondary tracking-wider">DIAGNOSTIC QUIZ</h1>
            <p className="text-xs text-gray-400 mt-2">Answer 6 randomized questions to generate your adaptive dungeon.</p>
          </div>
          <div className="min-w-[220px]">
            <label className="font-pixel text-[7px] text-gray-500 tracking-widest">STUDENT ID</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Student ID"
              className="mt-2 w-full bg-[#0b1224] border border-white/[0.12] rounded px-3 py-2 text-sm text-white outline-none focus:border-secondary"
            />
          </div>
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        {questions.map((q, index) => (
          <div key={q.id} className="game-panel rounded-xl p-5 md:p-6 border border-white/[0.08]">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-sans text-base md:text-lg text-white leading-relaxed">
                {index + 1}. {q.question}
              </h2>
              <span className="font-pixel text-[7px] text-accent uppercase tracking-widest">{q.topic}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-4">
              {q.options.map((opt) => {
                const selected = answers[q.id] === opt.id;

                return (
                  <label
                    key={opt.id}
                    className={[
                      'flex items-center gap-3 p-3 rounded border cursor-pointer transition-all',
                      selected
                        ? 'border-secondary/70 bg-secondary/10 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03]',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name={`q${q.id}`}
                      value={opt.id}
                      checked={selected}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    />
                    <span className="text-sm text-gray-200">
                      <span className="font-pixel text-[8px] text-gray-400 mr-2 uppercase">{opt.id}</span>
                      {opt.text}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex justify-end pt-2">
          <button onClick={handleSubmit} disabled={submitting} className="pixel-btn disabled:opacity-60">
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
