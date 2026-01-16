import React from 'react';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange?: (value: number) => void;
};

const Slider: React.FC<Props> = (props) => {
  return (
    <div className={props.className}>
      {props.label && <span className="text-sm">{props.label}</span>}
      <div className="flex items-center gap-2">
        <input
          type="range"
          className="flex-1"
          value={props.value}
          min={props.min}
          max={props.max}
          step={props.step || 1}
          onChange={(e) => {
            props.onChange?.(Number(e.target.value));
          }}
        />
        <span className="w-12 text-right text-sm font-medium">
          {props.value}
        </span>
      </div>
    </div>
  );
};

export default Slider;
