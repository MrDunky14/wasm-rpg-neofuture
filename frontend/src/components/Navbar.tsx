import { Link, useLocation } from 'react-router-dom';

const navItemClass = (active: boolean) =>
  [
    'game-panel pixel-border px-3 md:px-4 py-2 rounded font-pixel text-[8px] md:text-[9px] tracking-wider transition-colors',
    active ? 'text-secondary border-secondary/40' : 'text-gray-500 hover:text-white',
  ].join(' ');

export default function Navbar() {
  const { pathname } = useLocation();

  if (pathname === '/game') {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 w-full z-[100] pointer-events-none">
      <div className="flex items-center justify-between p-3 md:p-5">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link to="/" className="relative group shrink-0">
            <div className="w-11 h-11 md:w-14 md:h-14 rounded-lg overflow-hidden game-panel pixel-border flex items-center justify-center group-hover:border-primary/60 transition-colors">
              <img
                src="/game-assets/player-face.png"
                alt="Player"
                className="w-8 h-8 md:w-10 md:h-10 object-contain"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 bg-primary text-white font-pixel text-[7px] md:text-[8px] rounded px-1.5 py-0.5 border border-background leading-none shadow-md">
              L1
            </span>
          </Link>

          <div className="hidden sm:flex flex-col gap-1">
            <span className="font-pixel text-[8px] md:text-[9px] text-white/80 tracking-wider leading-none">
              ADVENTURER
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-pixel text-[7px] text-danger w-3">HP</span>
              <div className="stat-bar w-20 md:w-28">
                <div
                  className="stat-bar-fill bg-danger shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                  style={{ width: '100%' }}
                />
              </div>
              <span className="font-pixel text-[7px] text-gray-500 w-10 text-right">100</span>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-2 pointer-events-auto">
          <Link to="/" className={navItemClass(pathname === '/')}>
            MAP
          </Link>
          <Link to="/quiz" className={navItemClass(pathname === '/quiz')}>
            QUIZ
          </Link>
          <Link to="/progress" className={navItemClass(pathname === '/progress')}>
            LOG
          </Link>
        </nav>
      </div>
    </header>
  );
}
