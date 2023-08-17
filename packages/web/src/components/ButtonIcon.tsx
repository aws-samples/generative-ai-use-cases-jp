import React from 'react';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

const ButtonIcon: React.FC<Props> = (props) => {
  return (
    <button
      className={`${
        props.className ?? ''
      } flex items-center justify-center rounded-full p-1 text-xl hover:shadow ${
        props.disabled ? 'opacity-30' : 'hover:brightness-75'
      }`}
      onClick={props.onClick}
      disabled={props.disabled}>
      {props.children}
    </button>
  );
};

export default ButtonIcon;
