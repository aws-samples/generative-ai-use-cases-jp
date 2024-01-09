import React from 'react';
import { PiPaperPlaneRightFill, PiSpinnerGap } from 'react-icons/pi';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
};

const ButtonSend: React.FC<Props> = (props) => {
  return (
    <button
      className={`${
        props.className ?? ''
      } flex items-center justify-center rounded-xl p-2 text-xl text-white ${
        props.disabled ? 'bg-gray-300' : 'bg-aws-smile'
      }`}
      onClick={props.onClick}
      disabled={props.disabled || props.loading}>
      {props.loading ? (
        <PiSpinnerGap className="animate-spin" />
      ) : (
        <>{props.icon ? <>{props.icon}</> : <PiPaperPlaneRightFill />}</>
      )}
    </button>
  );
};

export default ButtonSend;
