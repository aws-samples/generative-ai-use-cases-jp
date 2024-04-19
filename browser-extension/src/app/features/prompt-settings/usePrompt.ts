import Browser from 'webextension-polyfill';
import { useEffect, useState } from 'react';
import { presetPrompts } from './presetPrompts';
import { PromptSetting } from '../../../@types/settings';

const PROMPT_KEY = 'promptList';

const usePrompt = () => {
  const [prompts, setPrompts] = useState<PromptSetting[]>([]);
  useEffect(() => {
    Browser.storage.local.get(PROMPT_KEY).then((value) => {
      if (value[PROMPT_KEY]) {
        setPrompts(
          (value[PROMPT_KEY] as PromptSetting[]).filter(
            (val) => !!val?.systemContextId && !!val?.systemContext && !!val?.systemContextTitle,
          ),
        );
      } else {
        setPrompts([...presetPrompts]);
      }
    });
  }, []);

  return {
    prompts,
    savePrompts: (dispatch: (prev: PromptSetting[]) => PromptSetting[]) => {
      setPrompts((prev) => {
        const newPrompts = dispatch(prev);
        Browser.storage.local.set({
          [PROMPT_KEY]: newPrompts,
        });
        return newPrompts;
      });
    },
  };
};

export default usePrompt;
