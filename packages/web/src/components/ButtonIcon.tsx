import React, { useCallback } from 'react';
import { BaseProps } from '../@types/common';
import { PiSpinnerGap } from 'react-icons/pi';

type Props = BaseProps & {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

const ButtonIcon: React.FC<Props> = (props) => {
  const onClick = useCallback(
    (e: { preventDefault: () => void }) => {
      e.preventDefault();
      props.onClick();
    },
    [props]
  );

  return (
    <button
      className={`${
        props.className ?? ''
      } flex items-center justify-center rounded-full p-1 text-xl hover:shadow ${
        props.disabled || props.loading ? 'opacity-30' : 'hover:brightness-75'
      }`}
      onClick={onClick}
      disabled={props.disabled}>
      {props.loading ? (
        <PiSpinnerGap className="animate-spin" />
      ) : (
        props.children
      )}
    </button>
  );
};

export default ButtonIcon;
