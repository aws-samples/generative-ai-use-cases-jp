import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageCode } from '@aws-sdk/client-transcribe-streaming';
import { Transcript } from 'generative-ai-use-cases';
import Button from '../Button';
import ButtonCopy from '../ButtonCopy';
import ButtonSendToUseCase from '../ButtonSendToUseCase';
import Select from '../Select';
import Switch from '../Switch';
import RangeSlider from '../RangeSlider';
import ExpandableField from '../ExpandableField';
import Textarea from '../Textarea';
import ScreenAudioToggle from '../ScreenAudioToggle';
import MicAudioToggle from '../MicAudioToggle';
import MeetingMinutesTranscriptSegment from './MeetingMinutesTranscriptSegment';
import { PiStopCircleBold, PiMicrophoneBold } from 'react-icons/pi';
import useMicrophone from '../../hooks/useMicrophone';
import useScreenAudio from '../../hooks/useScreenAudio';
import useRealtimeTranslation from '../../hooks/useRealtimeTranslation';
import useChatApi from '../../hooks/useChatApi';
import { MODELS } from '../../hooks/useModel';

// Real-time transcript segment for chronological integration
interface RealtimeSegment {
  resultId: string;
  source: 'microphone' | 'screen';
  startTime: number;
  endTime: number;
  isPartial: boolean;
  transcripts: Transcript[];
  translation?: string;
  sessionId: number; // Session identifier for continuity
}

interface MeetingMinutesRealtimeProps {
  /** Callback when transcript text changes */
  onTranscriptChange?: (text: string) => void;
}

