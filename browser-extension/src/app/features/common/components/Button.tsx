import React, { ReactNode } from 'react';
import { BaseProps } from '../../../../@types/common';
import { twMerge } from 'tailwind-merge';

type Props = BaseProps & {
  children: ReactNode;
  outlined?: boolean;
  icon?: ReactNode;
  onClick: () => void;
};

const Button: React.FC<Props> = (props) => {
  return (
    <button
      className={twMerge(
        ' p-1 px-3 rounded hover:brightness-75 flex items-center',
        props.outlined ? 'border' : 'bg-aws-smile',
        props.className,
      )}
      onClick={props.onClick}
    >
      {props.icon && <div className="mr-2 -ml-1">{props.icon}</div>}
      {props.children}
    </button>
  );
};

export default Button;
