import { useCallback } from 'react';
import { getPrompter } from '../prompts';
import { findModelByModelId } from './useModel';
import useChatApi from '../hooks/useChatApi';

export interface TranslationOptions {
  modelId: string;
  targetLanguage: string;
  context?: string;
}

const useTranslationCore = () => {
  const { predict } = useChatApi();

  const translate = useCallback(
    async (sentence: string, options: TranslationOptions): Promise<string> => {
      const { modelId, targetLanguage, context } = options;

      if (!sentence.trim()) {
        return '';
      }

      try {
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
          .replace(/(<output>|<\/output>|<o>|<\/o>)/g, '')
          .trim();

        return translated;
      } catch (error) {
        console.error('Translation failed:', error);
        throw error;
      }
    },
    [predict]
  );

  return {
    translate,
  };
};

export default useTranslationCore;
