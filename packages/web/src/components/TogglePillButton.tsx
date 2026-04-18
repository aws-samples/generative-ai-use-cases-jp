import React from 'react';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  /** Icon element to display */
  icon: React.ReactNode;
  /** Button label text */
  label: string;
  /** Whether the button is currently enabled/active */
  isEnabled: boolean;
  /** Callback when button is toggled */
  onToggle: () => void;
  /** Color scheme when enabled - 'blue' for primary actions, 'gray' for secondary */
  activeColor?: 'blue' | 'gray';
};

const TogglePillButton: React.FC<Props> = ({
  icon,
  label,
  isEnabled,
  onToggle,
  activeColor = 'blue',
  className = '',
}) => {
  const activeStyles =
    activeColor === 'blue'
      ? 'bg-blue-500 text-white'
      : 'bg-gray-700 text-white';

  const inactiveStyles = 'bg-gray-100 text-gray-700 hover:bg-gray-200';

  return (
    <button
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        isEnabled ? activeStyles : inactiveStyles
      } ${className}`}
      onClick={onToggle}>
      {icon}
      {label}
    </button>
  );
};

export default TogglePillButton;
