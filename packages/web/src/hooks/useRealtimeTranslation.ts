import { useMemo, useCallback, useState } from 'react';
import { MODELS } from './useModel';
import useTranslationCore from './useTranslationCore';

const useRealtimeTranslation = () => {
  const { translate } = useTranslationCore();
  const { modelIds, lightModelIds } = MODELS;
  const [translating, setTranslating] = useState<{ [key: string]: boolean }>(
    {}
  );

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
      segmentId: string,
      sentence: string,
      modelId: string,
      targetLanguage: string,
      context?: string
    ): Promise<string | null> => {
      const translationKey = `${segmentId}-${modelId}`;

      if (translating[translationKey] || !sentence.trim()) {
        return null;
      }

      setTranslating((prev) => ({ ...prev, [translationKey]: true }));

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
        setTranslating((prev) => {
          const updated = { ...prev };
          delete updated[translationKey];
          return updated;
        });
      }
    },
    [translating, translate]
  );

  const isTranslating = useCallback(
    (segmentId: string, modelId: string) => {
      return translating[`${segmentId}-${modelId}`] || false;
    },
    [translating]
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
    isTranslating,
    translationInterval,
    setTranslationInterval,
    hasTextChanged,
  };
};

export default useRealtimeTranslation;
