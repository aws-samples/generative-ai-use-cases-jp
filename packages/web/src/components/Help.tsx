import React from 'react';
import { BaseProps } from '../@types/common';
import { PiQuestionFill } from 'react-icons/pi';
import Tooltip from './Tooltip';

type Props = BaseProps & {
  message: string;
  direction?: 'left' | 'right';
};

const Help: React.FC<Props> = (props) => {
  return (
    <Tooltip {...props}>
      <PiQuestionFill />
    </Tooltip>
  );
};

export default Help;
