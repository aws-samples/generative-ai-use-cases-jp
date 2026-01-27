import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PiGearSix } from 'react-icons/pi';
import Button from '../Button';
import ButtonCopy from '../ButtonCopy';
import ButtonIcon from '../ButtonIcon';
import Markdown from '../Markdown';
import MeetingMinutesSettingsModal from './MeetingMinutesSettingsModal';
import useMeetingMinutes from '../../hooks/useMeetingMinutes';
import { MODELS } from '../../hooks/useModel';
import { MeetingMinutesParams, DiagramOption } from '../../prompts';
import { claudePrompter } from '../../prompts/claude';

interface MeetingMinutesGenerationProps {
  /** Current transcript text to generate minutes from */
  transcriptText: string;
}

const MeetingMinutesGeneration: React.FC<MeetingMinutesGenerationProps> = ({
  transcriptText,
}) => {
  const { t } = useTranslation();
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldGenerateRef = useRef<boolean>(false);

  // Modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Internal state management
  const [minutesStyle, setMinutesStyle] =
    useState<MeetingMinutesParams['style']>('summary');
  const [customPrompt, setCustomPrompt] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [generationFrequency, setGenerationFrequency] = useState(5);
  const [autoGenerateSessionTimestamp] = useState<number | null>(null);
  const [generatedMinutes, setGeneratedMinutes] = useState('');
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  // Diagram options for 'diagram' style
  const [diagramOptions, setDiagramOptions] = useState<DiagramOption[]>([
    'mindmap',
  ]);

  // Toggle diagram option
  const toggleDiagramOption = useCallback((option: DiagramOption) => {
    setDiagramOptions((prev) => {
      if (prev.includes(option)) {
        // Don't allow removing the last option
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter((o) => o !== option);
      } else {
        return [...prev, option];
      }
    });
  }, []);

  // Model selection
  const { modelIds: availableModels, modelDisplayName } = MODELS;
  const [modelId, setModelId] = useState(availableModels[0] || '');

  // Meeting minutes hook
  const {
    loading: minutesLoading,
    generateMinutes,
    clearMinutes,
  } = useMeetingMinutes(
    minutesStyle,
    customPrompt,
    autoGenerateSessionTimestamp,
    setGeneratedMinutes,
    () => {}, // Empty function for setLastProcessedTranscript
    () => {}, // Empty function for setLastGeneratedTime
    minutesStyle === 'diagram' ? diagramOptions : undefined
  );

  // Text existence check
  const hasTranscriptText = useMemo(() => {
    return transcriptText.trim() !== '';
  }, [transcriptText]);

  // Get style label for display
  const styleLabel = useMemo(() => {
    const styleOptions: Record<MeetingMinutesParams['style'], string> = {
      summary: t('meetingMinutes.style_summary'),
      detail: t('meetingMinutes.style_detail'),
      faq: t('meetingMinutes.style_faq'),
      transcription: t('meetingMinutes.style_transcription'),
      diagram: t('meetingMinutes.style_diagram'),
      newspaper: t('meetingMinutes.style_newspaper'),
      whiteboard: t('meetingMinutes.style_whiteboard'),
      custom: t('meetingMinutes.style_custom'),
    };
    return styleOptions[minutesStyle];
  }, [minutesStyle, t]);

  // Watch for generation signal and trigger generation
  useEffect(() => {
    if (
      shouldGenerateRef.current &&
      autoGenerate &&
      transcriptText.trim() !== ''
    ) {
      if (!minutesLoading) {
        shouldGenerateRef.current = false;
        generateMinutes(
          transcriptText,
          modelId,
          (status) => {
            if (status === 'success') {
              toast.success(t('meetingMinutes.generation_success'));
            } else if (status === 'error') {
              toast.error(t('meetingMinutes.generation_error'));
            }
          },
          generatedMinutes
        );
      } else {
        shouldGenerateRef.current = false;
      }
    }
  }, [
    countdownSeconds,
    autoGenerate,
    transcriptText,
    minutesLoading,
    generateMinutes,
    modelId,
    t,
    generatedMinutes,
  ]);

  // Auto-generation countdown setup
  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (!autoGenerate || generationFrequency <= 0) {
      setCountdownSeconds(0);
      return;
    }

    const totalSeconds = generationFrequency * 60;
    setCountdownSeconds(totalSeconds);

    countdownIntervalRef.current = setInterval(() => {
      setCountdownSeconds((prev) => {
        const newValue = prev - 1;
        if (newValue <= 0) {
          shouldGenerateRef.current = true;
          return totalSeconds;
        }
        return newValue;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [autoGenerate, generationFrequency]);

  // Manual generation handler
  const handleManualGeneration = useCallback(() => {
    if (
      minutesStyle === 'custom' &&
      (!customPrompt || customPrompt.trim() === '')
    ) {
      toast.error(t('meetingMinutes.custom_prompt_placeholder'));
      return;
    }

    if (hasTranscriptText && !minutesLoading) {
      generateMinutes(
        transcriptText,
        modelId,
        (status) => {
          if (status === 'success') {
            toast.success(t('meetingMinutes.generation_success'));
          } else if (status === 'error') {
            toast.error(t('meetingMinutes.generation_error'));
          }
        },
        generatedMinutes
      );
    }
  }, [
    hasTranscriptText,
    transcriptText,
    minutesLoading,
    modelId,
    generateMinutes,
    t,
    minutesStyle,
    customPrompt,
    generatedMinutes,
  ]);

  // Clear minutes handler
  const handleClearMinutes = useCallback(() => {
    clearMinutes();
  }, [clearMinutes]);

  // Get system prompt for preview
  const getSystemPrompt = useCallback(
    (
      style: MeetingMinutesParams['style'],
      customPromptOverride?: string,
      diagramOptionsOverride?: DiagramOption[]
    ) => {
      const params: MeetingMinutesParams = {
        style,
        customPrompt: customPromptOverride || customPrompt,
        diagramOptions: diagramOptionsOverride || diagramOptions,
      };
      return claudePrompter.meetingMinutesPrompt(params);
    },
    [customPrompt, diagramOptions]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Compact header with settings button and action buttons */}
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ButtonIcon onClick={() => setIsSettingsOpen(true)}>
            <PiGearSix className="text-xl" />
          </ButtonIcon>
          {/* eslint-disable-next-line @shopify/jsx-no-hardcoded-content */}
          <span
            onClick={() => setIsSettingsOpen(true)}
            className="cursor-pointer text-sm text-gray-600">
            {`${styleLabel} / ${modelDisplayName(modelId)}`}
          </span>
          {autoGenerate && countdownSeconds > 0 && (
            // eslint-disable-next-line @shopify/jsx-no-hardcoded-content
            <span className="text-sm text-gray-500">
              {`(${t('meetingMinutes.next_generation')}${t('common.colon')} ${Math.floor(countdownSeconds / 60)}:${(countdownSeconds % 60).toString().padStart(2, '0')})`}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            disabled={!hasTranscriptText || minutesLoading}
            onClick={handleManualGeneration}
            loading={minutesLoading}>
            {t('meetingMinutes.generate')}
          </Button>
          <Button outlined onClick={handleClearMinutes}>
            {t('meetingMinutes.clear_minutes')}
          </Button>
        </div>
      </div>

      {/* Generated minutes display - now takes most of the space */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex shrink-0 items-center justify-between">
          <div className="font-bold">
            {t('meetingMinutes.generated_minutes')}
          </div>
          {generatedMinutes && (
            <div className="flex">
              <ButtonCopy text={generatedMinutes} interUseCasesKey="minutes" />
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded border border-black/30 p-3">
          {generatedMinutes ? (
            <Markdown>{generatedMinutes}</Markdown>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              {t('meetingMinutes.minutes_placeholder')}
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <MeetingMinutesSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        minutesStyle={minutesStyle}
        setMinutesStyle={setMinutesStyle}
        modelId={modelId}
        setModelId={setModelId}
        availableModels={availableModels}
        modelDisplayName={modelDisplayName}
        customPrompt={customPrompt}
        setCustomPrompt={setCustomPrompt}
        diagramOptions={diagramOptions}
        toggleDiagramOption={toggleDiagramOption}
        autoGenerate={autoGenerate}
        setAutoGenerate={setAutoGenerate}
        generationFrequency={generationFrequency}
        setGenerationFrequency={setGenerationFrequency}
        getSystemPrompt={getSystemPrompt}
      />
    </div>
  );
};

export default MeetingMinutesGeneration;
