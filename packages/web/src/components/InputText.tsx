import React from 'react';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  label?: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onChange?: (value: string) => void;
};

const InputText: React.FC<Props> = (props) => {
  return (
    <div className={props.className}>
      {props.label && <span className="text-sm">{props.label}</span>}
      {props.required && (
        <span className="ml-2 text-xs font-bold text-gray-800">* 必須</span>
      )}
      <input
        type="text"
        className="w-full rounded border border-black/30 p-1.5 outline-none"
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => {
          props.onChange ? props.onChange(e.target.value) : null;
        }}
      />
    </div>
  );
};

export default InputText;
