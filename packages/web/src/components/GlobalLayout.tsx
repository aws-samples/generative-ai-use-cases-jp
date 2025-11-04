import React, { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar, { SidebarItemProps } from './Sidebar';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  sidebarItems: SidebarItemProps[];
  contentRef?: React.RefObject<HTMLDivElement>;
  scrollTopAnchor?: ReactNode;
  scrollBottomAnchor?: ReactNode;
};

const GlobalLayout: React.FC<Props> = (props) => {
  return (
    <div className="flex h-screen">
      {/* グローバルサイドバー */}
      <div className="fixed left-0 top-0 z-50 h-screen">
        <Sidebar items={props.sidebarItems} />
      </div>

      {/* コンテンツエリア */}
      <div
        ref={props.contentRef}
        className="text-aws-font-color ml-24 flex-1 overflow-x-hidden overflow-y-scroll">
        {props.scrollTopAnchor}
        <Outlet />
        {props.scrollBottomAnchor}
      </div>
    </div>
  );
};

export default GlobalLayout;
