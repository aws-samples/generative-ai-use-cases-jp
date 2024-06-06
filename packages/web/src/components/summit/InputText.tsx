import React from 'react';
import RowItem, { RowItemProps } from '../RowItem';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = RowItemProps & {
  value?: string;
  label?: string;
  placeholder?: string;
  hint?: string;
  onChange: (value: string) => void;
};

const InputText = React.forwardRef<HTMLInputElement, Props>((props, ref) => {
  return (
    <RowItem notItem={props.notItem}>
      {props.label && (
        <div>
          <span className="text-sm">{props.label}</span>
        </div>
      )}
      <input
        ref={ref}
        className={`${props.className ?? ''} w-full resize-none rounded p-1.5 
         outline-none`}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => {
          props.onChange(e.target.value);
        }}
      />
      {props.hint && (
        <div className="mt-0.5 text-xs text-gray-400">{props.hint}</div>
      )}
    </RowItem>
  );
});

export default InputText;
