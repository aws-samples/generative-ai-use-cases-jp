import React from 'react';
import { BaseProps } from '../@types/common';
import { PiSpinnerGap } from 'react-icons/pi';

type Props = BaseProps & {
  disabled?: boolean;
  loading?: boolean;
  outlined?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

const Button: React.FC<Props> = (props) => {
  return (
    <button
      className={`${props.className ?? ''} ${
        props.outlined
          ? 'text-aws-font-color/80 bg-white'
          : 'bg-aws-smile text-white'
      }
      flex items-center justify-center rounded-lg border p-1 px-3 ${
        props.disabled || props.loading ? 'opacity-30' : 'hover:brightness-75'
      }`}
      onClick={props.onClick}
      disabled={props.disabled || props.loading}>
      {props.loading && <PiSpinnerGap className="mr-2 animate-spin" />}
      {props.children}
    </button>
  );
};

export default Button;
