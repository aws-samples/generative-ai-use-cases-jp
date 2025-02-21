import React from 'react';
import ButtonIcon from '../ButtonIcon';
import { BaseProps } from '../../@types/common';
import { useNavigate } from 'react-router-dom';
import { PiPencilLine } from 'react-icons/pi';

type Props = BaseProps & {
  useCaseId: string;
};

const ButtonUseCaseEdit: React.FC<Props> = (props) => {
  const navigate = useNavigate();
  return (
    <ButtonIcon
      className={props.className ?? ''}
      onClick={() => {
        navigate(`/use-case-builder/edit/${props.useCaseId}`);
      }}>
      <PiPencilLine />
    </ButtonIcon>
  );
};

export default ButtonUseCaseEdit;
