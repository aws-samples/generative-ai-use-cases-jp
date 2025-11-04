import React, { useMemo } from 'react';
import { BaseProps } from '../@types/common';
import SidebarItem, {
  SidebarItemProps as SidebarItemBaseProps,
} from './SidebarItem';
import UserMenu from './UserMenu';

export type SidebarItemProps = SidebarItemBaseProps & {
  display: 'usecase' | 'tool' | 'none';
};

type Props = BaseProps & {
  items: SidebarItemProps[];
};

const Sidebar: React.FC<Props> = (props) => {
  // Filter items by display type
  const allItems = useMemo(() => {
    return props.items.filter((i) => i.display !== 'none');
  }, [props.items]);

  return (
    <nav className="bg-aws-squid-ink flex h-screen w-24 flex-col text-sm text-white">
      <div className="scrollbar-thin scrollbar-thumb-white flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-1">
          {allItems.map((item, idx) => (
            <SidebarItem
              key={idx}
              label={item.label}
              icon={item.icon}
              to={item.to}
            />
          ))}
        </div>
      </div>

      {/* User Menu at the bottom */}
      <div>
        <UserMenu />
      </div>
    </nav>
  );
};

export default Sidebar;
