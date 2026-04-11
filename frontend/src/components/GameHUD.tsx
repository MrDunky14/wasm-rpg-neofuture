import React from 'react';
import GBAStatBar from './GBAStatBar';
import GBAWindow from './GBAWindow';

interface GameHUDProps {
  playerHp: number;
  maxHp: number;
  levelName: string;
  defeatedEnemies: number;
  totalEnemies: number;
  moves: number;
  message: string;
  showCorrectFeedback: boolean;
  combatLog: string[];
  message_status?: 'neutral' | 'success' | 'danger' | 'warning';
}

export const GameHUD: React.FC<GameHUDProps> = ({
  playerHp,
  maxHp,
  levelName,
  defeatedEnemies,
  totalEnemies,
  moves,
  message,
  showCorrectFeedback,
  combatLog,
  message_status = 'neutral',
}) => {
  const hpPercentage = (playerHp / maxHp) * 100;
  const isLowHealth = hpPercentage < 33;
  const isCritical = hpPercentage < 10;

  return (
    <aside className="with-scanlines space-y-4">
      {/* Status Window */}
      <GBAWindow title="STATUS" width="w-full">
        <div className="space-y-3">
          {/* HP Bar */}
          <GBAStatBar 
            label="HP" 
            current={playerHp} 
            max={maxHp}
            color={isCritical ? 'red' : isLowHealth ? 'yellow' : 'green'}
            showValue={true}
          />
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-pixel">
            <div className="p-2 bg-window-dark/60 border border-window-border/40 rounded">
              <div className="text-gray-400 uppercase tracking-wider mb-1">Level</div>
              <div className="text-window-border text-base">{levelName}</div>
            </div>
            <div className="p-2 bg-window-dark/60 border border-window-border/40 rounded">
              <div className="text-gray-400 uppercase tracking-wider mb-1">Moves</div>
              <div className="text-accent text-base">{moves}</div>
            </div>
            <div className="p-2 bg-window-dark/60 border border-window-border/40 rounded">
              <div className="text-gray-400 uppercase tracking-wider mb-1">Enemies</div>
              <div className="text-secondary text-base">{defeatedEnemies}/{totalEnemies}</div>
            </div>
            <div className="p-2 bg-window-dark/60 border border-window-border/40 rounded">
              <div className="text-gray-400 uppercase tracking-wider mb-1">Progress</div>
              <div className="text-success text-base">{Math.round((defeatedEnemies / totalEnemies) * 100)}%</div>
            </div>
          </div>
        </div>
      </GBAWindow>

      {/* Message Window */}
      <GBAWindow 
        title={
          message_status === 'success' ? '✓ CORRECT' :
          message_status === 'danger' ? '⚠️ ALERT' :
          message_status === 'warning' ? '⚡ CAUTION' : '📋 MISSION'
        }
        width="w-full"
        className={
          message_status === 'success' ? 'border-success shadow-[0_0_12px_rgba(34,197,94,0.3)]' :
          message_status === 'danger' ? 'border-danger shadow-[0_0_12px_rgba(239,68,68,0.3)]' :
          message_status === 'warning' ? 'border-accent shadow-[0_0_12px_rgba(6,182,212,0.3)]' : ''
        }
      >
        <p 
          className={`text-base leading-relaxed transition-all duration-300 font-medium ${
            showCorrectFeedback ? 'text-success font-bold animate-pulse' : 
            message_status === 'danger' ? 'text-danger' :
            message_status === 'success' ? 'text-success' :
            message_status === 'warning' ? 'text-accent' :
            'text-gray-100'
          }`}
        >
          {message}
        </p>
      </GBAWindow>

      {/* Combat Log */}
      <GBAWindow title="COMBAT LOG" width="w-full" height="max-h-32">
        <div className="text-[11px] space-y-1 overflow-y-auto max-h-28">
          {combatLog.length === 0 ? (
            <p className="text-gray-500 font-pixel">&gt; Combat log active...</p>
          ) : (
            combatLog.map((entry, index) => (
              <div key={`${entry}-${index}`} className="text-gray-300 font-mono">
                <span className="text-accent">&gt; </span>
                {entry}
              </div>
            ))
          )}
        </div>
      </GBAWindow>
    </aside>
  );
};

export default GameHUD;
