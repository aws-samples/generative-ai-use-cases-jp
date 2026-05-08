import React from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Button';
import ButtonCopy from '../ButtonCopy';
import ButtonSendToUseCase from '../ButtonSendToUseCase';
import { PiStopCircleBold, PiMicrophoneBold } from 'react-icons/pi';

interface MeetingMinutesControlButtonsProps {
  /** Whether recording is currently active */
  isRecording: boolean;
  /** Whether transcript text exists */
  hasTranscriptText: boolean;
  /** The transcript text for copy/send operations */
  transcriptText: string;
  /** Callback when start recording button is clicked */
  onStartRecording: () => void;
  /** Callback when stop recording button is clicked */
  onStopRecording: () => void;
  /** Callback when clear button is clicked */
  onClear: () => void;
}

const MeetingMinutesControlButtons: React.FC<
  MeetingMinutesControlButtonsProps
> = ({
  isRecording,
  hasTranscriptText,
  transcriptText,
  onStartRecording,
  onStopRecording,
  onClear,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      {/* Copy and Send buttons - show when transcript exists */}
      {hasTranscriptText && (
        <>
          <ButtonCopy text={transcriptText} interUseCasesKey="transcript" />
          <ButtonSendToUseCase text={transcriptText} />
        </>
      )}

      {/* Recording control buttons */}
      {!isRecording ? (
        <Button className="h-8 px-3 py-1 text-sm" onClick={onStartRecording}>
          <PiMicrophoneBold className="mr-1 h-4 w-4" />
          {t('transcribe.start_recording')}
        </Button>
      ) : (
        <Button className="h-8 px-3 py-1 text-sm" onClick={onStopRecording}>
          <PiStopCircleBold className="mr-1 h-4 w-4" />
          {t('transcribe.stop_recording')}
        </Button>
      )}

      {/* Clear button */}
      <Button
        outlined
        className="h-8 px-3 py-1 text-sm"
        disabled={!hasTranscriptText && !isRecording}
        onClick={onClear}>
        {t('common.clear')}
      </Button>
    </div>
  );
};

export default MeetingMinutesControlButtons;
