import React from 'react';
import { BaseProps } from '../../@types/common';
import ButtonIcon from '../ButtonIcon';
import { PiStar, PiStarFill } from 'react-icons/pi';

type Props = BaseProps & {
  isFavorite: boolean;
  disabled?: boolean;
  onClick: () => void;
};

const ButtonFavorite: React.FC<Props> = (props) => {
  return (
    <ButtonIcon
      className={`${props.className ?? ''} ${props.isFavorite ? 'text-aws-smile' : ''}`}
      disabled={props.disabled}
      onClick={() => {
        props.onClick();
      }}>
      {props.isFavorite ? <PiStarFill /> : <PiStar />}
    </ButtonIcon>
  );
};

export default ButtonFavorite;
