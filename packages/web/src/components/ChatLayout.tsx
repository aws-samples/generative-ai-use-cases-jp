import React from 'react';
import { Outlet } from 'react-router-dom';
import ChatSidebar from './ChatSidebar';

/**
 * ChatLayout - Common layout for chat-related pages
 * Provides ChatSidebar on the left and renders child routes via Outlet
 */
const ChatLayout: React.FC = () => {
  return (
    <>
      {/* Chat Sidebar */}
      <div className="fixed left-24 top-0 z-40 h-screen print:hidden">
        <ChatSidebar />
      </div>

      {/* Main Content Area */}
      <div className="ml-64 min-h-screen">
        <Outlet />
      </div>
    </>
  );
};

export default ChatLayout;
