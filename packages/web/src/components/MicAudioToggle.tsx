import React from 'react';
import { useTranslation } from 'react-i18next';
import Switch from './Switch';

interface MicAudioToggleProps {
  /** Whether microphone audio capture is enabled */
  enabled: boolean;
  /** Handler for when the toggle state changes */
  onToggle: (enabled: boolean) => void;
  /** Additional CSS classes */
  className?: string;
}

const MicAudioToggle: React.FC<MicAudioToggleProps> = ({
  enabled,
  onToggle,
  className = '',
}) => {
  const { t } = useTranslation();

  return (
    <div className={`ml-0.5 mt-2 ${className}`}>
      <Switch
        label={t('transcribe.mic_input')}
        checked={enabled}
        onSwitch={onToggle}
      />
    </div>
  );
};

export default MicAudioToggle;
