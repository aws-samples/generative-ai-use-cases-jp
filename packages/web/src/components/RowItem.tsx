import React from 'react';
import { BaseProps } from '../@types/common';

export type RowItemProps = BaseProps & {
  notItem?: boolean;
};

type Props = RowItemProps & {
  children: React.ReactNode;
};

const RowItem: React.FC<Props> = (props) => {
  if (props.notItem) {
    return <>{props.children}</>;
  }

  return (
    <div className={`${props.className ?? ''} mb-3`}>{props.children}</div>
  );
};

export default RowItem;
