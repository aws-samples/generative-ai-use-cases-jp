import React, { useMemo } from 'react';
import { BaseProps } from '../@types/common';
import { PiInfo, PiXCircle } from 'react-icons/pi';

// MEMO: 現在は Error しか実装していない
type Props = BaseProps & {
  title?: string;
  severity: 'info' | 'error';
  children: React.ReactNode;
};

const Alert: React.FC<Props> = (props) => {
  const colors = useMemo(() => {
    if (props.severity === 'error') {
      return {
        border: 'border-red-500',
        bg: 'bg-red-50',
        icon: 'text-red-500',
      };
    }
    return {
      border: 'border-sky-500',
      bg: 'bg-sky-50',
      icon: 'text-sky-500',
    };
  }, [props.severity]);

  return (
    <div
      className={`${props.className ?? ''} flex border ${colors.border} ${
        colors.bg
      }`}>
      <div>
        {props.severity === 'error' && (
          <PiXCircle className={`m-3 text-4xl ${colors.icon}`} />
        )}
        {props.severity === 'info' && (
          <PiInfo className={`m-3 text-4xl ${colors.icon}`} />
        )}
      </div>
      <div className="my-3 mr-3 text-sm">
        <div className="font-semibold">{props.title}</div>
        <div>{props.children}</div>
      </div>
    </div>
  );
};

export default Alert;
