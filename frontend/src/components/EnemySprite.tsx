import React, { useMemo } from 'react';

interface EnemySpriteProps {
  enemyType: string;
  isDefeating?: boolean;
  isAlert?: boolean;
  animationDelay?: number;
}

type EnemyTypeConfig = {
  imageUrl: string;
  colorTint: string;
  glowColor: string;
  scale: number;
  sheetColumns: number;
  sheetRows: number;
  frameX: number;
  frameY: number;
  rarity: 'common' | 'rare' | 'boss';
};

const ENEMY_TYPES: Record<string, EnemyTypeConfig> = {
  reptile: {
    imageUrl: '/game-assets/enemy-reptile.png',
    colorTint: 'hue-rotate(120deg)',
    glowColor: 'rgba(16, 185, 129, 0.8)',
    scale: 1,
    sheetColumns: 4,
    sheetRows: 4,
    frameX: 0,
    frameY: 0,
    rarity: 'common',
  },
  slime: {
    imageUrl: '/game-assets/boss-slime-idle.png',
    colorTint: 'hue-rotate(60deg)',
    glowColor: 'rgba(168, 85, 247, 0.8)',
    scale: 1,
    sheetColumns: 5,
    sheetRows: 1,
    frameX: 2,
    frameY: 0,
    rarity: 'rare',
  },
  boss: {
    imageUrl: '/game-assets/boss-face.png',
    colorTint: 'hue-rotate(0deg) saturate(1.5)',
    glowColor: 'rgba(239, 68, 68, 0.8)',
    scale: 1,
    sheetColumns: 1,
    sheetRows: 1,
    frameX: 0,
    frameY: 0,
    rarity: 'boss',
  },
  goblin: {
    imageUrl: '/game-assets/enemy-reptile.png',
    colorTint: 'hue-rotate(30deg) brightness(0.9)',
    glowColor: 'rgba(234, 179, 8, 0.8)',
    scale: 1,
    sheetColumns: 4,
    sheetRows: 4,
    frameX: 1,
    frameY: 0,
    rarity: 'common',
  },
  skeleton: {
    imageUrl: '/game-assets/enemy-reptile.png',
    colorTint: 'grayscale(1) brightness(1.1)',
    glowColor: 'rgba(107, 114, 128, 0.8)',
    scale: 1,
    sheetColumns: 4,
    sheetRows: 4,
    frameX: 2,
    frameY: 0,
    rarity: 'rare',
  },
  default: {
    imageUrl: '/game-assets/enemy-reptile.png',
    colorTint: 'hue-rotate(0deg)',
    glowColor: 'rgba(6, 182, 212, 0.8)',
    scale: 1,
    sheetColumns: 4,
    sheetRows: 4,
    frameX: 0,
    frameY: 0,
    rarity: 'common',
  },
};

export const EnemySprite: React.FC<EnemySpriteProps> = ({
  enemyType,
  isDefeating = false,
  isAlert = false,
  animationDelay = 0,
}) => {
  const config = useMemo(() => {
    const key = enemyType.toLowerCase().trim();
    return ENEMY_TYPES[key] || ENEMY_TYPES.default;
  }, [enemyType]);

  const getAnimationClass = () => {
    if (isDefeating) return 'animate-enemy-defeat';
    if (isAlert) return 'animate-alert';
    return 'animate-idle-bob';
  };

  const getRarityBorder = () => {
    switch (config.rarity) {
      case 'boss':
        return '2px solid rgba(239, 68, 68, 0.6)';
      case 'rare':
        return '2px solid rgba(168, 85, 247, 0.6)';
      default:
        return '2px solid rgba(6, 182, 212, 0.3)';
    }
  };

  const getRarityLabelColor = () => {
    switch (config.rarity) {
      case 'boss':
        return 'text-red-500';
      case 'rare':
        return 'text-purple-400';
      default:
        return 'text-cyan-400';
    }
  };

  const scaledWidth = `${28 * config.scale}px`;
  const scaledHeight = `${28 * config.scale}px`;
  const frameXPercent = config.sheetColumns > 1
    ? `${(config.frameX / (config.sheetColumns - 1)) * 100}%`
    : '0%';
  const frameYPercent = config.sheetRows > 1
    ? `${(config.frameY / (config.sheetRows - 1)) * 100}%`
    : '0%';

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Rarity indicator above enemy */}
      {config.rarity !== 'common' && (
        <div className={`font-pixel text-[6px] ${getRarityLabelColor()} mb-1 uppercase tracking-wider`}>
          {config.rarity === 'boss' ? '☆ BOSS ☆' : '★ RARE ★'}
        </div>
      )}

      {/* Enemy sprite container */}
      <div
        className={`relative sprite ${getAnimationClass()} transition-all`}
        style={{
          width: scaledWidth,
          height: scaledHeight,
          animationDelay: `${animationDelay}ms`,
        }}
      >
        {/* Main enemy image - with spritesheet frame extraction */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url(${config.imageUrl})`,
            backgroundSize: `${config.sheetColumns * 100}% ${config.sheetRows * 100}%`,
            backgroundPosition: `${frameXPercent} ${frameYPercent}`,
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
            filter: config.colorTint,
          }}
        />

        {/* Pixel texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.08) 0px,
              rgba(0, 0, 0, 0.08) 1px,
              transparent 1px,
              transparent 2px
            ),
            repeating-linear-gradient(
              90deg,
              rgba(0, 0, 0, 0.08) 0px,
              rgba(0, 0, 0, 0.08) 1px,
              transparent 1px,
              transparent 2px
            )`,
          }}
        />

        {/* Glow effect based on rarity */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: `0 0 12px ${config.glowColor}, inset 0 0 8px ${config.glowColor}22`,
            border: getRarityBorder(),
          }}
        />

        {/* Damage flash on defeat */}
        {isDefeating && (
          <div
            className="absolute inset-0 pointer-events-none animate-damage-flash"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.4)',
              border: getRarityBorder(),
            }}
          />
        )}

        {/* Retro 3D effect border */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: `inset -2px -2px 0 rgba(0, 0, 0, 0.4),
                        inset 2px 2px 0 rgba(255, 255, 255, 0.1)`,
          }}
        />
      </div>

      {/* Alert indicator below enemy when encountered */}
      {isAlert && (
        <div className="mt-1 text-[6px] font-pixel text-red-500 animate-pulse">
          ▼ ▼ ▼
        </div>
      )}
    </div>
  );
};

export default EnemySprite;
