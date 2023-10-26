import React from 'react';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  message: string;
  direction?: 'left' | 'right';
  children: React.ReactNode;
};

const Tooltip: React.FC<Props> = (props) => {
  return (
    <div className={`${props.className ?? ''} group relative`}>
      <div
        className={`${
          props.direction === 'left' ? 'right-0' : ''
        } invisible absolute -top-5 z-50 bg-transparent p-3 pl-5 pt-8 text-xs font-normal text-white opacity-0 transition group-hover:visible group-hover:opacity-100`}>
        <div className="w-64 rounded border border-gray-400 bg-black/60 p-1 ">
          {props.message}
        </div>
      </div>
      {props.children}
    </div>
  );
};

export default Tooltip;
