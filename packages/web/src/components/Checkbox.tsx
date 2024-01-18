import React from 'react';
import RowItem from './RowItem';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

const Checkbox: React.FC<Props> = (props) => {
  return (
    <RowItem className="flex items-center">
      <input
        id="checkbox"
        type="checkbox"
        className="text-aws-smile size-4 rounded border-black/30"
        checked={props.value}
        onChange={(e) => {
          props.onChange(e.target.checked);
        }}
      />
      <label htmlFor="checkbox" className="ml-2 text-sm text-gray-500">
        {props.label}
      </label>
    </RowItem>
  );
};

export default Checkbox;
