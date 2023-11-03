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
  PiChatsCircle,
  PiPenNib,
  PiMagnifyingGlass,
  PiTranslate,
  PiImages,
  PiSpeakerHighBold,
} from 'react-icons/pi';
import { Outlet } from 'react-router-dom';
import Drawer, { ItemProps } from './components/Drawer';
import { Authenticator, translations } from '@aws-amplify/ui-react';
import { Amplify, I18n } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import MenuDropdown from './components/MenuDropdown';
import MenuItem from './components/MenuItem';
import useDrawer from './hooks/useDrawer';
import useConversation from './hooks/useConversation';

const ragEnabled: boolean = import.meta.env.VITE_APP_RAG_ENABLED === 'true';
const selfSignUpEnabled: boolean =
  import.meta.env.VITE_APP_SELF_SIGN_UP_ENABLED === 'true';

const items: ItemProps[] = [
  {
    label: '홈',
    to: '/',
    icon: <PiHouse />,
    usecase: true,
  },
  {
    label: '채팅',
    to: '/chat',
    icon: <PiChatsCircle />,
    usecase: true,
  },
  ragEnabled
    ? {
        label: 'RAG 채팅',
        to: '/rag',
        icon: <PiChatCircleText />,
        usecase: true,
      }
    : null,
  {
    label: '문장생성',
    to: '/generate',
    icon: <PiPencil />,
    usecase: true,
  },
  {
    label: '요약',
    to: '/summarize',
    icon: <PiNote />,
    usecase: true,
  },
  {
    label: '교정',
    to: '/editorial',
    icon: <PiPenNib />,
    usecase: true,
  },
  {
    label: '번역',
    to: '/translate',
    icon: <PiTranslate />,
    usecase: true,
  },
  {
    label: '이미지생성',
    to: '/image',
    icon: <PiImages />,
    usecase: true,
  },
  {
    label: '음성인식',
    to: '/transcribe',
    icon: <PiSpeakerHighBold />,
    usecase: false,
  },
  ragEnabled
    ? {
        label: 'Kendra 검색',
        to: '/kendra',
        icon: <PiMagnifyingGlass />,
        usecase: false,
      }
    : null,
].flatMap((i) => (i !== null ? [i] : []));

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
  I18n.setLanguage('ko');

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
      hideSignUp={!selfSignUpEnabled}
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
                      로그아웃
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
