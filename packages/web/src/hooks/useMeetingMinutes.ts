import { useState, useCallback, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import useChatApi from './useChatApi';
import useChatList from './useChatList';
import { MODELS, findModelByModelId } from './useModel';
import { getPrompter, MeetingMinutesParams, DiagramOption } from '../prompts';
import {
  UnrecordedMessage,
  Model,
  ToBeRecordedMessage,
} from 'generative-ai-use-cases';
import { decomposeId } from '../utils/ChatUtils';

export const useMeetingMinutes = (
  minutesStyle: MeetingMinutesParams['style'],
  customPrompt: string,
  autoGenerateSessionTimestamp: number | null,
  setGeneratedMinutes: (minutes: string) => void,
  setLastProcessedTranscript: (transcript: string) => void,
  setLastGeneratedTime: (time: Date | null) => void,
  diagramOptions?: DiagramOption[]
) => {
  const {
    predictStream,
    createChat,
    createMessages,
    updateTitle,
    predictTitle,
  } = useChatApi();
  const { mutate: mutateChatList } = useChatList();
  const { modelIds: availableModels, textModels } = MODELS;

  // Only keep local state for temporary values
  const [loading, setLoading] = useState(false);

  // Session-level chat ID: reused across generations within the same session
  const sessionChatIdRef = useRef<string | null>(null);
  const sessionChatRawIdRef = useRef<string | null>(null); // Full chat ID for API calls

  const generateMinutes = useCallback(
    async (
      transcript: string,
      modelId: string,
      onGenerate?: (
        status: 'generating' | 'success' | 'error',
        data?: { message?: string; minutes?: string }
      ) => void,
      existingMinutes?: string
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

        const isSavedPrompt = minutesStyle.startsWith('savedPrompt:');
        const promptContent =
          (minutesStyle === 'custom' || isSavedPrompt) && customPrompt
            ? customPrompt
            : prompter.meetingMinutesPrompt({
                style: minutesStyle,
                customPrompt,
                diagramOptions,
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
        const hasExisting = existingMinutes && existingMinutes.trim() !== '';

        // Only clear if no existing text (first generation)
        if (!hasExisting) {
          setGeneratedMinutes('');
        }

        for await (const chunk of stream) {
          if (chunk) {
            const chunks = (chunk as string).split('\n');

            for (const c of chunks) {
              if (c && c.length > 0) {
                try {
                  const payload = JSON.parse(c) as { text: string };
                  if (payload.text && payload.text.length > 0) {
                    fullResponse += payload.text;
                    // Only update during streaming if no existing text
                    if (!hasExisting) {
                      setGeneratedMinutes(fullResponse);
                    }
                  }
                } catch (error) {
                  // Skip invalid JSON chunks
                  console.debug('Skipping invalid JSON chunk:', c);
                }
              }
            }
          }
        }

        // If existing text was present, update only after completion
        if (hasExisting) {
          setGeneratedMinutes(fullResponse);
        }

        setLastProcessedTranscript(transcript);
        setLastGeneratedTime(new Date());
        onGenerate?.('success', { minutes: fullResponse });

        // Save to DynamoDB as a chat record (best-effort, non-blocking)
        // Reuse the same chat within this session so all generations are grouped together.
        try {
          const isFirstSave = !sessionChatRawIdRef.current;
          let rawChatId = sessionChatRawIdRef.current;
          let chatId = sessionChatIdRef.current;
          let chatObject: Parameters<typeof predictTitle>[0]['chat'] | null =
            null;

          if (!rawChatId || !chatId) {
            // First generation in this session: create a new chat
            const chatResponse = await createChat();
            rawChatId = chatResponse.chat.chatId;
            chatId = decomposeId(rawChatId);
            chatObject = chatResponse.chat;
            sessionChatRawIdRef.current = rawChatId;
            sessionChatIdRef.current = chatId;
          }

          const toBeRecordedMessages: ToBeRecordedMessage[] = [
            {
              role: 'user',
              content: transcript,
              messageId: uuid(),
              usecase: '/meeting-minutes',
            },
            {
              role: 'assistant',
              content: fullResponse,
              messageId: uuid(),
              usecase: '/meeting-minutes',
              llmType: modelId,
            },
          ];

          await createMessages(rawChatId, {
            messages: toBeRecordedMessages,
          });

          // Generate title on the first save only
          if (isFirstSave && chatId && chatObject) {
            const titleModel = findModelByModelId(modelId);
            if (titleModel) {
              const prompter = getPrompter(modelId);
              const titlePrompt = prompter.setTitlePrompt({
                messages: [
                  { role: 'user', content: transcript },
                  { role: 'assistant', content: fullResponse },
                ],
              });
              const generatedTitle = await predictTitle({
                model: titleModel,
                chat: chatObject,
                prompt: titlePrompt,
                id: '/title',
              });
              await updateTitle(chatId, generatedTitle, '/meeting-minutes');
            }
          }

          // Refresh the chat list so new/updated entry appears in sidebar
          mutateChatList();
        } catch (saveError) {
          // Don't fail the generation if save fails
          console.warn('Failed to save meeting minutes to history:', saveError);
        }
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
      diagramOptions,
      predictStream,
      createChat,
      createMessages,
      updateTitle,
      predictTitle,
      mutateChatList,
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
    // Reset session so next generation starts a new chat history
    sessionChatIdRef.current = null;
    sessionChatRawIdRef.current = null;
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
