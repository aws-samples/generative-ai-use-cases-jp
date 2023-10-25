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
      <div className=" invisible absolute z-50 w-64 rounded border border-gray-400 bg-black/60 p-1 text-xs font-normal text-white  opacity-0 transition group-hover:visible group-hover:opacity-100">
        {props.text}
      </div>
    </div>
  );
};

export default Help;
