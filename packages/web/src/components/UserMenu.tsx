import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import {
  PiGear,
  PiSignOut,
  // Temporarily commented out - used in Help menu
  // PiQuestion,
  // PiCaretRight,
  // PiEnvelope,
  // PiFileText,
  // PiBug,
  // PiBook,
} from 'react-icons/pi';
import useUserInfo from '../hooks/useUserInfo';
import { performLogoutAndReload } from '../utils/auth';
import SettingsModal from './SettingsModal';

const UserMenu: React.FC = () => {
  const { userInfo, loading } = useUserInfo();
  const [isOpen, setIsOpen] = useState(false);
  // const [isHelpSubmenuOpen, setIsHelpSubmenuOpen] = useState(false); // Temporarily commented out
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleLogout = async () => {
    await performLogoutAndReload('User initiated logout');
  };

  // Generate user initials from email or username
  const getInitials = () => {
    if (!userInfo) return '?';
    const email = userInfo.email || userInfo.username;
    if (email.includes('@')) {
      const [localPart] = email.split('@');
      // Get first two characters of the local part
      return localPart.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex h-14 w-full items-center justify-center">
        <div className="h-10 w-10 animate-pulse rounded-full bg-white/20" />
      </div>
    );
  }

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          className="flex h-14 w-full items-center justify-center focus:outline-none"
          aria-label="User menu">
          <div className="text-aws-squid-ink flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold">
            {getInitials()}
          </div>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={8}
          alignOffset={12}
          className="z-50 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* User Info Section */}
          <div className="border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                {getInitials()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-gray-900">
                  {userInfo?.email || userInfo?.username}
                </div>
                {userInfo?.tenantName && (
                  <div className="truncate text-xs text-gray-500">
                    {userInfo.tenantName}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Help Menu with Submenu - Temporarily commented out */}
            {/* <div
              className="relative"
              onMouseEnter={() => setIsHelpSubmenuOpen(true)}
              onMouseLeave={() => setIsHelpSubmenuOpen(false)}>
              <button
                className="flex w-full items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={(e) => {
                  e.preventDefault();
                  setIsHelpSubmenuOpen(!isHelpSubmenuOpen);
                }}>
                <div className="flex items-center gap-3">
                  <PiQuestion className="h-5 w-5 text-gray-500" />
                  <span>ヘルプ</span>
                </div>
                <PiCaretRight className="h-4 w-4 text-gray-400" />
              </button>

              {isHelpSubmenuOpen && (
                <div className="absolute left-full top-0 ml-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
                  <div className="py-2">
                    <button
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        // TODO: Implement contact functionality
                        console.log('お問い合わせ clicked');
                      }}>
                      <PiEnvelope className="h-5 w-5 text-gray-500" />
                      <span>お問い合わせ</span>
                    </button>

                    <button
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        // TODO: Implement terms and policy page
                        console.log('利用規約・ポリシー clicked');
                      }}>
                      <PiFileText className="h-5 w-5 text-gray-500" />
                      <span>利用規約・ポリシー</span>
                    </button>

                    <button
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        // TODO: Implement bug report functionality
                        console.log('バグ報告 clicked');
                      }}>
                      <PiBug className="h-5 w-5 text-gray-500" />
                      <span>バグ報告</span>
                    </button>

                    <button
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        // TODO: Implement user guide page
                        console.log('利用ガイド clicked');
                      }}>
                      <PiBook className="h-5 w-5 text-gray-500" />
                      <span>利用ガイド</span>
                    </button>
                  </div>
                </div>
              )}
            </div> */}

            {/* Settings */}
            <button
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                setIsSettingsOpen(true);
                setIsOpen(false); // Close the user menu
              }}>
              <PiGear className="h-5 w-5 text-gray-500" />
              <span>設定</span>
            </button>

            {/* Logout */}
            <button
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={handleLogout}>
              <PiSignOut className="h-5 w-5 text-gray-500" />
              <span>ログアウト</span>
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>

      {/* Settings Modal */}
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </Popover.Root>
  );
};

export default UserMenu;
