import React from 'react';
import { useTranslation } from 'react-i18next';
import RangeSlider from '../RangeSlider';
import TogglePillButton from '../TogglePillButton';
import Help from '../Help';
import useIsMobile from '../../hooks/useIsMobile';
import useScreenAudio from '../../hooks/useScreenAudio';
import {
  PiMicrophoneBold,
  PiDesktopBold,
  PiUsersBold,
  PiGearBold,
  PiCaretRightFill,
} from 'react-icons/pi';

interface MeetingMinutesSettingsPanelProps {
  /** Whether recording is currently active (hides panel when true) */
  isRecording: boolean;

  /** Microphone audio settings */
  enableMicAudio: boolean;
  setEnableMicAudio: (enabled: boolean) => void;

  /** Screen audio settings */
  enableScreenAudio: boolean;
  setEnableScreenAudio: (enabled: boolean) => void;

  /** Speaker recognition settings */
  speakerLabel: boolean;
  setSpeakerLabel: (enabled: boolean) => void;

  /** Speaker recognition parameters */
  maxSpeakers: number;
  setMaxSpeakers: (count: number) => void;
  speakers: string;
  setSpeakers: (speakers: string) => void;

  /** Additional settings content (languages, translation, etc.) */
  children?: React.ReactNode;
}

const MeetingMinutesSettingsPanel: React.FC<
  MeetingMinutesSettingsPanelProps
> = ({
  isRecording,
  enableMicAudio,
  setEnableMicAudio,
  enableScreenAudio,
  setEnableScreenAudio,
  speakerLabel,
  setSpeakerLabel,
  maxSpeakers,
  setMaxSpeakers,
  speakers,
  setSpeakers,
  children,
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { isSupported: isScreenAudioSupported } = useScreenAudio();

  // Mobile-specific collapsible state
  const [settingsExpanded, setSettingsExpanded] = React.useState(!isMobile);

  // Update settings panel state when screen size changes
  React.useEffect(() => {
    setSettingsExpanded(!isMobile);
  }, [isMobile]);

  // Hide panel during recording
  if (isRecording) {
    return null;
  }

  return (
    <div className="mb-4 shrink-0 rounded-lg border border-gray-200 p-4">
      {/* Settings Header - Clickable on mobile */}
      <div
        className={`flex items-center text-sm font-bold text-gray-700 ${
          isMobile ? 'cursor-pointer' : ''
        }`}
        onClick={
          isMobile ? () => setSettingsExpanded(!settingsExpanded) : undefined
        }>
        <PiGearBold className="mr-2 h-4 w-4" />
        {t('meetingMinutes.settings')}
        {isMobile && (
          <PiCaretRightFill
            className={`ml-auto h-3 w-3 transition-transform ${
              settingsExpanded ? 'rotate-90' : ''
            }`}
          />
        )}
      </div>

      {/* Settings Content - Collapsible on mobile */}
      {settingsExpanded && (
        <>
          {/* Input Source */}
          <div className="mb-3 flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="text-sm text-gray-600 sm:w-28 sm:shrink-0">
              {t('meetingMinutes.input_source')}
            </div>
            <div className="flex flex-wrap gap-2">
              <TogglePillButton
                icon={<PiMicrophoneBold className="h-4 w-4" />}
                label={t('meetingMinutes.microphone')}
                isEnabled={enableMicAudio}
                onToggle={() => setEnableMicAudio(!enableMicAudio)}
                activeColor="blue"
              />
              {isScreenAudioSupported && (
                <>
                  <TogglePillButton
                    icon={<PiDesktopBold className="h-4 w-4" />}
                    label={t('transcribe.screen_audio')}
                    isEnabled={enableScreenAudio}
                    onToggle={() => setEnableScreenAudio(!enableScreenAudio)}
                    activeColor="blue"
                  />
                  <Help
                    position="center"
                    message={t('transcribe.screen_audio_notice')}
                  />
                </>
              )}
            </div>
          </div>

          {/* Option */}
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="text-sm text-gray-600 sm:w-28 sm:shrink-0">
              {t('meetingMinutes.option')}
            </div>
            <div className="flex flex-wrap gap-2">
              <TogglePillButton
                icon={<PiUsersBold className="h-4 w-4" />}
                label={t('transcribe.speaker_recognition')}
                isEnabled={speakerLabel}
                onToggle={() => setSpeakerLabel(!speakerLabel)}
                activeColor="gray"
              />
            </div>
          </div>

          {/* Speaker Recognition Parameters (when enabled) */}
          {speakerLabel && (
            <div className="mb-3">
              <div className="mb-2 text-sm font-medium text-gray-700">
                {t('transcribe.detailed_parameters')}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <RangeSlider
                  className=""
                  label={t('transcribe.max_speakers')}
                  min={2}
                  max={10}
                  value={maxSpeakers}
                  onChange={setMaxSpeakers}
                  help={t('transcribe.max_speakers_help')}
                />
              </div>
              <div className="mt-2">
                <textarea
                  className="w-full rounded border border-black/30 p-2 text-sm"
                  placeholder={t('transcribe.speaker_names')}
                  value={speakers}
                  onChange={(e) => setSpeakers(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Additional settings passed as children */}
          {children}
        </>
      )}
    </div>
  );
};

export default MeetingMinutesSettingsPanel;
