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
      className={`${props.className ?? ''} rounded-lg bg-white p-5 shadow-xl`}>
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
