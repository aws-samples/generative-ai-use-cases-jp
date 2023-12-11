import React, { useState } from 'react';
import RowItem, { RowItemProps } from './RowItem';
import { PiCaretRightFill } from 'react-icons/pi';

type Props = RowItemProps & {
  label: string;
  defaultOpened?: boolean;
  optional?: boolean;
  children: React.ReactNode;
};

const ExpandableField: React.FC<Props> = (props) => {
  const [expanded, setExpanded] = useState(props.defaultOpened ?? false);

  return (
    <RowItem notItem={props.notItem} className={props.className}>
      <div
        className="mb-1 flex cursor-pointer items-center text-sm font-semibold"
        onClick={() => {
          setExpanded(!expanded);
        }}>
        <PiCaretRightFill
          className={`mr-1 ${expanded && 'rotate-90'} transition`}
        />
        {props.label}
        {props.optional && (
          <>
            <span className="mx-2">-</span>
            <span className="font-light italic">Optional</span>
          </>
        )}
      </div>

      {expanded && <>{props.children}</>}
    </RowItem>
  );
};

export default ExpandableField;
