import React from 'react';
import { BaseProps } from '../@types/common';
import { PiXCircle } from 'react-icons/pi';

// MEMO: 現在は Error しか実装していない
type Props = BaseProps & {
  title: string;
  severity: 'error';
  children: React.ReactNode;
};

const Alert: React.FC<Props> = (props) => {
  return (
    <div
      className={`${
        props.className ?? ''
      } flex border border-red-500 bg-red-50`}>
      <div>
        <PiXCircle className="m-3 text-4xl text-red-500" />
      </div>
      <div className="my-3 mr-3 text-sm">
        <div className="font-semibold">{props.title}</div>
        <div>{props.children}</div>
      </div>
    </div>
  );
};

export default Alert;
