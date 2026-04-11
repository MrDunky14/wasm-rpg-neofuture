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
  const PLAYER_SHEET_ROWS = 8;
  const FRAME_WIDTH = 16;
  const FRAME_HEIGHT = 14;

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
    <div className={`relative w-[28px] h-[28px] overflow-visible flex items-center justify-center ${getAnimationClass()} ${getHealthTint()}`}>
      {/* player-caveman.png is 64x112 => 4x8 frames of 16x14. */}
      <div
        className="sprite"
        style={{
          backgroundImage: 'url(/game-assets/player-caveman.png)',
          backgroundSize: `${PLAYER_SHEET_COLUMNS * 100}% ${PLAYER_SHEET_ROWS * 100}%`,
          backgroundPosition: '0% 0%',
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
          width: `${FRAME_WIDTH}px`,
          height: `${FRAME_HEIGHT}px`,
          transform: 'scale(1.8)',
          transformOrigin: 'center bottom',
        }}
      />
    </div>
  );
};

export default PlayerSprite;
