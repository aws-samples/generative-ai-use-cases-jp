import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  PiDotsThreeVertical,
  PiList,
  PiSignOut,
  PiHouse,
  PiChatCircleText,
  PiPencil,
  PiNote,
  PiEnvelope,
  PiMagnifyingGlass,
  PiChatsCircle,
  PiPenNib,
} from 'react-icons/pi';
import { Outlet } from 'react-router-dom';
import Drawer from './components/Drawer';
import { Authenticator, translations } from '@aws-amplify/ui-react';
import { Amplify, I18n } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import MenuDropdown from './components/MenuDropdown';
import MenuItem from './components/MenuItem';
import useDrawer from './hooks/useDrawer';
import useConversation from './hooks/useConversation';

const items = [
  {
    label: 'ホーム',
    to: '/',
    icon: <PiHouse />,
  },
  {
    label: 'チャット',
    to: '/chat',
    icon: <PiChatsCircle />,
  },
  {
    label: 'RAG チャット',
    to: '/rag',
    icon: <PiChatCircleText />,
  },
  {
    label: '要約',
    to: '/summarize',
    icon: <PiNote />,
  },
  {
    label: '校正',
    to: '/editorial',
    icon: <PiPenNib />,
  },
  {
    label: 'メール生成',
    to: '/mail',
    icon: <PiEnvelope />,
  },
  {
    label: 'CS 業務効率化',
    to: '/cs',
    icon: <PiPencil />,
  },
  {
    label: 'Kendra 検索',
    to: '/kendra',
    icon: <PiMagnifyingGlass />,
  },
];

// /chat/:chatId の形式から :chatId を返す
// path が別の形式の場合は null を返す
const extractChatId = (path: string): string | null => {
  const pattern = /\/chat\/(.+)/;
  const match = path.match(pattern);

  return match ? match[1] : null;
};

const App: React.FC = () => {
  Amplify.configure({
    Auth: {
      userPoolId: import.meta.env.VITE_APP_USER_POOL_ID,
      userPoolWebClientId: import.meta.env.VITE_APP_USER_POOL_CLIENT_ID,
      identityPoolId: import.meta.env.VITE_APP_IDENTITY_POOL_ID,
      authenticationFlowType: 'USER_SRP_AUTH',
    },
  });

  I18n.putVocabularies(translations);
  I18n.setLanguage('ja');

  const { switchOpen: switchDrawer } = useDrawer();
  const { pathname } = useLocation();
  const { getConversationTitle } = useConversation();

  const label = useMemo(() => {
    const chatId = extractChatId(pathname);

    if (chatId) {
      return getConversationTitle(chatId) || '';
    } else {
      return items.find((i) => i.to === pathname)?.label || '';
    }
  }, [pathname, getConversationTitle]);

  return (
    <Authenticator
      components={{
        Header: () => (
          <div className="text-aws-font-color mb-5 mt-10 flex justify-center text-3xl">
            Generative AI on AWS
          </div>
        ),
      }}>
      {({ signOut }) => (
        <div className="relative flex h-screen w-screen">
          <Drawer signOut={signOut!} items={items} />

          <main className="transition-width relative min-h-screen flex-1 overflow-y-hidden">
            <header className="bg-aws-squid-ink visible flex h-12 w-full items-center justify-between text-lg text-white lg:invisible lg:h-0">
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

              <div className="flex w-10 justify-end">
                <MenuDropdown menu={<PiDotsThreeVertical />}>
                  <>
                    <MenuItem
                      icon={<PiSignOut />}
                      onClick={() => {
                        signOut ? signOut() : null;
                      }}>
                      サインアウト
                    </MenuItem>
                  </>
                </MenuDropdown>
              </div>
            </header>

            <div
              className="text-aws-font-color h-full overflow-hidden overflow-y-auto"
              id="main">
              <Outlet />
            </div>
          </main>
        </div>
      )}
    </Authenticator>
  );
};

export default App;
