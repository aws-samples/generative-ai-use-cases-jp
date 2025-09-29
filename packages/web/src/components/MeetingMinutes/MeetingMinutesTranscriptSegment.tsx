import React from 'react';
import { useTranslation } from 'react-i18next';
import { Transcript } from 'generative-ai-use-cases';

interface TranslationSegment {
  text: string;
  needsTranslation: boolean;
  translation?: string;
  lastTranslatedText?: string;
}

interface MeetingMinutesTranscriptSegmentProps {
  startTime: number;
  transcripts: Transcript[];
  speakerMapping: { [key: string]: string };
  isPartial: boolean;
  formatTime: (seconds: number) => string;
  translation?: string;
  translationSegments?: TranslationSegment[];
  isTranslating?: boolean;
  translationEnabled?: boolean;
  detectedLanguage?: string;
  translationTarget?: string;
  isBidirectional?: boolean;
}

const MeetingMinutesTranscriptSegment: React.FC<
  MeetingMinutesTranscriptSegmentProps
> = ({
  startTime,
  transcripts,
  speakerMapping,
  isPartial,
  formatTime,
  translation,
  translationSegments,
  isTranslating,
  translationEnabled,
  detectedLanguage,
  translationTarget,
  isBidirectional,
}) => {
  const { t } = useTranslation();
  return (
    <div className="mb-4 rounded-lg bg-gray-200 p-3">
      {transcripts.map((transcript, index) => (
        <div key={index} className="mb-2 last:mb-0">
          <div className="flex gap-2">
            <div className="flex shrink-0 items-center gap-2">
              {transcript.speakerLabel && (
                <span className="font-medium text-black">
                  {speakerMapping[transcript.speakerLabel] ||
                    transcript.speakerLabel}
                </span>
              )}
              <span className="text-sm text-gray-500">
                {formatTime(startTime)}
              </span>
            </div>
            <div className="flex-1 leading-relaxed text-gray-900">
              {transcript.transcript}
              {isPartial && (
                <span className="ml-1 text-gray-400">
                  {t('meetingMinutes.partial_indicator')}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Translation Display */}
      {translationEnabled && (
        <div className="mt-3 border-t border-gray-300 pt-3">
          {/* Language detection indicator for bidirectional translation */}
          {isBidirectional && detectedLanguage && (
            <div className="mb-2 flex gap-2">
              <span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600">
                {t('translate.detectedLanguage')}
                {t('common.colon')} {detectedLanguage}
                {translationTarget && (
                  <span className="ml-1">
                    {t('common.arrow')} {translationTarget}
                  </span>
                )}
              </span>
            </div>
          )}
          {translationSegments ? (
            // New sentence-based translation display
            <>
              {translationSegments.some(
                (seg) => seg.translation && seg.translation.trim()
              ) ? (
                <div className="flex gap-2">
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {t('translate.translation')}
                      {t('common.colon')}
                    </span>
                  </div>
                  <div className="flex-1 leading-relaxed text-gray-900">
                    {translationSegments
                      .map((seg) => seg.translation || '')
                      .join('')}
                  </div>
                </div>
              ) : isTranslating ? (
                <div className="text-sm italic text-gray-500">
                  {t('translate.translating')}
                </div>
              ) : null}
            </>
          ) : (
            // Legacy translation display
            <>
              {translation ? (
                <div className="flex gap-2">
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {t('translate.translation')}
                      {t('common.colon')}
                    </span>
                  </div>
                  <div className="flex-1 leading-relaxed text-gray-900">
                    {translation}
                  </div>
                </div>
              ) : isTranslating ? (
                <div className="text-sm italic text-gray-500">
                  {t('translate.translating')}
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MeetingMinutesTranscriptSegment;
