import React from 'react';

interface GBAStatBarProps {
  label: string;
  current: number;
  max: number;
  color?: 'cyan' | 'green' | 'red' | 'yellow';
  showValue?: boolean;
}

export const GBAStatBar: React.FC<GBAStatBarProps> = ({
  label,
  current,
  max,
  color = 'cyan',
  showValue = true,
}) => {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));

  const colorMap = {
    cyan: 'from-cyan-500 to-teal-600',
    green: 'from-green-500 to-emerald-600',
    red: 'from-red-500 to-red-700',
    yellow: 'from-yellow-400 to-amber-600',
  };

  return (
    <div className="gba-stat-container mb-2">
      <div className="gba-stat-label">{label}</div>
      <div className="gba-stat-bar relative">
        <div
          className={`gba-stat-fill bg-gradient-to-r ${colorMap[color]}`}
          style={{ width: `${percentage}%` }}
        >
          {showValue && (
            <div className="gba-stat-text">
              {current}/{max}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GBAStatBar;
