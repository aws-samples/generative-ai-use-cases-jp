import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Button';
import ButtonCopy from '../ButtonCopy';
import ButtonSendToUseCase from '../ButtonSendToUseCase';

interface MeetingMinutesDirectProps {
  /** Callback when transcript text changes */
  onTranscriptChange?: (text: string) => void;
}

const MeetingMinutesDirect: React.FC<MeetingMinutesDirectProps> = ({
  onTranscriptChange,
}) => {
  const { t } = useTranslation();

  // Internal state management
  const [directInputText, setDirectInputText] = useState('');

  // Handle text change with callback
  const handleDirectInputChange = useCallback(
    (text: string) => {
      setDirectInputText(text);
      onTranscriptChange?.(text);
    },
    [onTranscriptChange]
  );

  // Text existence check
  const hasTranscriptText = useMemo(() => {
    return directInputText.trim() !== '';
  }, [directInputText]);

  // Clear function
  const handleClear = useCallback(() => {
    setDirectInputText('');
    onTranscriptChange?.('');
  }, [onTranscriptChange]);

  return (
    <div>
      {/* Direct Input Content */}
      <div className="mb-4">
        <div className="p-2">
          <p className="mb-2 text-sm text-gray-600">
            {t('transcribe.direct_input_instruction')}
          </p>
        </div>
      </div>

      {/* Clear Button */}
      <div className="flex justify-end gap-3">
        <Button outlined disabled={!hasTranscriptText} onClick={handleClear}>
          {t('common.clear')}
        </Button>
      </div>

      {/* Transcript Panel */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-bold">{t('meetingMinutes.transcript')}</div>
          {hasTranscriptText && (
            <div className="flex">
              <ButtonCopy
                text={directInputText}
                interUseCasesKey="transcript"></ButtonCopy>
              <ButtonSendToUseCase text={directInputText} />
            </div>
          )}
        </div>
        <textarea
          value={directInputText}
          onChange={(e) => handleDirectInputChange(e.target.value)}
          placeholder={t('transcribe.direct_input_placeholder')}
          rows={10}
          className="min-h-96 w-full resize-none rounded border border-black/30 p-1.5 outline-none"
        />
      </div>
    </div>
  );
};

export default MeetingMinutesDirect;
