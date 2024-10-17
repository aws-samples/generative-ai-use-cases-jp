import React from 'react';
import { BaseProps } from '../../../../@types/common';

type Props = BaseProps & {
  checked: boolean;
  onSwitch: (newValue: boolean) => void;
  label: string;
};

const Switch: React.FC<Props> = (props) => {
  return (
    <div>
      <label className="relative inline-flex cursor-pointer items-center hover:underline">
        <input
          type="checkbox"
          value=""
          className="peer sr-only"
          checked={props.checked}
          onChange={() => {
            props.onSwitch(!props.checked);
          }}
        />
        <div className="peer-checked:bg-aws-smile peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white rtl:peer-checked:after:-translate-x-full"></div>
        <span className="ml-1 text-xs font-medium">{props.label}</span>
      </label>
    </div>
  );
};

export default Switch;
