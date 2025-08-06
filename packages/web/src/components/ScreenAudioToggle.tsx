import React from 'react';
import { useTranslation } from 'react-i18next';
import Switch from './Switch';
import Help from './Help';

interface ScreenAudioToggleProps {
  /** Whether screen audio capture is enabled */
  enabled: boolean;
  /** Handler for when the toggle state changes */
  onToggle: (enabled: boolean) => void;
  /** Whether screen audio capture is supported by the browser */
  isSupported?: boolean;
  /** Notice text to display in help tooltip */
  noticeText: string;
  /** Additional CSS classes */
  className?: string;
}

const ScreenAudioToggle: React.FC<ScreenAudioToggleProps> = ({
  enabled,
  onToggle,
  isSupported = true,
  noticeText,
  className = '',
}) => {
  const { t } = useTranslation();

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  return (
    <div className={`ml-0.5 mt-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Switch
          label={t('transcribe.screen_audio')}
          checked={enabled}
          onSwitch={onToggle}
        />
        <Help className="ml-1" position="center" message={noticeText} />
      </div>
    </div>
  );
};

export default ScreenAudioToggle;
