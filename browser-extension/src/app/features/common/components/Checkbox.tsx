import React from 'react';
import { BaseProps } from '../../../../@types/common';

type Props = BaseProps & {
  label: string;
  value: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

const Checkbox: React.FC<Props> = (props) => {
  return (
    <div className={props.className}>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          className="rounded accent-aws-smile"
          disabled={props.disabled}
          checked={props.value}
          onChange={(e) => {
            props.onChange(e.target.checked);
          }}
        />
        {props.label}
      </label>
    </div>
  );
};

export default Checkbox;
