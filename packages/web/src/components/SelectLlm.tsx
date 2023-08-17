import React from 'react';
import { BaseProps } from '../@types/common';
import Tooltip from './Tooltip';
import { ReactComponent as MLLogo } from '../assets/model.svg';

type Props = BaseProps & {
  children?: React.ReactNode;
};

const SelectLlm: React.FC<Props> = (props) => {
  const isBedrockSelected = false;

  return (
    <div className={`${props.className ?? ''} flex justify-center`}>
      <div className="flex h-12 w-52 flex-row items-center justify-center rounded bg-gray-200 p-1 shadow-inner shadow-gray-300">
        <Tooltip
          message="Bedrock が GA され次第対応予定です"
          className="h-full">
          <div
            className={`text-aws-font-color mr-0.5 flex h-full w-24 cursor-pointer items-center justify-center rounded text-sm font-semibold ${
              isBedrockSelected ? 'bg-aws-smile shadow shadow-gray-400' : ''
            }`}>
            <MLLogo
              className={`mr-1 w-5 ${
                isBedrockSelected ? 'fill-white' : 'fill-aws-ml'
              }`}
            />
            Bedrock
          </div>
        </Tooltip>
        <div
          className={`text-aws-font-color ml-0.5 flex h-full w-24 cursor-pointer items-center justify-center rounded text-sm font-semibold ${
            isBedrockSelected ? '' : 'bg-aws-smile shadow shadow-gray-400'
          }`}>
          OpenAI
        </div>
      </div>
    </div>
  );
};

export default SelectLlm;
