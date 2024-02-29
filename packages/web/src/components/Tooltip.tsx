import React, { useMemo } from 'react';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  message: string;
  position?: 'left' | 'right' | 'center';
  children: React.ReactNode;
};

const Tooltip: React.FC<Props> = (props) => {
  const position = useMemo(() => {
    switch (props.position) {
      case 'left':
        return 'right-0';
      case 'right':
        return 'left-0';
      case 'center':
        return 'left-1/2 -translate-x-1/2';
    }
  }, [props]);

  return (
    <div className={`${props.className ?? ''} group relative`}>
      <div
        className={`invisible absolute ${position} -top-5 z-50 bg-transparent p-3 pl-5 pt-8 text-xs font-normal text-white opacity-0 transition group-hover:visible group-hover:opacity-100`}>
        <div className="w-64 rounded border border-gray-400 bg-black/90 p-1 ">
          {props.message}
        </div>
      </div>
      {props.children}
    </div>
  );
};

export default Tooltip;
