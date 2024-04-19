import React from 'react';
import { BaseProps } from '../../../@types/common';
import { twMerge } from 'tailwind-merge';
import usePrompt from '../prompt-settings/usePrompt';
import { PromptSetting } from '../../../@types/settings';

type Props = BaseProps & {
  onClick: (prompt: PromptSetting) => void;
};

const PromptList: React.FC<Props> = (props) => {
  const { prompts } = usePrompt();

  return (
    <div
      className={twMerge(
        'bg-aws-squid-ink text-white rounded flex flex-col w-52 items-start border text-[13px]',
        props.className,
      )}
    >
      {prompts.map((prompt, idx) => (
        <div
          key={idx}
          className="w-full last:border-b-0 border-b cursor-pointer hover:bg-white/10 p-1"
          onClick={() => {
            props.onClick(prompt);
          }}
        >
          {prompt.systemContextTitle}
        </div>
      ))}
    </div>
  );
};

export default PromptList;
