import React from 'react';
import { BaseProps } from '../@types/common';
import Card from './Card';
import Button from './Button';

type Props = BaseProps & {
  label: string;
  children: React.ReactNode;
  onClickDemo: () => void;
};

const CardDemo: React.FC<Props> = (props) => {
  return (
    <Card label={props.label} className={`${props.className} flex flex-col`}>
      <div className="mb-3 h-full">{props.children}</div>
      <div className="flex items-end justify-end">
        <Button onClick={props.onClickDemo}>데모</Button>
      </div>
    </Card>
  );
};

export default CardDemo;