const MeetingMinutesRealtime: React.FC<MeetingMinutesRealtimeProps> = ({
  onTranscriptChange,
}) => {
  const { t, i18n } = useTranslation();
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef<boolean>(true);
  const generateSystemContextRef = useRef<(() => Promise<void>) | null>(null);

  // Microphone and screen audio hooks
  const {
    startTranscription: startMicTranscription,
    stopTranscription: stopMicTranscription,
    recording: micRecording,
    clearTranscripts: clearMicTranscripts,
    rawTranscripts: micRawTranscripts,
  } = useMicrophone();

  const {
    prepareScreenCapture,
    startTranscriptionWithStream,
    stopTranscription: stopScreenTranscription,
    recording: screenRecording,
    clearTranscripts: clearScreenTranscripts,
    isSupported: isScreenAudioSupported,
    error: screenAudioError,
    rawTranscripts: screenRawTranscripts,
  } = useScreenAudio();

  // Internal state management
  const [languageCode, setLanguageCode] = useState('auto');
  const [speakerLabel, setSpeakerLabel] = useState(false);
  const [maxSpeakers, setMaxSpeakers] = useState(4);
  const [speakers, setSpeakers] = useState('');
  const [enableScreenAudio, setEnableScreenAudio] = useState(false);
  const [enableMicAudio, setEnableMicAudio] = useState(true);
  const [realtimeSegments, setRealtimeSegments] = useState<RealtimeSegment[]>(
    []
  );

  // Translation states
  const [realtimeTranslationEnabled, setRealtimeTranslationEnabled] =
    useState(false);
  const [selectedTranslationModel, setSelectedTranslationModel] = useState('');
  const [selectedTargetLanguage, setSelectedTargetLanguage] = useState('ja-JP');

  // Context states for translation accuracy improvement
  const [userDefinedContext, setUserDefinedContext] = useState('');
  const [systemGeneratedContext, setSystemGeneratedContext] = useState('');

  // Simple session management
  const [currentSessionId, setCurrentSessionId] = useState(0);

  // Translation hook
  const { availableModels, translate, isTranslating } =
    useRealtimeTranslation();

  // Hook for generating system context
  const { predict } = useChatApi();

  // Generate system context based on transcript history
  const generateSystemContext = useCallback(async () => {
    const currentlyRecording = micRecording || screenRecording;

    if (
      !realtimeTranslationEnabled ||
      !currentlyRecording ||
      realtimeSegments.length === 0
    ) {
      return;
    }

    try {
      // Get transcript text from recent segments
      const transcriptText = realtimeSegments
        .filter(
          (segment) => !segment.isPartial && segment.transcripts.length > 0
        )
        .sort((a, b) => a.startTime - b.startTime)
        .map((segment) =>
          segment.transcripts
            .map((transcript) => transcript.transcript)
            .join(' ')
        )
        .join(' ')
        .trim();

      if (!transcriptText || transcriptText.length < 50) {
        return;
      }

      const { modelIds } = MODELS;
      const firstModelId = modelIds[0];

      if (!firstModelId) {
        console.error('No models available for system context generation');
        return;
      }

      const { findModelByModelId } = await import('../../hooks/useModel');
      const model = findModelByModelId(firstModelId);

      if (!model) {
        console.error('Model not found:', firstModelId);
        return;
      }

      // Get target language name for context generation
      const getLanguageNameFromCodeLocal = (languageCode: string): string => {
        const languageNameMapping: { [key: string]: string } = {
          'ja-JP': 'Japanese',
          'en-US': 'English',
          'zh-CN': 'Chinese',
          'ko-KR': 'Korean',
          'th-TH': 'Thai',
          'vi-VN': 'Vietnamese',
        };
        return languageNameMapping[languageCode] || 'Japanese';
      };
      const targetLanguageName = getLanguageNameFromCodeLocal(
        selectedTargetLanguage
      );

      const systemPrompt = `You are an AI assistant that analyzes meeting transcripts to generate context for translation improvement.
Based on the provided transcript, generate a brief context (2-3 sentences) about what kind of meeting this is, the main topics being discussed, and any technical terms or domain-specific language being used.
Focus on information that would help improve translation accuracy.
Respond in ${targetLanguageName}.`;

      const messages = [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        {
          role: 'user' as const,
          content: `Please analyze this meeting transcript and provide context for translation improvement:\n\n${transcriptText}`,
        },
      ];

      const result = await predict({
        model,
        messages,
        id: '/meeting-context',
      });

      setSystemGeneratedContext(result.trim());
    } catch (error) {
      console.error('Failed to generate system context:', error);
    }
  }, [
    realtimeTranslationEnabled,
    micRecording,
    screenRecording,
    realtimeSegments,
    selectedTargetLanguage,
    predict,
  ]);

  // Update ref with latest function
  generateSystemContextRef.current = generateSystemContext;

  // Timer for generating system context every minute
  useEffect(() => {
    const currentlyRecording = micRecording || screenRecording;

    if (!realtimeTranslationEnabled || !currentlyRecording) {
      return;
    }

    const interval = setInterval(() => {
      if (generateSystemContextRef.current) {
        generateSystemContextRef.current();
      }
    }, 60000); // 1 minute = 60,000ms

    // Initial generation after 30 seconds to get some content
    const initialTimeout = setTimeout(() => {
      if (generateSystemContextRef.current) {
        generateSystemContextRef.current();
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [realtimeTranslationEnabled, micRecording, screenRecording]);

  // Get context from recent segments for translation
  const getRecentSegmentsContext = useCallback((): string => {
    const recentSegments = realtimeSegments
      .filter((segment) => !segment.isPartial && segment.transcripts.length > 0)
      .sort((a, b) => a.startTime - b.startTime)
      .slice(-10); // Get last 10 segments

    return recentSegments
      .map((segment) =>
        segment.transcripts.map((transcript) => transcript.transcript).join(' ')
      )
      .join(' ')
      .trim();
  }, [realtimeSegments]);

  // Set default translation model on mount
  useEffect(() => {
    if (!selectedTranslationModel && availableModels.length > 0) {
      setSelectedTranslationModel(availableModels[0]);
    }
  }, [availableModels, selectedTranslationModel]);

  // Language options
  const languageOptions = useMemo(
    () => [
      { value: 'auto', label: t('meetingMinutes.language_auto') },
      { value: 'ja-JP', label: t('meetingMinutes.language_japanese') },
      { value: 'en-US', label: t('meetingMinutes.language_english') },
      { value: 'zh-CN', label: t('meetingMinutes.language_chinese') },
      { value: 'ko-KR', label: t('meetingMinutes.language_korean') },
      { value: 'th-TH', label: t('meetingMinutes.language_thai') },
      { value: 'vi-VN', label: t('meetingMinutes.language_vietnamese') },
    ],
    [t]
  );

  // Target language options for translation (excluding 'auto')
  const targetLanguageOptions = useMemo(
    () => languageOptions.filter((option) => option.value !== 'auto'),
    [languageOptions]
  );

  // Convert language code to language name for translation API
  const getLanguageNameFromCode = useCallback(
    (languageCode: string): string => {
      const languageNameMapping: { [key: string]: string } = {
        'ja-JP': 'Japanese',
        'en-US': 'English',
        'zh-CN': 'Chinese',
        'ko-KR': 'Korean',
        'th-TH': 'Thai',
        'vi-VN': 'Vietnamese',
      };
      return languageNameMapping[languageCode] || 'Japanese';
    },
    []
  );

  // Speaker mapping
  const speakerMapping = useMemo(() => {
    return Object.fromEntries(
      speakers.split(',').map((speaker, idx) => [`spk_${idx}`, speaker.trim()])
    );
  }, [speakers]);

  // Map i18n language to transcription language
  const getTranscriptionLanguageFromSettings = useCallback(
    (settingsLang: string): string => {
      const langMapping: { [key: string]: string } = {
        ja: 'ja-JP',
        en: 'en-US',
        zh: 'zh-CN',
        ko: 'ko-KR',
        th: 'th-TH',
        vi: 'vi-VN',
      };
      return langMapping[settingsLang] || 'auto';
    },
    []
  );

  // Set language from settings on mount
  useEffect(() => {
    if (i18n.resolvedLanguage && languageCode === 'auto') {
      const mappedLang = getTranscriptionLanguageFromSettings(
        i18n.resolvedLanguage
      );
      if (mappedLang !== 'auto') {
        setLanguageCode(mappedLang);
      }
    }
  }, [
    i18n.resolvedLanguage,
    languageCode,
    getTranscriptionLanguageFromSettings,
  ]);

  // Helper function to format time in MM:SS format
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Real-time text output
  const realtimeText: string = useMemo(() => {
    const sortedSegments = [...realtimeSegments].sort((a, b) => {
      // Sort by session ID first, then by time within each session
      if (a.sessionId !== b.sessionId) {
        return a.sessionId - b.sessionId;
      }
      return a.startTime - b.startTime;
    });

    return sortedSegments
      .map((segment) => {
        const timeStr = `[${formatTime(segment.startTime)}]`;
        const partialIndicator = segment.isPartial ? ' (...)' : '';

        return segment.transcripts
          .map((transcript) => {
            const speakerLabel = transcript.speakerLabel
              ? `${speakerMapping[transcript.speakerLabel] || transcript.speakerLabel}: `
              : '';
            return `${timeStr} ${speakerLabel}${transcript.transcript}${partialIndicator}`;
          })
          .join('\n');
      })
      .join('\n');
  }, [realtimeSegments, speakerMapping, formatTime]);

  // Auto scroll to bottom when transcript updates if user was at bottom
  useEffect(() => {
    if (
      transcriptContainerRef.current &&
      isAtBottomRef.current &&
      realtimeSegments.length > 0
    ) {
      setTimeout(() => {
        if (transcriptContainerRef.current) {
          transcriptContainerRef.current.scrollTop =
            transcriptContainerRef.current.scrollHeight;
        }
      }, 10);
    }
  }, [realtimeSegments]);

  // Text existence check
  const hasTranscriptText = useMemo(() => {
    return realtimeText.trim() !== '';
  }, [realtimeText]);

  // Update callback when transcript changes
  useEffect(() => {
    onTranscriptChange?.(realtimeText);
  }, [realtimeText, onTranscriptChange]);

  // Real-time integration of raw transcripts
  const updateRealtimeSegments = useCallback((newSegment: RealtimeSegment) => {
    setRealtimeSegments((prev) => {
      const existingIndex = prev.findIndex(
        (seg) =>
          seg.resultId === newSegment.resultId &&
          seg.source === newSegment.source
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newSegment;
        return updated;
      } else {
        return [...prev, newSegment];
      }
    });
  }, []);

  // Process microphone raw transcripts
  useEffect(() => {
    if (micRawTranscripts && micRawTranscripts.length > 0) {
      const latestSegment = micRawTranscripts[micRawTranscripts.length - 1];
      const segment: RealtimeSegment = {
        resultId: latestSegment.resultId,
        source: 'microphone',
        startTime: latestSegment.startTime,
        endTime: latestSegment.endTime,
        isPartial: latestSegment.isPartial,
        transcripts: latestSegment.transcripts,
        sessionId: currentSessionId,
      };
      updateRealtimeSegments(segment);
    }
  }, [micRawTranscripts, updateRealtimeSegments, currentSessionId]);

  // Process screen audio raw transcripts
  useEffect(() => {
    if (
      enableScreenAudio &&
      screenRawTranscripts &&
      screenRawTranscripts.length > 0
    ) {
      const latestSegment =
        screenRawTranscripts[screenRawTranscripts.length - 1];
      const segment: RealtimeSegment = {
        resultId: latestSegment.resultId,
        source: 'screen',
        startTime: latestSegment.startTime,
        endTime: latestSegment.endTime,
        isPartial: latestSegment.isPartial,
        transcripts: latestSegment.transcripts,
        sessionId: currentSessionId,
      };
      updateRealtimeSegments(segment);
    }
  }, [
    screenRawTranscripts,
    enableScreenAudio,
    updateRealtimeSegments,
    currentSessionId,
  ]);

  // Handle translation for completed segments
  useEffect(() => {
    if (!realtimeTranslationEnabled || !selectedTranslationModel) {
      return;
    }

    const handleTranslation = async () => {
      const segmentsNeedingTranslation = realtimeSegments.filter(
        (segment) =>
          !segment.isPartial &&
          !segment.translation &&
          !isTranslating(segment.resultId, selectedTranslationModel)
      );

      for (const segment of segmentsNeedingTranslation) {
        const segmentText = segment.transcripts
          .map((transcript) => transcript.transcript)
          .join(' ')
          .trim();

        if (!segmentText) {
          continue;
        }

        try {
          const targetLanguageName = getLanguageNameFromCode(
            selectedTargetLanguage
          );

          // Build combined context for translation
          const contexts = [];
          if (userDefinedContext.trim()) {
            contexts.push(`User-defined context: ${userDefinedContext.trim()}`);
          }
          if (systemGeneratedContext.trim()) {
            contexts.push(
              `System-generated context: ${systemGeneratedContext.trim()}`
            );
          }

          const recentSegmentsText = getRecentSegmentsContext();
          if (recentSegmentsText) {
            contexts.push(`Recent conversation context: ${recentSegmentsText}`);
          }

          const combinedContext =
            contexts.length > 0 ? contexts.join('\n\n') : undefined;

          const translation = await translate(
            segment.resultId,
            segmentText,
            selectedTranslationModel,
            targetLanguageName,
            combinedContext
          );

          if (translation) {
            setRealtimeSegments((prev) =>
              prev.map((seg) =>
                seg.resultId === segment.resultId &&
                seg.source === segment.source
                  ? { ...seg, translation }
                  : seg
              )
            );
          }
        } catch (error) {
          console.error('Failed to translate segment:', error);
        }
      }
    };

    handleTranslation();
  }, [
    realtimeSegments,
    realtimeTranslationEnabled,
    selectedTranslationModel,
    selectedTargetLanguage,
    getLanguageNameFromCode,
    isTranslating,
    translate,
    getRecentSegmentsContext,
    systemGeneratedContext,
    userDefinedContext,
  ]);

  // Recording states
  const isRecording = micRecording || screenRecording;

  // Calculate responsive transcript container height
  const getTranscriptHeight = useCallback(() => {
    const baseClasses =
      'w-full overflow-y-auto rounded border border-black/30 p-1.5 min-h-64';

    if (isRecording) {
      // Recording: Settings hidden, more space available
      return `${baseClasses} max-h-72 sm:max-h-80 lg:max-h-[60vh]`;
    } else {
      // Not recording: Settings visible, less space available
      return `${baseClasses} max-h-56 sm:max-h-64 lg:max-h-[30vh]`;
    }
  }, [isRecording]);

  // Clear function
  const handleClear = useCallback(() => {
    setRealtimeSegments([]);
    stopMicTranscription();
    stopScreenTranscription();
    clearMicTranscripts();
    clearScreenTranscripts();

    // Reset session state for fresh start
    setCurrentSessionId(0);

    onTranscriptChange?.('');
  }, [
    stopMicTranscription,
    stopScreenTranscription,
    clearMicTranscripts,
    clearScreenTranscripts,
    onTranscriptChange,
  ]);

  // Start transcription
  const onClickExecStartTranscription = useCallback(async () => {
    // Simple session management - just increment session ID when recording starts
    setCurrentSessionId((prev) => prev + 1);

    // Clear only the hooks' internal state, but preserve our segments
    clearMicTranscripts();
    clearScreenTranscripts();

    const langCode =
      languageCode === 'auto' ? undefined : (languageCode as LanguageCode);

    try {
      let screenStream: MediaStream | null = null;
      if (enableScreenAudio && isScreenAudioSupported) {
        screenStream = await prepareScreenCapture();
      }

      if (screenStream) {
        startTranscriptionWithStream(screenStream, langCode, speakerLabel);
      }
      if (enableMicAudio) {
        startMicTranscription(langCode, speakerLabel);
      }
    } catch (error) {
      console.error('Failed to start synchronized recording:', error);
      if (enableMicAudio) {
        startMicTranscription(langCode, speakerLabel);
      }
    }
  }, [
    languageCode,
    speakerLabel,
    startMicTranscription,
    enableScreenAudio,
    enableMicAudio,
    isScreenAudioSupported,
    prepareScreenCapture,
    startTranscriptionWithStream,
    clearMicTranscripts,
    clearScreenTranscripts,
  ]);

  return (
    <div>
      {/* Microphone Input Content */}
      <div className="mb-4">
        <div className="p-2">
          <div className="flex justify-center">
            {isRecording ? (
              <Button
                className="h-10"
                onClick={() => {
                  stopMicTranscription();
                  stopScreenTranscription();
                }}>
                <PiStopCircleBold className="mr-2 h-5 w-5" />
                {t('transcribe.stop_recording')}
              </Button>
            ) : (
              <Button
                className="h-10"
                onClick={onClickExecStartTranscription}
                outlined={true}>
                <PiMicrophoneBold className="mr-2 h-5 w-5" />
                {t('transcribe.start_recording')}
              </Button>
            )}
          </div>
          {!isRecording && (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <MicAudioToggle
                enabled={enableMicAudio}
                onToggle={setEnableMicAudio}
              />
              <ScreenAudioToggle
                enabled={enableScreenAudio}
                onToggle={setEnableScreenAudio}
                isSupported={isScreenAudioSupported}
                noticeText={t('transcribe.screen_audio_notice').replace(
                  /<br\/>/g,
                  '\n'
                )}
              />
              <div className="ml-0.5 mt-2">
                <Switch
                  label={t('translate.realtimeTranslation')}
                  checked={realtimeTranslationEnabled}
                  onSwitch={setRealtimeTranslationEnabled}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Language Selection and Translation Settings */}
      {!isRecording && (
        <div className="mb-4 px-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Left column: Transcription language */}
            <div>
              <label className="mb-2 block font-bold">
                {t('meetingMinutes.language')}
              </label>
              <Select
                value={languageCode}
                onChange={setLanguageCode}
                options={languageOptions}
              />
            </div>

            {/* Right column: Real-time translation settings (vertically arranged) */}
            {realtimeTranslationEnabled && (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block font-bold">
                    {t('translate.target_language')}
                  </label>
                  <Select
                    value={selectedTargetLanguage}
                    onChange={setSelectedTargetLanguage}
                    options={targetLanguageOptions}
                  />
                </div>
                <div>
                  <label className="mb-2 block font-bold">
                    {t('translate.model')}
                  </label>
                  <Select
                    value={selectedTranslationModel}
                    onChange={setSelectedTranslationModel}
                    options={availableModels.map((modelId) => ({
                      value: modelId,
                      label: MODELS.modelDisplayName(modelId),
                    }))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Translation Context - Only show when real-time translation is ON and recording */}
      {realtimeTranslationEnabled && isRecording && (
        <div className="mb-4 px-2">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-gray-700">
              {t('translate.contextHelp')}
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* User-defined Context */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t('translate.userDefinedContext')}
              </label>
              <Textarea
                placeholder={t('translate.userDefinedContextPlaceholder')}
                value={userDefinedContext}
                onChange={setUserDefinedContext}
                rows={3}
                maxHeight={80} // About 3 lines
              />
            </div>

            {/* System-generated Context */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t('translate.systemGeneratedContext')}
              </label>
              <Textarea
                placeholder={t('translate.systemGeneratedContextPlaceholder')}
                value={systemGeneratedContext}
                onChange={() => {}} // Read-only
                rows={3}
                maxHeight={80} // About 3 lines
                disabled={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Speaker Recognition Parameters */}
      {!isRecording && (
        <ExpandableField
          label={t('common.other')}
          className="mb-4"
          notItem={true}>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Switch
              label={t('transcribe.speaker_recognition')}
              checked={speakerLabel}
              onSwitch={setSpeakerLabel}
            />
            {speakerLabel && (
              <RangeSlider
                className=""
                label={t('transcribe.max_speakers')}
                min={2}
                max={10}
                value={maxSpeakers}
                onChange={setMaxSpeakers}
                help={t('transcribe.max_speakers_help')}
              />
            )}
          </div>
          {speakerLabel && (
            <div className="mt-2">
              <Textarea
                placeholder={t('transcribe.speaker_names')}
                value={speakers}
                onChange={setSpeakers}
              />
            </div>
          )}
        </ExpandableField>
      )}

      {/* Screen Audio Error Display */}
      {screenAudioError && (
        <div className="mb-4 mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <strong>{t('meetingMinutes.screen_audio_error')}</strong>
          {t('common.colon')} {screenAudioError}
        </div>
      )}

      {/* Clear Button */}
      <div className="flex justify-end gap-3">
        <Button
          outlined
          disabled={!hasTranscriptText && !isRecording}
          onClick={handleClear}>
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
                text={realtimeText}
                interUseCasesKey="transcript"></ButtonCopy>
              <ButtonSendToUseCase text={realtimeText} />
            </div>
          )}
        </div>
        <div
          ref={transcriptContainerRef}
          onScroll={(e) => {
            const target = e.target as HTMLDivElement;
            const distanceFromBottom =
              target.scrollHeight - target.clientHeight - target.scrollTop;
            const isAtBottom = distanceFromBottom < 80; // About 3-4 lines tolerance
            isAtBottomRef.current = isAtBottom;
          }}
          className={getTranscriptHeight()}>
          {realtimeSegments.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {t('transcribe.result_placeholder')}
            </div>
          ) : (
            [...realtimeSegments]
              .sort((a, b) => {
                // Sort by session ID first, then by time within each session
                if (a.sessionId !== b.sessionId) {
                  return a.sessionId - b.sessionId;
                }
                return a.startTime - b.startTime;
              })
              .map((segment, index, sortedSegments) => {
                const prevSegment =
                  index > 0 ? sortedSegments[index - 1] : null;
                const isNewSession =
                  prevSegment && segment.sessionId !== prevSegment.sessionId;

                return (
                  <React.Fragment
                    key={`${segment.resultId}-${segment.source}-${index}`}>
                    {isNewSession && (
                      <div className="my-4 flex items-center px-2">
                        <div className="grow border-t border-gray-300"></div>
                        <div className="mx-4 rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-sm text-blue-700">
                          {t('meetingMinutes.new_recording_session')}
                        </div>
                        <div className="grow border-t border-gray-300"></div>
                      </div>
                    )}
                    <MeetingMinutesTranscriptSegment
                      startTime={segment.startTime}
                      transcripts={segment.transcripts}
                      speakerMapping={speakerMapping}
                      isPartial={segment.isPartial}
                      formatTime={formatTime}
                      translation={segment.translation}
                      isTranslating={isTranslating(
                        segment.resultId,
                        selectedTranslationModel
                      )}
                      translationEnabled={realtimeTranslationEnabled}
                    />
                  </React.Fragment>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingMinutesRealtime;
