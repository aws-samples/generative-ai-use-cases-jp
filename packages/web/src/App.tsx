import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  PiGear,
} from 'react-icons/pi';
import { Outlet } from 'react-router-dom';
import Drawer, { ItemProps } from './components/Drawer';
import { Authenticator, translations } from '@aws-amplify/ui-react';
import { Amplify, I18n } from 'aws-amplify';
import { langStrings } from "./utils/i18n";
import '@aws-amplify/ui-react/styles.css';
import MenuDropdown from './components/MenuDropdown';
import MenuItem from './components/MenuItem';
import useDrawer from './hooks/useDrawer';
import useConversation from './hooks/useConversation';

I18n.putVocabularies(langStrings);

const ragEnabled: boolean = import.meta.env.VITE_APP_RAG_ENABLED === 'true';
const selfSignUpEnabled: boolean =
  import.meta.env.VITE_APP_SELF_SIGN_UP_ENABLED === 'true';

const items: ItemProps[] = [
  {
    label: I18n.get('home'),
    to: '/',
    icon: <PiHouse />,
    display: 'usecase' as const,
  },
  {
    label: I18n.get('settings'),
    to: '/setting',
    icon: <PiGear />,
    display: 'none' as const,
  },
  {
    label: I18n.get("chat"),
    to: '/chat',
    icon: <PiChatsCircle />,
    display: 'usecase' as const,
  },
  ragEnabled
    ? {
        label: I18n.get('rag_chat'),
        to: '/rag',
        icon: <PiChatCircleText />,
        display: 'usecase' as const,
      }
    : null,
  {
    label: I18n.get("text_gen"),
    to: '/generate',
    icon: <PiPencil />,
    display: 'usecase' as const,
  },
  {
    label: I18n.get("summarize"),
    to: '/summarize',
    icon: <PiNote />,
    display: 'usecase' as const,
  },
  {
    label: I18n.get('editor'),
    to: '/editorial',
    icon: <PiPenNib />,
    display: 'usecase' as const,
  },
  {
    label: I18n.get("translation"),
    to: '/translate',
    icon: <PiTranslate />,
    display: 'usecase' as const,
  },
  {
    label: I18n.get("image_gen"),
    to: '/image',
    icon: <PiImages />,
    display: 'usecase' as const,
  },
  {
    label: I18n.get('audio_transcription'),
    to: '/transcribe',
    icon: <PiSpeakerHighBold />,
    display: 'tool' as const,
  },
  ragEnabled
    ? {
        label: I18n.get("kendra_search"),
        to: '/kendra',
        icon: <PiMagnifyingGlass />,
        display: 'tool' as const,
      }
    : null,
].flatMap((i) => (i !== null ? [i] : []));

// /chat/:chatId の形式から :chatId を返す
// path が別の形式の場合は null を返す
///chat/: returns :chatId from the format /chat/ :chatId
//if path is in another format, it returns null

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
  // Amplify should figure out the language for us.
  //I18n.setLanguage('en');
  // I18n.putVocabularies(translations);
  // I18n.setLanguage('ja');

  const { switchOpen: switchDrawer } = useDrawer();
  const navigate = useNavigate();
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
            {I18n.get("gen_ai_on_aws")}
          </div>
        ),
      }}>
      {({ signOut }) => (
        <div className="screen:h-screen screen:w-screen relative flex">
          <Drawer signOut={signOut!} items={items} />

          <main className="transition-width relative min-h-screen flex-1 overflow-y-hidden">
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

              <div className="flex w-10 justify-end">
                <MenuDropdown menu={<PiDotsThreeVertical />}>
                  <>
                    <MenuItem
                      icon={<PiGear />}
                      onClick={() => {
                        navigate('/setting');
                      }}>
                      {I18n.get('settings')}
                    </MenuItem>
                    <MenuItem
                      icon={<PiSignOut />}
                      onClick={() => {
                        signOut ? signOut() : null;
                      }}>
                        {I18n.get("sign_out")}
                    </MenuItem>
                  </>
                </MenuDropdown>
              </div>
            </header>

            <div
              className="text-aws-font-color screen:h-full overflow-hidden overflow-y-auto"
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
