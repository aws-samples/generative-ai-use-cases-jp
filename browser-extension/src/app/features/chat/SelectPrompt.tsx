import React, { useMemo, useState } from 'react';
import { BaseProps } from '../../../@types/common';
import usePrompt from '../prompt-settings/usePrompt';
import { twMerge } from 'tailwind-merge';
import Button from '../common/components/Button';
import { PiCaretUp, PiCaretUpDown } from 'react-icons/pi';
import { PromptSetting } from '../../../@types/settings';
import PromptSettingItem from '../prompt-settings/PromptSettingItem';

type Props = BaseProps & {
  selectedPromptId: string;
  onChange: (prompt: PromptSetting) => void;
};

const SelectPrompt: React.FC<Props> = (props) => {
  const { prompts } = usePrompt();

  const selectedPrompt = useMemo(() => {
    return prompts.find((prompt) => prompt.systemContextId === props.selectedPromptId);
  }, [prompts, props.selectedPromptId]);

  const [isOpenSelect, setIsOpenSelect] = useState(false);
  const [isOpenContext, setIsOpenContext] = useState(false);

  return (
    <div className={twMerge(props.className, 'relative w-full border rounded')}>
      <div className="flex justify-between items-center w-full">
        {selectedPrompt ? (
          <div
            className="flex items-center gap-1 p-1 ml-1 hover:bg-white/20 cursor-pointer flex-1"
            onClick={() => {
              setIsOpenContext(!isOpenContext);
            }}
          >
            <PiCaretUp className={twMerge('transition', isOpenContext ? 'rotate-180' : '')} />
            {selectedPrompt.systemContextTitle}
          </div>
        ) : (
          <div className="text-aws-font-color-gray">コンテキスト指定なし</div>
        )}

        <Button
          className="m-1"
          outlined
          icon={<PiCaretUpDown />}
          onClick={() => {
            setIsOpenSelect(!isOpenSelect);
          }}
        >
          選択
        </Button>
      </div>

      <div
        className={twMerge(
          'transition-all text-xs text-aws-font-color-gray px-2',
          isOpenContext ? 'max-h-[300px] overflow-y-auto pb-2 ' : 'max-h-0 overflow-hidden',
        )}
      >
        {selectedPrompt && <PromptSettingItem prompt={selectedPrompt} />}
      </div>

      <div
        className={twMerge(
          'absolute transition bottom-11 border rounded w-full bg-aws-squid-ink brightness-150',
          isOpenSelect ? 'opacity-100 max-h-[200px]' : 'opacity-0 max-h-0 overflow-hidden',
        )}
      >
        {prompts.map((prompt) => (
          <div
            key={prompt.systemContextId}
            className="border-b p-1 last:border-b-0 hover:bg-white/20 cursor-pointer"
            onClick={() => {
              props.onChange(prompt);
              setIsOpenSelect(false);
            }}
          >
            {prompt.systemContextTitle}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectPrompt;
