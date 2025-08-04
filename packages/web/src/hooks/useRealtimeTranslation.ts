import { useMemo, useCallback, useState } from 'react';
import { getPrompter } from '../prompts';
import { MODELS, findModelByModelId } from './useModel';
import useChatApi from '../hooks/useChatApi';

const useRealtimeTranslation = () => {
  const { predict } = useChatApi();
  const { modelIds, lightModelIds } = MODELS;
  const [translating, setTranslating] = useState<{ [key: string]: boolean }>(
    {}
  );

  // Get available models with light models prioritized first
  const availableModels = useMemo(() => {
    const remainingModels = modelIds.filter(
      (id) => !lightModelIds.includes(id)
    );
    return [...lightModelIds, ...remainingModels];
  }, [modelIds, lightModelIds]);

  // Default model prioritizes light models first
  const defaultModelId = useMemo(() => {
    return lightModelIds[0] || modelIds[0];
  }, [lightModelIds, modelIds]);

  const translate = useCallback(
    async (
      segmentId: string,
      sentence: string,
      modelId: string,
      targetLanguage: string = 'Japanese',
      context?: string
    ): Promise<string | null> => {
      const translationKey = `${segmentId}-${modelId}`;

      if (translating[translationKey] || !sentence.trim()) {
        return null;
      }

      setTranslating((prev) => ({ ...prev, [translationKey]: true }));

      try {
        // Translate using the same mechanism as the Translation use case
        const id = '/translate';
        const prompter = getPrompter(modelId);
        const systemPrompt = prompter.systemContext(id);
        const translationPrompt = prompter.translatePrompt({
          sentence,
          language: targetLanguage,
          context,
        });
        const model = findModelByModelId(modelId);

        if (!model) {
          throw new Error(`Model not found: ${modelId}`);
        }

        const messages = [
          {
            role: 'system' as const,
            content: systemPrompt,
          },
          {
            role: 'user' as const,
            content: translationPrompt,
          },
        ];

        const translatedWithTag = await predict({
          model,
          messages,
          id,
        });

        // Remove output tags
        const translated = translatedWithTag
          .replace(/(<output>|<\/output>|<output>|<\/o>)/g, '')
          .trim();

        return translated;
      } catch (error) {
        console.error('Translation failed:', error);
        return null;
      } finally {
        setTranslating((prev) => {
          const updated = { ...prev };
          delete updated[translationKey];
          return updated;
        });
      }
    },
    [translating, predict]
  );

  const isTranslating = useCallback(
    (segmentId: string, modelId: string) => {
      return translating[`${segmentId}-${modelId}`] || false;
    },
    [translating]
  );

  return {
    availableModels,
    defaultModelId,
    translate,
    isTranslating,
  };
};

export default useRealtimeTranslation;
