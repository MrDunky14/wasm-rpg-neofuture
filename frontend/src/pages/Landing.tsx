import { useNavigate } from 'react-router-dom';

const regions = [
  { title: 'The Tower of LIFO', topic: 'Stacks & Queues', emoji: '🏰', color: 'secondary', open: true },
  { title: 'Queue Caverns', topic: 'FIFO Mechanics', emoji: '🌀', color: 'success', open: true },
  { title: 'Sorting Arena', topic: 'Search & Sort', emoji: '⚙️', color: 'accent', open: true },
  { title: 'Recursion Rift', topic: 'Recursive Patterns', emoji: '🧠', color: 'primary', open: false },
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
    <div className="relative min-h-screen w-full flex flex-col items-center overflow-y-auto overflow-x-hidden pt-28 md:pt-36 pb-20 px-4 md:px-8">
      <div className="absolute top-[10%] left-[8%] w-[360px] h-[360px] bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[8%] right-[10%] w-[420px] h-[420px] bg-secondary/10 rounded-full blur-[160px] pointer-events-none" />

      <section className="relative z-10 text-center w-full max-w-4xl mx-auto">
        <span className="font-pixel text-[8px] md:text-[9px] text-primary/70 tracking-[0.4em] uppercase">AI-Native Learning Engine</span>
        <h1 className="mt-3 font-pixel text-2xl md:text-4xl lg:text-5xl text-white tracking-wider leading-relaxed">
          WASM <span className="text-secondary text-glow">BOUNDARIES</span>
        </h1>
        <p className="mt-5 text-gray-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Diagnose weak concepts with a quiz, then enter an adaptive dungeon generated from your mistakes.
          Learn DSA by surviving it.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="pixel-btn" onClick={() => navigate('/quiz')}>Begin Diagnostic</button>
          <button className="pixel-btn-ghost" onClick={() => navigate('/progress')}>Adventure Log</button>
        </div>
      </section>

      <section className="relative z-10 w-full max-w-5xl mx-auto pt-10 md:pt-14">
        <div className="text-center mb-8 md:mb-10">
          <span className="font-pixel text-[9px] md:text-[10px] text-gray-500 tracking-[0.3em] uppercase">Select Region</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {regions.map((region) => {
            const color = colorMap[region.color];

            return (
              <button
                key={region.title}
                onClick={() => region.open && navigate('/quiz')}
                className={[
                  'group relative game-panel rounded-xl p-5 md:p-6 transition-all duration-300 text-left border-2',
                  region.open ? `${color.border} hover:-translate-y-1 ${color.glow}` : 'border-gray-800/60 opacity-50 cursor-not-allowed grayscale',
                ].join(' ')}
                disabled={!region.open}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl md:text-4xl select-none animate-float drop-shadow-lg">{region.emoji}</span>
                  <span className={`font-pixel text-[7px] tracking-widest ${region.open ? `${color.text} opacity-70` : 'text-danger/80'}`}>
                    {region.open ? 'OPEN' : 'LOCKED'}
                  </span>
                </div>

                <h2 className="font-pixel text-[10px] md:text-[11px] tracking-wider leading-relaxed mb-2 text-white">
                  {region.title}
                </h2>
                <p className="text-xs text-gray-400 leading-relaxed">{region.topic}</p>

                {region.open && <div className={`absolute bottom-0 left-0 w-full h-[3px] rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity ${color.stripe}`} />}
              </button>
            );
          })}
        </div>
      </section>

      <p className="relative z-10 mt-10 font-pixel text-[7px] tracking-[0.25em] text-gray-600 text-center">
        QUIZ TO DUNGEON TO MASTERY
      </p>
      <p className="relative z-10 mt-2 text-xs text-gray-500 text-center">
        Visual assets selected from member2/assests and UI style selected from member1 frontend.
      </p>
    </div>
  );
};
