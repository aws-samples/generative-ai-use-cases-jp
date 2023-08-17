import React from 'react';
import { BaseProps } from '../@types/common';
import ButtonIcon from './ButtonIcon';
import { PiThumbsUp, PiThumbsDown } from 'react-icons/pi';

type Props = BaseProps & {
  good: boolean;
};

const ButtonFeedback: React.FC<Props> = (props) => {
  return (
    <ButtonIcon
      className={`${props.className ?? ''} ${
        props.good ? 'text-green-500' : 'text-red-500'
      }`}
      onClick={() => {}}>
      {props.good ? <PiThumbsUp /> : <PiThumbsDown />}
    </ButtonIcon>
  );
};

export default ButtonFeedback;
