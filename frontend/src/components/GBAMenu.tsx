import React, { useEffect, useState } from 'react';

interface GBAMenuOption {
  label: string;
  value: string;
}

interface GBAMenuProps {
  title?: string;
  options: GBAMenuOption[];
  onSelect: (value: string) => void;
  initialValue?: string;
  width?: string;
}

export const GBAMenu: React.FC<GBAMenuProps> = ({
  title,
  options,
  onSelect,
  initialValue,
  width = 'w-64',
}) => {
  const [selectedIndex, setSelectedIndex] = useState(
    initialValue ? options.findIndex((o) => o.value === initialValue) : 0
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(options[selectedIndex].value);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, options, onSelect]);

  return (
    <div className={`gba-window ${width}`}>
      {title && <div className="gba-window-title">{title}</div>}
      <div className="gba-window-content p-0">
        {options.map((option, idx) => (
          <button
            key={option.value}
            onClick={() => {
              setSelectedIndex(idx);
              onSelect(option.value);
            }}
            className={`block w-full text-left gba-menu-item ${
              idx === selectedIndex ? 'selected' : ''
            } border-b border-window-border/30 last:border-b-0`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default GBAMenu;
