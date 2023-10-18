import React from 'react';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  label?: string;
  min?: number;
  max?: number;
  value: number;
  onChange: (n: number) => void;
};

const RangeSlider: React.FC<Props> = (props) => {
  return (
    <div className={`${props.className ?? ''}`}>
      {props.label && (
        <div>
          <label className="text-sm">{props.label}</label>
        </div>
      )}
      <div className="flex gap-3">
        <input
          type="range"
          className=" w-full cursor-pointer "
          value={props.value}
          min={props.min}
          max={props.max}
          onChange={(e) => {
            props.onChange(Number.parseInt(e.target.value));
          }}
        />
        <input
          className="w-32 rounded border-black/30"
          type="number"
          min={props.min}
          max={props.max}
          value={props.value}
          onChange={(e) => {
            props.onChange(Number.parseInt(e.target.value));
          }}
        />
      </div>
    </div>
  );
};

export default RangeSlider;
