import React from 'react';
import { BaseProps } from '../@types/common';
import Help from './Help';

type Props = BaseProps & {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  help?: string;
  onChange: (n: number) => void;
};

const RangeSlider: React.FC<Props> = (props) => {
  return (
    <div className={`${props.className ?? ''}`}>
      <div className="flex justify-between">
        {props.label && (
          <div className="flex items-center">
            <label className="text-sm">{props.label}</label>
            {props.help && (
              <Help className="ml-1" message={props.help} position="center" />
            )}
          </div>
        )}
        <input
          className="h-6 w-32 rounded border-black/30 text-right"
          type="number"
          min={props.min}
          max={props.max}
          step={props.step}
          value={props.value}
          onChange={(e) => {
            props.onChange(Number.parseFloat(e.target.value));
          }}
        />
      </div>
      <div className="mt-2 flex">
        <input
          type="range"
          className="mb-6 h-1 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
          value={props.value}
          min={props.min}
          max={props.max}
          step={props.step}
          onChange={(e) => {
            props.onChange(Number.parseFloat(e.target.value));
          }}
        />
      </div>
    </div>
  );
};

export default RangeSlider;
