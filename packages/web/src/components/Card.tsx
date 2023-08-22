import React from 'react';
import { BaseProps } from '../@types/common';
import RowItem from './RowItem';

type Props = BaseProps & {
  label?: string;
  children: React.ReactNode;
};

const Card: React.FC<Props> = (props) => {
  return (
    <div
      className={`${
        props.className ?? ''
      } border-aws-font-color/20 rounded-lg border bg-white p-5 shadow `}>
      {props.label && (
        <RowItem>
          <span className="font-semibold">{props.label}</span>
        </RowItem>
      )}
      {props.children}
    </div>
  );
};

export default Card;
