import { useMemo, useCallback, useState } from 'react';
import { MODELS } from './useModel';
import useTranslationCore from './useTranslationCore';

const useOneshotTranslation = () => {
  const { translate } = useTranslationCore();
  const { modelIds, lightModelIds } = MODELS;
  const [translating, setTranslating] = useState(false);

  const translationModelId = useMemo(() => {
    return lightModelIds[0] ?? modelIds[0];
  }, [modelIds, lightModelIds]);

  const translateOneshot = useCallback(
    async (sentence: string, language: string): Promise<string> => {
      if (translating) return '';

      setTranslating(true);

      try {
        const translated = await translate(sentence, {
          modelId: translationModelId,
          targetLanguage: language,
          context: undefined,
        });

        setTranslating(false);
        return translated;
      } catch (error) {
        setTranslating(false);
        return '';
      }
    },
    [translating, translationModelId, translate]
  );

  return {
    translating,
    setTranslating,
    translate: translateOneshot,
  };
};

export default useOneshotTranslation;
