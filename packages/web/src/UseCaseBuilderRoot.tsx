import React, { useMemo } from 'react';
import {
  PiList,
  PiX,
  PiSwatches,
  PiListDashes,
  PiNotePencil,
} from 'react-icons/pi';
import { Outlet, useLocation } from 'react-router-dom';
import { ItemProps } from './components/Drawer';
import ButtonIcon from './components/ButtonIcon';
import '@aws-amplify/ui-react/styles.css';
import useDrawer from './hooks/useDrawer';
import PopupInterUseCasesDemo from './components/PopupInterUseCasesDemo';
import useInterUseCases from './hooks/useInterUseCases';
import UseCaseBuilderDrawer from './components/useCaseBuilder/UseCaseBuilderDrawer';
import { ROUTE_INDEX_USE_CASE_BUILDER } from './main';
import usePageTitle from './hooks/usePageTitle';

const UseCaseBuilderRoot: React.FC = () => {
  const { switchOpen: switchDrawer, opened: isOpenDrawer } = useDrawer();
  const { isShow } = useInterUseCases();
  const { pathname } = useLocation();
  const { pageTitle } = usePageTitle();

  const items = useMemo<ItemProps[]>(
    () =>
      [
        {
          label: 'サンプル集',
          to: ROUTE_INDEX_USE_CASE_BUILDER,
          icon: <PiSwatches />,
          display: 'usecase' as const,
        },
        {
          label: 'マイユースケース',
          to: `${ROUTE_INDEX_USE_CASE_BUILDER}/my-use-case`,
          icon: <PiListDashes />,
          display: 'usecase' as const,
        },
        {
          label: '新規作成',
          to: `${ROUTE_INDEX_USE_CASE_BUILDER}/new`,
          icon: <PiNotePencil />,
          display: 'usecase' as const,
        },
      ].flatMap((i) => (i !== null ? [i] : [])),
    []
  );

  const label = useMemo(() => {
    const label_ = items.find((i) => i.to === pathname)?.label || '';
    if (label_) {
      return label_;
    }
    return pageTitle;
  }, [items, pageTitle, pathname]);

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

          <div className="line-clamp-1">{label}</div>

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
