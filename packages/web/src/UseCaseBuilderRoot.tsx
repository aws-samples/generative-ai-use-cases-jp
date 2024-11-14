import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { PiList, PiX, PiHammer } from 'react-icons/pi';
import { Outlet } from 'react-router-dom';
import { ItemProps } from './components/Drawer';
import ButtonIcon from './components/ButtonIcon';
import '@aws-amplify/ui-react/styles.css';
import useDrawer from './hooks/useDrawer';
import useChatList from './hooks/useChatList';
import PopupInterUseCasesDemo from './components/PopupInterUseCasesDemo';
import useInterUseCases from './hooks/useInterUseCases';
import UseCaseBuilderDrawer from './components/useCaseBuilder/UseCaseBuilderDrawer';

const items: ItemProps[] = [
  {
    label: 'ビルダーコンソール',
    to: '/use-case-builder',
    icon: <PiHammer />,
    display: 'usecase' as const,
  },
].flatMap((i) => (i !== null ? [i] : []));

// /chat/:chatId の形式から :chatId を返す
// path が別の形式の場合は null を返す
const extractChatId = (path: string): string | null => {
  const pattern = /\/chat\/(.+)/;
  const match = path.match(pattern);

  return match ? match[1] : null;
};

const UseCaseBuilderRoot: React.FC = () => {
  const { switchOpen: switchDrawer, opened: isOpenDrawer } = useDrawer();
  const { pathname } = useLocation();
  const { getChatTitle } = useChatList();
  const { isShow } = useInterUseCases();

  const label = useMemo(() => {
    const chatId = extractChatId(pathname);

    if (chatId) {
      return getChatTitle(chatId) || '';
    } else {
      return items.find((i) => i.to === pathname)?.label || '';
    }
  }, [pathname, getChatTitle]);

  return (
    <div className="screen:w-screen screen:h-screen overflow-x-hidden overflow-y-scroll">
      <main className="flex-1">
        <header className="bg-aws-squid-ink visible flex h-12 w-full items-center justify-between text-lg text-white lg:invisible lg:h-0 print:hidden">
          <div className="flex w-10 items-center justify-start">
            <button
              className="focus:ring-aws-sky mr-2 rounded-full  p-2 hover:opacity-50 focus:outline-none focus:ring-1"
              onClick={() => {
                switchDrawer();
              }}>
              <PiList />
            </button>
          </div>

          {label}

          {/* label を真ん中にするためのダミーのブロック */}
          <div className="w-10" />
        </header>

        <div
          className={`fixed -left-64 top-0 z-50 transition-all lg:left-0 lg:z-0 ${
            isOpenDrawer ? 'left-0' : '-left-64'
          }`}>
          <UseCaseBuilderDrawer items={items} />
        </div>

        <div
          id="smallDrawerFiller"
          className={`${isOpenDrawer ? 'visible' : 'invisible'} lg:invisible`}>
          <div
            className="screen:h-screen fixed top-0 z-40 w-screen bg-gray-900/90"
            onClick={switchDrawer}></div>
          <ButtonIcon
            className="fixed left-64 top-0 z-40 text-white"
            onClick={switchDrawer}>
            <PiX />
          </ButtonIcon>
        </div>
        <div className="text-aws-font-color lg:ml-64">
          {/* ユースケース間連携時に表示 */}
          {isShow && <PopupInterUseCasesDemo />}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default UseCaseBuilderRoot;
