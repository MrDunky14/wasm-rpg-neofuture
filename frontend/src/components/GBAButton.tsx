import React from 'react';

interface GBAButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'red' | 'green' | 'blue';
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

export const GBAButton: React.FC<GBAButtonProps> = ({
  children,
  onClick,
  variant = 'default',
  disabled = false,
  className = '',
  size = 'md',
  title,
}) => {
  const sizeMap = {
    sm: 'text-[8px] px-2 py-1',
    md: 'text-[9px] px-4 py-2',
    lg: 'text-[10px] px-6 py-3',
  };

  const variantClass =
    variant === 'red'
      ? 'gba-btn-red'
      : variant === 'green'
      ? 'gba-btn-green'
      : 'gba-btn';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${variantClass} ${sizeMap[size]} ${className} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {children}
    </button>
  );
};

export default GBAButton;
