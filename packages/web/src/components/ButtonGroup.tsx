import React from 'react';
import RowItem, { RowItemProps } from './RowItem';

type Props = RowItemProps & {
  label?: string;
  hint?: string;
  disabled?: boolean;
  value: string | number;
  options: {
    label: string;
    value: string | number;
  }[];
  onChange: (newValue: string | number) => void;
};

const ButtonGroup: React.FC<Props> = (props) => {
  return (
    <RowItem notItem={props.notItem}>
      {props.label && <div className="text-sm">{props.label}</div>}
      <div className="flex">
        {props.options.map((option, idx) => (
          <button
            key={option.value}
            className={`${idx === 0 ? 'ml-[0px] rounded-l' : ''} ${
              idx === props.options.length - 1 ? 'rounded-r' : ''
            } ${
              props.value === option.value
                ? 'bg-aws-smile text-white'
                : 'bg-gray-300'
            } ${
              props.disabled ? 'opacity-30' : 'hover:brightness-75'
            } ml-[-1px] border p-1 px-3`}
            onClick={() => {
              props.onChange(option.value);
            }}>
            {option.label}
          </button>
        ))}
      </div>
      {props.hint && (
        <div className="mt-1 text-xs text-gray-400">{props.hint}</div>
      )}
    </RowItem>
  );
};

export default ButtonGroup;
