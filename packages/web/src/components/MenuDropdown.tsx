import { Menu, Transition } from '@headlessui/react';
import React, { Fragment } from 'react';

type Props = {
  menu: React.ReactNode;
  children: React.ReactNode;
};

const MenuDropdown: React.FC<Props> = (props) => {
  return (
    <div className="flex items-center">
      <Menu as="div" className="relative">
        <div>
          <Menu.Button className="flex items-center justify-center rounded-full p-1 hover:shadow">
            {props.menu}
          </Menu.Button>
        </div>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95">
          <Menu.Items className="absolute left-0 mt-2 w-56 origin-top-left divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
            {props.children}
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
};

export default MenuDropdown;
