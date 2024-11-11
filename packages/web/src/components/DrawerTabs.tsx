import React from 'react';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  items: {
    label: string;
    isActive?: boolean;
    onClick?: () => void;
  }[];
};

const DrawerTabs: React.FC<Props> = (props) => {
  return (
    <div className="flex flex-1 justify-between bg-white">
      {props.items.map((item, idx) => {
        return (
          <div
            key={idx}
            className="grow border-r-2 border-t border-white last:border-r-0"
            onClick={() => {
              item.onClick ? item.onClick() : null;
            }}>
            <div
              className={`${item.isActive ? 'bg-aws-squid-ink border-b-aws-squid-ink' : 'cursor-pointer bg-gray-600 hover:bg-gray-500'} flex justify-center rounded-t-lg border-b-0 p-1 px-2 `}>
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DrawerTabs;
