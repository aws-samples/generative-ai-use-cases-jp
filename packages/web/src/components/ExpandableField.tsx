import React, { useMemo, useState } from 'react';
import RowItem, { RowItemProps } from './RowItem';
import { PiCaretRightFill } from 'react-icons/pi';

type Props = RowItemProps & {
  label: string;
  defaultOpened?: boolean;
  optional?: boolean;
  children: React.ReactNode;
  // トグル状態を親コンポーネントから制御したい場合のプロパティ
  overrideExpanded?: boolean;
  setOverrideExpanded?: (overrideExpanded: boolean) => void;
};

const ExpandableField: React.FC<Props> = (props) => {
  const [expanded, setExpanded] = useState(props.defaultOpened ?? false);

  // トグル状態の上書きに対応するために expanded と overrideExpanded の or をとる
  const expandState = useMemo(
    () => expanded || props.overrideExpanded,
    [expanded, props.overrideExpanded]
  );

  return (
    <RowItem notItem={props.notItem} className={props.className}>
      <div
        className="mb-1 flex cursor-pointer items-center text-sm font-semibold"
        onClick={() => {
          setExpanded(!expandState);
          if (props.setOverrideExpanded) {
            props.setOverrideExpanded(!expandState);
          }
        }}>
        <PiCaretRightFill
          className={`mr-1 ${expandState && 'rotate-90'} transition`}
        />
        {props.label}
        {props.optional && (
          <>
            <span className="mx-2">-</span>
            <span className="font-light italic">Optional</span>
          </>
        )}
      </div>

      {expandState && <>{props.children}</>}
    </RowItem>
  );
};

export default ExpandableField;
