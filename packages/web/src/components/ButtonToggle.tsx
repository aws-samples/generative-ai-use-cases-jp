import React from 'react';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  onSwitch: () => void;
  icon: React.ReactNode;
  isEnabled: boolean;
};

const ButtonToggle: React.FC<Props> = (props) => {
  return (
    <button
      className={`${
        props.className ?? ''
      } flex items-center justify-center rounded-xl p-2 text-xl text-white ${
        props.isEnabled ? 'bg-aws-smile' : 'bg-gray-300'
      }`}
      onClick={props.onSwitch}>
      {props.icon}
    </button>
  );
};

export default ButtonToggle;
