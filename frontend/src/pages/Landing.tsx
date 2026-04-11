import { useNavigate } from 'react-router-dom';
import GBAButton from '../components/GBAButton';
import GBAWindow from '../components/GBAWindow';

const regions = [
  { title: 'TOWER OF LIFO', topic: 'Stacks & Queues', emoji: '🏰', color: 'secondary', open: true },
  { title: 'QUEUE CAVERNS', topic: 'FIFO Mechanics', emoji: '🌀', color: 'success', open: true },
  { title: 'SORTING ARENA', topic: 'Search & Sort', emoji: '⚙️', color: 'accent', open: true },
  { title: 'RECURSION RIFT', topic: 'Recursive Patterns', emoji: '🧠', color: 'primary', open: false },
];

const colorMap: Record<string, { border: string; glow: string; text: string; stripe: string }> = {
  secondary: { border: 'border-secondary/60', glow: 'shadow-[0_0_24px_rgba(6,182,212,0.3)]', text: 'text-secondary', stripe: 'bg-secondary/30' },
  success: { border: 'border-success/60', glow: 'shadow-[0_0_24px_rgba(34,197,94,0.3)]', text: 'text-success', stripe: 'bg-success/30' },
  accent: { border: 'border-accent/60', glow: 'shadow-[0_0_24px_rgba(245,158,11,0.3)]', text: 'text-accent', stripe: 'bg-accent/30' },
  primary: { border: 'border-primary/60', glow: 'shadow-[0_0_24px_rgba(124,58,237,0.3)]', text: 'text-primary', stripe: 'bg-primary/30' },
};

export const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center overflow-y-auto overflow-x-hidden pt-28 md:pt-36 pb-20 px-4 md:px-8 with-scanlines">
      <div className="absolute top-[10%] left-[8%] w-[360px] h-[360px] bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[8%] right-[10%] w-[420px] h-[420px] bg-secondary/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Header Window */}
      <section className="relative z-10 w-full max-w-4xl mx-auto">
        <GBAWindow title="WASM RPG NEO-FUTURE" width="w-full" className="mb-8 animate-bounce-in">
          <div className="text-center space-y-4">
            <div className="font-pixel text-[10px] text-primary/80 tracking-widest uppercase">
              📡 AI-Native Learning Engine
            </div>
            <h1 className="gba-title text-2xl md:text-3xl">
              ADaptive LEarning Quest
            </h1>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
              Diagnose weak concepts with a quiz, then enter an adaptive dungeon generated from your mistakes. Learn DSA by surviving it.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <GBAButton variant="green" size="lg" onClick={() => navigate('/quiz')}>
                ▶ BEGIN DIAGNOSTIC
              </GBAButton>
              <GBAButton onClick={() => navigate('/progress')} size="lg">
                📖 ADVENTURE LOG
              </GBAButton>
            </div>
          </div>
        </GBAWindow>
      </section>

      {/* Region Selection */}
      <section className="relative z-10 w-full max-w-5xl mx-auto pt-8">
        <GBAWindow title="SELECT REGION" width="w-full" className="mb-6">
          <p className="text-sm text-gray-300 text-center">
            Choose a dungeon region to begin your adventure
          </p>
        </GBAWindow>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {regions.map((region) => {
            const color = colorMap[region.color];

            return (
              <button
                key={region.title}
                onClick={() => region.open && navigate('/quiz')}
                className={`retro-card rounded-sm p-4 transition-all duration-300 text-left border-4 ${
                  region.open
                    ? `${color.border} hover:border-primary hover:-translate-y-1 cursor-pointer`
                    : 'border-gray-700 opacity-50 cursor-not-allowed grayscale'
                }`}
                disabled={!region.open}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4 pb-3 border-b-2 border-slate-700">
                  <span className="text-3xl md:text-4xl select-none animate-idle-bob">
                    {region.emoji}
                  </span>
                  <span
                    className={`font-pixel text-[7px] tracking-widest px-2 py-1 border border-current ${
                      region.open
                        ? `${color.text} bg-${region.color}/10`
                        : 'text-danger border-danger/50'
                    }`}
                  >
                    {region.open ? 'OPEN' : 'LOCKED'}
                  </span>
                </div>

                {/* Card Content */}
                <h2 className="font-pixel text-[9px] tracking-wider leading-relaxed mb-2 text-window-text uppercase">
                  {region.title}
                </h2>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">{region.topic}</p>

                {/* Stats */}
                {region.open && (
                  <div className="space-y-1 text-[8px] text-gray-500 mb-3">
                    <div className="flex justify-between">
                      <span>Difficulty:</span>
                      <span className="text-accent">▂▄▆</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Enemies:</span>
                      <span className="text-secondary">5-8</span>
                    </div>
                  </div>
                )}

                {/* Enter Button for open regions */}
                {region.open && (
                  <div className="gba-btn text-[7px] w-full text-center py-2 font-pixel tracking-wider">
                    ENTER ▶
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Footer Info */}
      <section className="relative z-10 mt-12 text-center w-full max-w-2xl">
        <GBAWindow title="GAME INFO" width="w-full">
          <div className="space-y-3 text-sm">
            <p className="font-pixel text-[8px] text-primary tracking-wider">
              QUIZ ➜ DUNGEON ➜ MASTERY
            </p>
            <p className="text-xs text-gray-400">
              Diagnose your weaknesses through adaptive assessment. Complete dungeons to reinforce learning objectives.
            </p>
            <p className="text-xs text-gray-500 italic">
              Built with React, FastAPI, and WASM technology
            </p>
          </div>
        </GBAWindow>
      </section>
    </div>
  );
};
