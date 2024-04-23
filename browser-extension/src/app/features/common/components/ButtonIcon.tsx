import React, { ReactNode } from 'react';
import { BaseProps } from '../../../../@types/common';
import { twMerge } from 'tailwind-merge';

type Props = BaseProps & {
  children: ReactNode;
  onClick: () => void;
};

const ButtonIcon: React.FC<Props> = (props) => {
  return (
    <button
      className={twMerge('p-2 hover:bg-white/10 rounded-full', props.className)}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
};

export default ButtonIcon;
