import { useMemo, useCallback, useState } from 'react';
import { MODELS } from './useModel';
import useTranslationCore from './useTranslationCore';

const useRealtimeTranslation = () => {
  const { translate } = useTranslationCore();
  const { modelIds, lightModelIds } = MODELS;

  // Interval for real-time translation (in milliseconds)
  const [translationInterval, setTranslationInterval] = useState<number>(2000);

  // Get available models with light models prioritized first
  const availableModels = useMemo(() => {
    const remainingModels = modelIds.filter(
      (id) => !lightModelIds.includes(id)
    );
    return [...lightModelIds, ...remainingModels];
  }, [modelIds, lightModelIds]);

  const translateRealtime = useCallback(
    async (
      sentence: string,
      modelId: string,
      targetLanguage: string,
      context?: string
    ): Promise<string | null> => {
      if (!sentence.trim()) {
        return null;
      }

      try {
        const translated = await translate(sentence, {
          modelId,
          targetLanguage,
          context,
        });

        return translated;
      } catch (error) {
        console.error('Translation failed:', error);
        return null;
      }
    },
    [translate]
  );

  // Check if text has changed (for diff detection)
  const hasTextChanged = useCallback(
    (currentText: string, lastTranslatedText?: string): boolean => {
      return currentText.trim() !== (lastTranslatedText || '').trim();
    },
    []
  );

  return {
    availableModels,
    translate: translateRealtime,
    translationInterval,
    setTranslationInterval,
    hasTextChanged,
  };
};

export default useRealtimeTranslation;
