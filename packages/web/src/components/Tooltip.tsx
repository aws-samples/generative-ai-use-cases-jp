import React from 'react';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  message: string;
  children: React.ReactNode;
};

const Tooltip: React.FC<Props> = (props) => {
  return (
    <span className={`${props.className ?? ''} group relative`}>
      <span className="invisible absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-500 px-2 py-1 text-sm text-white opacity-0 transition group-hover:visible group-hover:opacity-100">
        {props.message}
      </span>
      {props.children}
    </span>
  );
};

export default Tooltip;
