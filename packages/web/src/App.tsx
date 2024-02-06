import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  PiList,
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
  PiGear,
  PiGlobe,
  PiX,
  PiRobot,
} from 'react-icons/pi';
import { Outlet } from 'react-router-dom';
import Drawer, { ItemProps } from './components/Drawer';
import ButtonIcon from './components/ButtonIcon';
import { Authenticator, translations } from '@aws-amplify/ui-react';
import { Amplify, I18n } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import useDrawer from './hooks/useDrawer';
import useConversation from './hooks/useConversation';
import PopupInterUseCasesDemo from './components/PopupInterUseCasesDemo';
import useInterUseCases from './hooks/useInterUseCases';

const ragEnabled: boolean = import.meta.env.VITE_APP_RAG_ENABLED === 'true';
const agentEnabled: boolean = import.meta.env.VITE_APP_AGENT_ENABLED === 'true';
const selfSignUpEnabled: boolean =
  import.meta.env.VITE_APP_SELF_SIGN_UP_ENABLED === 'true';

const items: ItemProps[] = [
  {
    label: 'ホーム',
    to: '/',
    icon: <PiHouse />,
    display: 'usecase' as const,
  },
  {
    label: '設定情報',
    to: '/setting',
    icon: <PiGear />,
    display: 'none' as const,
  },
  {
    label: 'チャット',
    to: '/chat',
    icon: <PiChatsCircle />,
    display: 'usecase' as const,
  },
  ragEnabled
    ? {
        label: 'RAG チャット',
        to: '/rag',
        icon: <PiChatCircleText />,
        display: 'usecase' as const,
      }
    : null,
  agentEnabled
    ? {
        label: 'Agent チャット',
        to: '/agent',
        icon: <PiRobot />,
        display: 'usecase' as const,
      }
    : null,
  {
    label: '文章生成',
    to: '/generate',
    icon: <PiPencil />,
    display: 'usecase' as const,
  },
  {
    label: '要約',
    to: '/summarize',
    icon: <PiNote />,
    display: 'usecase' as const,
  },
  {
    label: '校正',
    to: '/editorial',
    icon: <PiPenNib />,
    display: 'usecase' as const,
  },
  {
    label: '翻訳',
    to: '/translate',
    icon: <PiTranslate />,
    display: 'usecase' as const,
  },
  {
    label: 'Web コンテンツ抽出',
    to: '/web-content',
    icon: <PiGlobe />,
    display: 'usecase' as const,
  },
  {
    label: '画像生成',
    to: '/image',
    icon: <PiImages />,
    display: 'usecase' as const,
  },
  {
    label: '音声認識',
    to: '/transcribe',
    icon: <PiSpeakerHighBold />,
    display: 'tool' as const,
  },
  ragEnabled
    ? {
        label: 'Kendra 検索',
        to: '/kendra',
        icon: <PiMagnifyingGlass />,
        display: 'tool' as const,
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
  I18n.setLanguage('ja');

  const { switchOpen: switchDrawer, opened: isOpenDrawer } = useDrawer();
  const { pathname } = useLocation();
  const { getConversationTitle } = useConversation();
  const { isShow } = useInterUseCases();

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
      <div className="screen:w-screen screen:h-screen overflow-x-hidden">
        <main className="flex-1">
          <header className="bg-aws-squid-ink visible flex h-12 w-full items-center justify-between text-lg text-white print:hidden lg:invisible lg:h-0">
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
            <Drawer items={items} />
          </div>

          <div
            id="smallDrawerFiller"
            className={`${
              isOpenDrawer ? 'visible' : 'invisible'
            } lg:invisible`}>
            <div
              className="screen:h-screen fixed top-0 z-40 w-screen bg-gray-900/90"
              onClick={switchDrawer}></div>
            <ButtonIcon
              className="fixed left-64 top-0 z-40 text-white"
              onClick={switchDrawer}>
              <PiX />
            </ButtonIcon>
          </div>
          <div className="text-aws-font-color lg:ml-64" id="main">
            {/* ユースケース間連携時に表示 */}
            {isShow && <PopupInterUseCasesDemo />}
            <Outlet />
          </div>
        </main>
      </div>
    </Authenticator>
  );
};

export default App;
