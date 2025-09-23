import React, { useState, useCallback } from 'react';
import Card from '../components/Card';
import {
  PiMicrophoneBold,
  PiPencilLine,
  PiPaperclip,
  PiTranslateBold,
} from 'react-icons/pi';
import MeetingMinutesTranscription from '../components/MeetingMinutes/MeetingMinutesTranscription';
import MeetingMinutesRealtimeTranslation from '../components/MeetingMinutes/MeetingMinutesRealtimeTranslation';
import MeetingMinutesDirect from '../components/MeetingMinutes/MeetingMinutesDirect';
import MeetingMinutesFile from '../components/MeetingMinutes/MeetingMinutesFile';
import MeetingMinutesGeneration from '../components/MeetingMinutes/MeetingMinutesGeneration';
import { useTranslation } from 'react-i18next';

// Types for Meeting Minutes components
export type InputMethod =
  | 'transcription'
  | 'direct'
  | 'file'
  | 'realtime_translation';

export interface LanguageOption {
  value: string;
  label: string;
}

export interface AudioRecognitionSettings {
  languageCode: string;
  speakerLabel: boolean;
  maxSpeakers: number;
  speakers: string;
}

export interface AudioRecognitionSettingsHandlers {
  onLanguageCodeChange: (code: string) => void;
  onSpeakerLabelChange: (enabled: boolean) => void;
  onMaxSpeakersChange: (count: number) => void;
  onSpeakersChange: (names: string) => void;
}

export interface CommonTranscriptProps {
  hasTranscriptText: boolean;
  onClear: () => void;
  disableClear: boolean;
}

const MeetingMinutesPage: React.FC = () => {
  const { t } = useTranslation();

  // State management
  const [inputMethod, setInputMethod] = useState<InputMethod>('transcription');
  const [isGenerationPanelCollapsed, setIsGenerationPanelCollapsed] =
    useState(false);
  const [transcriptTexts, setTranscriptTexts] = useState({
    transcription: '',
    direct: '',
    file: '',
    realtime_translation: '',
  });

  // Handle transcript changes from components
  const handleTranscriptChange = (method: InputMethod, text: string) => {
    setTranscriptTexts((prev) => ({
      ...prev,
      [method]: text,
    }));
  };

  // Memoized callback for transcription transcript changes
  const handleTranscriptionTranscriptChange = useCallback(
    (text: string) => handleTranscriptChange('transcription', text),
    []
  );

  // Memoized callback for realtime translation transcript changes
  const handleRealtimeTranslationTranscriptChange = useCallback(
    (text: string) => handleTranscriptChange('realtime_translation', text),
    []
  );

  // Memoized callback for direct transcript changes
  const handleDirectTranscriptChange = useCallback(
    (text: string) => handleTranscriptChange('direct', text),
    []
  );

  // Memoized callback for file transcript changes
  const handleFileTranscriptChange = useCallback(
    (text: string) => handleTranscriptChange('file', text),
    []
  );

  // Get current transcript text
  const currentTranscriptText = transcriptTexts[inputMethod];

  // Toggle generation panel collapse state
  const toggleGenerationPanelCollapse = () => {
    setIsGenerationPanelCollapsed(!isGenerationPanelCollapsed);
  };

  return (
    <div>
      {/* Title Header - Always fixed at top */}
      <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
        {t('meetingMinutes.title')}
      </div>

      {/* Main Content Area - Left & Right columns only */}
      <div className="my-2 grid grid-cols-12 gap-2 lg:flex lg:flex-row lg:gap-2">
        {/* Left Column - Tab Content */}
        <div
          className={`col-span-12 ml-4 transition-all duration-300 ease-in-out lg:ml-4 ${
            isGenerationPanelCollapsed
              ? 'lg:flex-[0_0_calc(100%-7rem)]'
              : 'lg:flex-[0_0_54%]'
          }`}>
          <Card>
            {/* Tab Headers */}
            <div className="mb-6 flex border-b border-gray-200">
              <button
                className={`flex items-center border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  inputMethod === 'transcription'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setInputMethod('transcription')}>
                <PiMicrophoneBold className="mr-2 h-4 w-4" />
                {t('transcribe.voice_transcription')}
              </button>
              <button
                className={`flex items-center border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  inputMethod === 'realtime_translation'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setInputMethod('realtime_translation')}>
                <PiTranslateBold className="mr-2 h-4 w-4" />
                {t('translate.realtime_translation')}
              </button>
              <button
                className={`flex items-center border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  inputMethod === 'direct'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setInputMethod('direct')}>
                <PiPencilLine className="mr-2 h-4 w-4" />
                {t('transcribe.direct_input')}
              </button>
              <button
                className={`flex items-center border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  inputMethod === 'file'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setInputMethod('file')}>
                <PiPaperclip className="mr-2 h-4 w-4" />
                {t('transcribe.file_upload')}
              </button>
            </div>

            {/* Tab Content - Self-contained components */}
            <div>
              <div
                style={{
                  display: inputMethod === 'transcription' ? 'block' : 'none',
                }}>
                <MeetingMinutesTranscription
                  onTranscriptChange={handleTranscriptionTranscriptChange}
                />
              </div>
              <div
                style={{
                  display:
                    inputMethod === 'realtime_translation' ? 'block' : 'none',
                }}>
                <MeetingMinutesRealtimeTranslation
                  onTranscriptChange={handleRealtimeTranslationTranscriptChange}
                />
              </div>
              <div
                style={{
                  display: inputMethod === 'direct' ? 'block' : 'none',
                }}>
                <MeetingMinutesDirect
                  onTranscriptChange={handleDirectTranscriptChange}
                />
              </div>
              <div
                style={{ display: inputMethod === 'file' ? 'block' : 'none' }}>
                <MeetingMinutesFile
                  onTranscriptChange={handleFileTranscriptChange}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Generation Panel */}
        <div
          className={`col-span-12 my-2 ml-4 transition-all duration-500 ease-in-out lg:my-0 lg:ml-0 lg:mr-4 ${
            isGenerationPanelCollapsed
              ? 'lg:flex-[0_0_4em] xl:flex-[0_0_4em] 2xl:flex-[0_0_5em]'
              : 'lg:flex-[0_0_42%] xl:flex-[0_0_43%] 2xl:flex-[0_0_44%]'
          }`}>
          <Card>
            <MeetingMinutesGeneration
              transcriptText={currentTranscriptText}
              isCollapsed={isGenerationPanelCollapsed}
              onToggleCollapse={toggleGenerationPanelCollapse}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MeetingMinutesPage;
