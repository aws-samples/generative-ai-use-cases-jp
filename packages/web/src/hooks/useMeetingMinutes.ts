import { useState, useCallback } from 'react';
import useChatApi from './useChatApi';
import { MODELS } from './useModel';
import { getPrompter } from '../prompts';
import { UnrecordedMessage, Model } from 'generative-ai-use-cases';

export type MeetingMinutesStyle =
  | 'faq'
  | 'newspaper'
  | 'transcription'
  | 'custom';

export const useMeetingMinutes = (
  minutesStyle: MeetingMinutesStyle,
  customPrompt: string,
  autoGenerateSessionTimestamp: number | null,
  setGeneratedMinutes: (minutes: string) => void,
  setLastProcessedTranscript: (transcript: string) => void,
  setLastGeneratedTime: (time: Date | null) => void
) => {
  const { predictStream } = useChatApi();
  const { modelIds: availableModels, textModels } = MODELS;

  // Only keep local state for temporary values
  const [loading, setLoading] = useState(false);

  const generateMinutes = useCallback(
    async (
      transcript: string,
      modelId: string,
      onGenerate?: (
        status: 'generating' | 'success' | 'error',
        data?: { message?: string; minutes?: string }
      ) => void
    ) => {
      if (!transcript || transcript.trim() === '') return;

      const model = textModels.find((m) => m.modelId === modelId);
      if (!model) {
        onGenerate?.('error', { message: 'Model not found' });
        return;
      }

      setLoading(true);
      onGenerate?.('generating');

      try {
        const prompter = getPrompter(modelId);

        const promptContent =
          minutesStyle === 'custom' && customPrompt
            ? customPrompt
            : prompter.meetingMinutesPrompt({
                style: minutesStyle,
                customPrompt,
              });

        const messages: UnrecordedMessage[] = [
          {
            role: 'system',
            content: promptContent,
          },
          {
            role: 'user',
            content: transcript,
          },
        ];

        const stream = predictStream({
          model: model as Model,
          messages,
          id: `meeting-minutes-${autoGenerateSessionTimestamp || Date.now()}`,
        });

        let fullResponse = '';
        setGeneratedMinutes('');

        for await (const chunk of stream) {
          if (chunk) {
            const chunks = (chunk as string).split('\n');

            for (const c of chunks) {
              if (c && c.length > 0) {
                try {
                  const payload = JSON.parse(c) as { text: string };
                  if (payload.text && payload.text.length > 0) {
                    fullResponse += payload.text;
                    setGeneratedMinutes(fullResponse);
                  }
                } catch (error) {
                  // Skip invalid JSON chunks
                  console.debug('Skipping invalid JSON chunk:', c);
                }
              }
            }
          }
        }

        setLastProcessedTranscript(transcript);
        setLastGeneratedTime(new Date());
        onGenerate?.('success', { minutes: fullResponse });
      } catch (error) {
        onGenerate?.('error', {
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setLoading(false);
      }
    },
    [
      minutesStyle,
      customPrompt,
      predictStream,
      textModels,
      autoGenerateSessionTimestamp,
      setGeneratedMinutes,
      setLastGeneratedTime,
      setLastProcessedTranscript,
    ]
  );

  const clearMinutes = useCallback(() => {
    setGeneratedMinutes('');
    setLastProcessedTranscript('');
    setLastGeneratedTime(null);
  }, [setGeneratedMinutes, setLastProcessedTranscript, setLastGeneratedTime]);

  return {
    // State
    loading,

    // Actions
    generateMinutes,
    clearMinutes,

    // Utilities
    availableModels,
  };
};

export default useMeetingMinutes;
