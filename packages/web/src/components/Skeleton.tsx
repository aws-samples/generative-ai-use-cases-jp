import React from 'react';
import { BaseProps } from '../@types/common';

type Props = BaseProps;

const Skeleton: React.FC<Props> = (props) => {
  return (
    <div
      className={`${props.className ?? ''} h-12 w-full animate-pulse bg-gray-200`}></div>
  );
};

export default Skeleton;
