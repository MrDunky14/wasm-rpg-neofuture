import React from 'react';

interface PlayerSpriteProps {
  animationType?: 'idle' | 'damage' | 'attacking' | 'walking';
  hpPercentage?: number;
}

export const PlayerSprite: React.FC<PlayerSpriteProps> = ({
  animationType = 'idle',
  hpPercentage = 100,
}) => {
  const PLAYER_SHEET_COLUMNS = 4;
  const PLAYER_SHEET_ROWS = 4;

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
    <div className="relative w-[28px] h-[28px] flex items-center justify-center">
      {/* Player sheet uses 4x4 frames (16x28 each); center one full frame in a 28x28 tile. */}
      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[16px] h-[28px] sprite ${getAnimationClass()} ${getHealthTint()}`}
        style={{
          backgroundImage: 'url(/game-assets/player-caveman.png)',
          backgroundSize: `${PLAYER_SHEET_COLUMNS * 100}% ${PLAYER_SHEET_ROWS * 100}%`,
          backgroundPosition: '0% 0%',
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
};

export default PlayerSprite;
