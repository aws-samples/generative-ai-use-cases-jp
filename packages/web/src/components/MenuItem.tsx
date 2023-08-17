import { Menu } from '@headlessui/react';
import React from 'react';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  icon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
};

const MenuItem: React.FC<Props> = (props) => {
  return (
    <div className="">
      <Menu.Item>
        {({ active }) => (
          <button
            className={`${
              active ? 'bg-gray-200 ' : ''
            } group flex w-full items-center rounded-md p-2 text-sm text-gray-700`}
            onClick={props.onClick}>
            <div className="mr-1 w-4">{props.icon}</div>
            {props.children}
          </button>
        )}
      </Menu.Item>
    </div>
  );
};

export default MenuItem;
