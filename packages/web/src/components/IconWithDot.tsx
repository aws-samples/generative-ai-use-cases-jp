import React from 'react';
import { BaseProps } from '../@types/common';
import { PiCircleFill } from 'react-icons/pi';

type Props = BaseProps & {
  showDot: boolean;
  children: React.ReactNode;
};

const IconWithDot: React.FC<Props> = (props) => {
  return (
    <div className={`relative ${props.className ?? ''}`}>
      {props.children}
      {props.showDot && (
        <PiCircleFill
          className={`text-aws-smile absolute right-[-2px] top-[-2px] text-[10px]`}
        />
      )}
    </div>
  );
};

export default IconWithDot;
