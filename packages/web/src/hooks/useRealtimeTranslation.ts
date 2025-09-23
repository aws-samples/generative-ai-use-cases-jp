import { useMemo, useCallback, useState, useRef } from 'react';
import { MODELS } from './useModel';
import useTranslationCore from './useTranslationCore';

const useRealtimeTranslation = () => {
  const { translate } = useTranslationCore();
  const { modelIds, lightModelIds } = MODELS;
  const translatingRef = useRef<{ [key: string]: boolean }>({});

  // Interval for real-time translation (in milliseconds)
  const [translationInterval, setTranslationInterval] = useState<number>(1000);

  // Get available models with light models prioritized first
  const availableModels = useMemo(() => {
    const remainingModels = modelIds.filter(
      (id) => !lightModelIds.includes(id)
    );
    return [...lightModelIds, ...remainingModels];
  }, [modelIds, lightModelIds]);

  const translateRealtime = useCallback(
    async (
      requestId: string,
      sentence: string,
      modelId: string,
      targetLanguage: string,
      context?: string
    ): Promise<string | null> => {
      const translationKey = requestId;

      if (!sentence.trim()) {
        return null;
      }

      // Check current translation state using ref
      if (translatingRef.current[translationKey]) {
        return null;
      }

      // Add to translation state when starting
      translatingRef.current[translationKey] = true;

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
      } finally {
        // Remove from translation state when finished
        delete translatingRef.current[translationKey];
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
