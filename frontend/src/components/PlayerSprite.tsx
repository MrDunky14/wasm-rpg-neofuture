import React from 'react';

interface PlayerSpriteProps {
  animationType?: 'idle' | 'damage' | 'attacking' | 'walking';
  hpPercentage?: number;
}

export const PlayerSprite: React.FC<PlayerSpriteProps> = ({
  animationType = 'idle',
  hpPercentage = 100,
}) => {
  const getAnimationClass = () => {
    switch (animationType) {
      case 'damage':
        return 'animate-damage-shake';
      case 'attacking':
        return 'animate-sword-slash';
      case 'walking':
        return 'animate-float';
      case 'idle':
      default:
        return 'animate-idle-bob';
    }
  };

  // Apply health tint effect
  const getHealthTint = () => {
    if (hpPercentage > 66) return 'drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]';
    if (hpPercentage > 33) return 'drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]';
    return 'drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]';
  };

  return (
    <div className="relative w-7 h-7 flex items-center justify-center">
      {/* Pixel art player texture with GBA retro styling - using first frame from spritesheet */}
      <div
        className={`absolute inset-0 sprite ${getAnimationClass()}`}
        style={{
          backgroundImage: 'url(/game-assets/player-caveman.png)',
          backgroundSize: '800% 400%',
          backgroundPosition: '0% 0%',
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated' as any,
        }}
      />

      {/* Overlay texture effect for pixel grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.1) 0px,
            rgba(0, 0, 0, 0.1) 1px,
            transparent 1px,
            transparent 2px
          ),
          repeating-linear-gradient(
            90deg,
            rgba(0, 0, 0, 0.1) 0px,
            rgba(0, 0, 0, 0.1) 1px,
            transparent 1px,
            transparent 2px
          )`,
        }}
      />

      {/* Health indicator glow */}
      <img
        src="/game-assets/player-caveman.png"
        alt="Player"
        className={`absolute inset-0 m-auto w-6 h-6 object-contain ${getAnimationClass()} ${getHealthTint()}`}
      />

      {/* Retro border effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: `inset -1px -1px 0 rgba(0, 0, 0, 0.4),
                      inset 1px 1px 0 rgba(255, 255, 255, 0.1)`,
        }}
      />
    </div>
  );
};

export default PlayerSprite;
