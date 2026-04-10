import { useEffect, useState } from 'react';
import api from '../lib/api';

type LessonPayload = {
  topic: string;
  title: string;
  explanation: string;
  pseudocode: string;
  example: string;
  checkpoints: string[];
  estimated_time_min: number;
  source: string;
};

type LessonViewProps = {
  studentId: string;
  topic: string;
  failedConcepts: string[];
  onBack: () => void;
  onContinue: () => void;
};

const LessonView = ({ studentId, topic, failedConcepts, onBack, onContinue }: LessonViewProps) => {
  const [lesson, setLesson] = useState<LessonPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadLesson = async () => {
      const normalizedTopic = topic.trim().toLowerCase().replace(/\s+/g, '_');

      try {
        setLoading(true);
        setError('');
        const response = await api.post<LessonPayload>('/api/lesson/generate', {
          student_id: studentId,
          topic: normalizedTopic,
          failed_concepts: failedConcepts,
        }, { timeout: 8000 });

        if (!cancelled) {
          setLesson(response.data);
        }
      } catch (requestError) {
        console.error('[Lesson] Generate failed, trying lesson cache endpoint:', requestError);

        try {
          const fallbackResponse = await api.get<LessonPayload>(`/api/lesson/${normalizedTopic}`, {
            params: { student_id: studentId },
            timeout: 5000,
          });

          if (!cancelled) {
            setLesson(fallbackResponse.data);
            setError('');
          }
        } catch (fallbackError) {
          console.error('[Lesson] Fallback fetch failed:', fallbackError);
          if (!cancelled) {
            setError('Lesson service is unavailable. You can still continue to the dungeon.');
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadLesson();

    return () => {
      cancelled = true;
    };
  }, [failedConcepts, studentId, topic]);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center overflow-y-auto overflow-x-hidden pt-24 md:pt-32 pb-20 px-4 md:px-8">
      <div className="w-full max-w-3xl z-10">
        <div className="game-panel rounded-xl p-6 md:p-8 border border-white/[0.08]">
          <div className="text-center mb-6">
            <span className="font-pixel text-[8px] tracking-[0.3em] text-secondary uppercase">Lesson Unlock</span>
            <h1 className="mt-3 font-pixel text-[14px] md:text-[16px] text-white tracking-wider">LEARN BEFORE BATTLE</h1>
            <p className="mt-3 text-sm text-gray-300">
              Failed topic: <span className="capitalize text-accent">{topic.replace(/_/g, ' ')}</span>
            </p>
          </div>

          {loading && (
            <div className="game-panel rounded-lg p-4 border border-white/[0.06]">
              <p className="font-pixel text-[9px] tracking-wider text-secondary">GENERATING LESSON...</p>
            </div>
          )}

          {!loading && lesson && (
            <div className="space-y-4">
              <div className="lesson-panel rounded-lg p-4 border border-white/[0.06]">
                <h2 className="font-pixel text-[10px] tracking-wider text-white">{lesson.title}</h2>
                <p className="mt-3 text-sm text-gray-200 leading-relaxed">{lesson.explanation}</p>
                <p className="mt-3 text-xs text-gray-400">
                  Estimated time: {lesson.estimated_time_min} min • Source: {lesson.source}
                </p>
              </div>

              <div className="lesson-panel rounded-lg p-4 border border-white/[0.06]">
                <h3 className="font-pixel text-[8px] tracking-widest text-gray-400 mb-2">PSEUDOCODE</h3>
                <pre className="pseudocode-block">{lesson.pseudocode}</pre>
              </div>

              <div className="lesson-panel rounded-lg p-4 border border-white/[0.06]">
                <h3 className="font-pixel text-[8px] tracking-widest text-gray-400 mb-2">EXAMPLE</h3>
                <p className="text-sm text-gray-200 leading-relaxed">{lesson.example}</p>
              </div>

              {lesson.checkpoints.length > 0 && (
                <div className="lesson-panel rounded-lg p-4 border border-white/[0.06]">
                  <h3 className="font-pixel text-[8px] tracking-widest text-gray-400 mb-2">LEARNING CHECKPOINTS</h3>
                  <ul className="space-y-2 text-sm text-gray-200">
                    {lesson.checkpoints.map((point, idx) => (
                      <li key={idx} className="lesson-checkpoint">✓ {point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!loading && error && (
            <div className="game-panel rounded-lg p-4 border border-danger/30 bg-danger/10">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-end mt-6">
            <button onClick={onBack} className="pixel-btn-ghost">Back</button>
            <button onClick={onContinue} className="pixel-btn">I Understand, Start Challenge</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonView;
