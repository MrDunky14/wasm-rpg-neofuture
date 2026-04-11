import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ParallaxLayer = {
  id: string;
  depth: number;
  speed: number;
  color: string;
};

const Home = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  
  const parallaxLayers: ParallaxLayer[] = [
    { id: 'sky', depth: 0.1, speed: 0.05, color: '#0a0e1a' },
    { id: 'stars', depth: 0.2, speed: 0.1, color: '#1a1f3a' },
    { id: 'mountains-far', depth: 0.3, speed: 0.15, color: '#0f1628' },
    { id: 'mountains-mid', depth: 0.5, speed: 0.25, color: '#1a2a4a' },
    { id: 'mountains-near', depth: 0.7, speed: 0.35, color: '#2a3a5a' },
    { id: 'foreground', depth: 1.0, speed: 0.5, color: '#3a4a6a' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        setScrollY(window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const generatePixelMountains = (
    width: number,
    height: number,
    seed: number,
    complexity: number
  ): string => {
    let pathData = `M 0,${height}`;
    const segmentWidth = width / complexity;
    let currentY = height * 0.6;

    for (let i = 0; i <= complexity; i++) {
      const x = i * segmentWidth;
      const noise = Math.sin(i * seed + seed * 12.9898) * 0.5 + 0.5;
      const nextY = height * 0.3 + (height * 0.4 * noise);
      
      // Pixel-step effect
      pathData += ` L ${x},${currentY} L ${x},${nextY}`;
      currentY = nextY;
    }

    pathData += ` L ${width},${height} Z`;
    return pathData;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-screen overflow-hidden bg-transparent"
      style={{ perspective: '1200px' }}
    >
      {/* Parallax Background Layers */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {/* Sky */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(180deg, rgba(6, 10, 22, 0.45) 0%, rgba(6, 10, 22, 0.65) 100%), url('/backgrounds/custom-bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            transform: `translateY(${scrollY * parallaxLayers[0].speed}px)`,
          }}
        />

        {/* Twinkling Stars */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={`star-${i}`}
              className="absolute bg-white rounded-full animate-pulse"
              style={{
                width: Math.random() * 2 + 1,
                height: Math.random() * 2 + 1,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 50}%`,
                opacity: Math.random() * 0.7 + 0.3,
                animationDuration: `${Math.random() * 3 + 2}s`,
                transform: `translateY(${scrollY * parallaxLayers[1].speed}px)`,
              }}
            />
          ))}
        </div>

        {/* Pixel Mountains - Far (3 layers) */}
        {[
          { index: 2, fill: '#0f1628', opacity: 0.4 },
          { index: 3, fill: '#1a2a4a', opacity: 0.6 },
          { index: 4, fill: '#2a3a5a', opacity: 0.8 },
        ].map(({ index, fill, opacity }) => (
          <svg
            key={`mountains-${index}`}
            className="absolute bottom-0 w-full"
            preserveAspectRatio="none"
            height="300"
            viewBox="0 0 1200 400"
            style={{
              transform: `translateY(${scrollY * parallaxLayers[index].speed}px)`,
              opacity,
            }}
          >
            <path
              d={generatePixelMountains(1200, 400, index * 17.3, 12)}
              fill={fill}
            />
            {/* Mountain outline for pixel effect */}
            <path
              d={generatePixelMountains(1200, 400, index * 17.3, 12)}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        ))}

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={`particle-${i}`}
              className="absolute border border-cyan-500/30 rounded-full"
              style={{
                width: Math.random() * 40 + 20,
                height: Math.random() * 40 + 20,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                transform: `translateY(${scrollY * parallaxLayers[2].speed * (i % 3)}px) rotate(${scrollY * 0.5}deg)`,
                opacity: 0.3,
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-8 max-w-2xl">
          {/* Title */}
          <div className="space-y-4">
            <h1 className="font-pixel text-5xl md:text-7xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-pulse">
              WASM-RPG
            </h1>
            <p className="font-pixel text-lg md:text-xl tracking-widest text-gray-300">
              ADAPTIVE NATIVE-SPEED LEARNING ENGINE
            </p>
          </div>

          {/* Subtitle */}
          <div className="space-y-3 text-gray-400">
            <p className="text-lg leading-relaxed">
              Master Data Structures & Algorithms through immersive gameplay.
            </p>
            <p className="text-sm md:text-base opacity-75">
              Every enemy encounter tests your concept mastery.
              <br />
              Every boss fight proves your learning.
            </p>
          </div>

          {/* Call-to-Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <button
              onClick={() => navigate('/quiz')}
              className="pixel-btn group relative overflow-hidden"
            >
              <span className="relative z-10">START NEW RUN</span>
              <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/20 transition-all duration-300" />
            </button>

            <button
              onClick={() => navigate('/map')}
              className="pixel-btn-ghost group relative overflow-hidden"
            >
              <span className="relative z-10">VIEW MAP</span>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
            </button>

            <button
              onClick={() => navigate('/progress')}
              className="pixel-btn-ghost group relative overflow-hidden"
            >
              <span className="relative z-10">ADVENTURE LOG</span>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-12">
            {[
              { icon: '🎮', title: 'INTERACTIVE', desc: 'Real-time dungeon exploration' },
              { icon: '🤖', title: 'AI-POWERED', desc: 'Intelligent answer grading' },
              { icon: '📊', title: 'ADAPTIVE', desc: 'Difficulty adjusts to you' },
            ].map((feature, i) => (
              <div
                key={i}
                className="game-panel rounded p-4 border border-white/[0.05] hover:border-cyan-500/50 transition-all duration-300 group cursor-pointer"
                style={{
                  transform: `translateY(${scrollY * parallaxLayers[1].speed * (i - 1)}px)`,
                }}
              >
                <div className="text-3xl mb-2">{feature.icon}</div>
                <h3 className="font-pixel text-sm tracking-widest text-cyan-400 mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="pt-12 text-center text-sm text-gray-500">
            <p>Built with Vite • React • FastAPI • C++ WASM</p>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20">
        <div className="flex flex-col items-center gap-2 animate-bounce">
          <span className="text-xs text-gray-500">SCROLL</span>
          <svg
            className="w-5 h-5 text-cyan-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Home;
