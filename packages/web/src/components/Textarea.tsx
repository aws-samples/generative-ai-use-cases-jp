import React, { useEffect, useRef, useState } from 'react';
import RowItem, { RowItemProps } from './RowItem';

type Props = RowItemProps & {
  value?: string;
  label?: string;
  placeholder?: string;
  hint?: string;
  optional?: boolean;
  noBorder?: boolean;
  onChange: (value: string) => void;
};

const MAX_HEIGHT = 300;

const Textarea: React.FC<Props> = (props) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [isMax, setIsMax] = useState(false);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    ref.current.style.height = 'auto';

    if (ref.current.scrollHeight > MAX_HEIGHT) {
      ref.current.style.height = MAX_HEIGHT + 'px';
      setIsMax(true);
    } else {
      ref.current.style.height = ref.current.scrollHeight + 'px';
      setIsMax(false);
    }
  }, [props.value]);

  return (
    <RowItem notItem={props.notItem}>
      {props.label && (
        <div>
          <span className="text-sm">{props.label}</span>
          {props.optional && (
            <span className="ml-2 text-xs italic text-gray-500">
              - Optional
            </span>
          )}
        </div>
      )}
      <textarea
        ref={ref}
        className={`${
          props.className ?? ''
        } w-full resize-none rounded p-1.5 outline-none ${
          isMax ? 'overflow-y-auto' : 'overflow-hidden'
        } ${
          props.noBorder ? 'border-0 focus:ring-0 ' : 'border border-black/30'
        } `}
        rows={1}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => {
          props.onChange(e.target.value);
        }}
      />
      {props.hint && (
        <div className="-mt-0.5 text-xs text-gray-400">{props.hint}</div>
      )}
    </RowItem>
  );
};

export default Textarea;
