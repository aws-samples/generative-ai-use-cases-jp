import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  tabs: {
    label: string;
    id: string;
    content: ReactNode;
  }[];
};

const Tabs: React.FC<Props> = (props) => {
  const [currentId, setCurrentId] = useState('');

  const currentIndex = useMemo(() => {
    return props.tabs.findIndex((tab) => tab.id === currentId);
  }, [currentId, props.tabs]);

  useEffect(() => {
    if (props.tabs.length > 0 && currentId === '') {
      setCurrentId(props.tabs[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.tabs]);

  return (
    <div className={props.className}>
      <div className="flex border-b pb-2">
        {props.tabs.map((tab) => {
          return (
            <div
              key={tab.id}
              className={`${currentId === tab.id && 'text-aws-smile border-b-aws-smile -mb-2 border-b-4'} cursor-pointer border-l px-4 py-1 font-bold first:border-l-0`}
              onClick={() => {
                setCurrentId(tab.id);
              }}>
              {tab.label}
            </div>
          );
        })}
      </div>
      <div className="mt-2">
        {props.tabs[currentIndex] ? props.tabs[currentIndex].content : null}
      </div>
    </div>
  );
};

export default Tabs;
