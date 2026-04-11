import React from 'react';

interface GBAWindowProps {
  title?: string;
  children: React.ReactNode;
  width?: string;
  height?: string;
  className?: string;
}

export const GBAWindow: React.FC<GBAWindowProps> = ({
  title,
  children,
  width = 'w-auto',
  height = 'auto',
  className = '',
}) => {
  return (
    <div className={`gba-window ${width} ${className}`} style={{ height }}>
      {title && <div className="gba-window-title">{title}</div>}
      <div className="gba-window-content">{children}</div>
    </div>
  );
};

export default GBAWindow;
