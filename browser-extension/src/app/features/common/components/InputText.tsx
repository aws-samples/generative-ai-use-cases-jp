import React from 'react';
import { BaseProps } from '../../../../@types/common';

type Props = BaseProps & {
  label?: string;
  value: string;
  disabled?: boolean;
  onChange: (val: string) => void;
};

const InputText: React.FC<Props> = (props) => {
  return (
    <div className={props.className}>
      <label>
        {props.label && <div className="text-xs text-aws-font-color-gray">{props.label}</div>}
        <input
          className="border bg-aws-squid-ink brightness-150 rounded h-8 w-full px-1"
          disabled={props.disabled}
          value={props.value}
          onChange={(e) => {
            props.onChange(e.target.value);
          }}
        />
      </label>
    </div>
  );
};

export default InputText;
