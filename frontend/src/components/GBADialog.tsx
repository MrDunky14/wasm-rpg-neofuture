import React, { useEffect, useState } from 'react';

interface GBADialogProps {
  title?: string;
  children: React.ReactNode;
  buttons?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'danger' | 'success';
  }>;
  width?: string;
  showArrow?: boolean;
}

export const GBADialog: React.FC<GBADialogProps> = ({
  title,
  children,
  buttons,
  width = 'max-w-2xl',
  showArrow = true,
}) => {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className={`${width} animate-bounce-in ${
          isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        } transition-all duration-300`}
      >
        <div className="gba-window">
          {title && <div className="gba-window-title">{title}</div>}
          
          <div className="gba-window-content">
            <div className="gba-dialog-text">{children}</div>
            {showArrow && <div className="gba-dialog-arrow">▼</div>}
          </div>

          {buttons && buttons.length > 0 && (
            <div className="flex gap-2 p-3 bg-window-dark border-t-2 border-window-border justify-center flex-wrap">
              {buttons.map((btn, idx) => (
                <button
                  key={idx}
                  onClick={btn.onClick}
                  className={`gba-btn ${
                    btn.variant === 'danger'
                      ? 'gba-btn-red'
                      : btn.variant === 'success'
                      ? 'gba-btn-green'
                      : ''
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GBADialog;
