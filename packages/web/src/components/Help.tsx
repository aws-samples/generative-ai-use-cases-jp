import React from 'react';
import { BaseProps } from '../@types/common';
import { PiQuestionFill } from 'react-icons/pi';

type Props = BaseProps & {
  text: string;
};

const Help: React.FC<Props> = (props) => {
  return (
    <div className={`${props.className ?? ''} group relative`}>
      <PiQuestionFill />
      <div className="invisible absolute -top-5 z-50 bg-transparent p-3 pl-5 pt-8 text-xs font-normal text-white opacity-0 transition group-hover:visible group-hover:opacity-100">
        <div className="w-64 rounded border border-gray-400 bg-black/60 p-1 ">
          {props.text}
        </div>
      </div>
    </div>
  );
};

export default Help;
