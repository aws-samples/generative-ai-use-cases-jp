import React, { useState } from 'react';
import { BaseProps } from '../@types/common';
import { PiCaretRightFill } from 'react-icons/pi';

type Props = BaseProps & {
  title: string;
  subTitle?: string;
  children: React.ReactNode;
  defaultOpened?: boolean;
};

const ExpandableMenu: React.FC<Props> = (props) => {
  const [expanded, setExpanded] = useState(props.defaultOpened ?? true);

  return (
    <>
      <div
        className="text-aws-smile mx-3 my-2 flex cursor-pointer text-xs"
        onClick={() => {
          setExpanded(!expanded);
        }}>
        <PiCaretRightFill className={`mr-1 ${expanded && 'rotate-90'} `} />
        <span className="mr-1">{props.title}</span>
        {props.subTitle && (
          <span className="text-gray-400">{props.subTitle}</span>
        )}
      </div>

      {expanded && <>{props.children}</>}
    </>
  );
};

export default ExpandableMenu;
