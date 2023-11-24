import React, { useCallback, useMemo, useState } from 'react';
import { BaseProps } from '../@types/common';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useDrawer from '../hooks/useDrawer';
import useVersion from '../hooks/useVersion';
import ButtonIcon from './ButtonIcon';
import IconWithDot from './IconWithDot';
import {
  PiSignOut,
  PiX,
  PiGithubLogo,
  PiGear,
  PiBookOpen,
  PiMagnifyingGlass,
} from 'react-icons/pi';
import { ReactComponent as BedrockIcon } from '../assets/bedrock.svg';
import ExpandableMenu from './ExpandableMenu';
import ChatList from './ChatList';

export type ItemProps = BaseProps & {
  label: string;
  to: string;
  icon: JSX.Element;
  display: 'usecase' | 'tool' | 'none';
};

const Item: React.FC<ItemProps> = (props) => {
  const location = useLocation();
  const { switchOpen } = useDrawer();

  // 狭い画面の場合は、クリックしたらDrawerを閉じる
  const onClick = useCallback(() => {
    if (
      document
        .getElementById('smallDrawerFiller')
        ?.classList.contains('visible')
    ) {
      switchOpen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Link
      className={`hover:bg-aws-sky mt-0.5 flex h-8 items-center rounded p-2 ${
        location.pathname === props.to && 'bg-aws-sky'
      } ${props.className}`}
      to={props.to}
      onClick={onClick}>
      <span className="mr-2">{props.icon}</span>
      <span>{props.label}</span>
    </Link>
  );
};

type RefLinkProps = BaseProps & {
  label: string;
  to: string;
  icon: JSX.Element;
};

const RefLink: React.FC<RefLinkProps> = (props) => {
  const { switchOpen } = useDrawer();

  // 狭い画面の場合は、クリックしたらDrawerを閉じる
  const onClick = useCallback(() => {
    if (
      document
        .getElementById('smallDrawerFiller')
        ?.classList.contains('visible')
    ) {
      switchOpen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Link
      className={`flex h-8 w-fit cursor-pointer items-center rounded px-1 py-2 ${props.className}`}
      to={props.to}
      onClick={onClick}
      target="_blank">
      <div className="mr-1 flex h-6 w-6 items-center justify-center">
        {props.icon}
      </div>
      <div>{props.label}</div>
    </Link>
  );
};

type Props = BaseProps & {
  signOut: () => void;
  items: ItemProps[];
};

const Drawer: React.FC<Props> = (props) => {
  const { opened, switchOpen } = useDrawer();
  const navigate = useNavigate();
  const { getHasUpdate } = useVersion();

  const hasUpdate = getHasUpdate();

  const usecases = useMemo(() => {
    return props.items.filter((i) => i.display === 'usecase');
  }, [props.items]);

  const tools = useMemo(() => {
    return props.items.filter((i) => i.display === 'tool');
  }, [props.items]);

  const [searchQuery, setSearchQuery] = useState('');
  const searchWords = useMemo(() => {
    return searchQuery
      .split(' ')
      .flatMap((q) => q.split('　'))
      .filter((q) => q !== '');
  }, [searchQuery]);

  return (
    <>
      <nav
        className={`h-full lg:visible lg:w-64 ${
          opened ? 'visible w-64' : 'invisible w-0'
        } transition-width bg-aws-squid-ink fixed z-50 flex h-screen flex-col justify-between text-sm text-white print:hidden lg:static lg:z-0`}>
        <div className="text-aws-smile mx-3 my-2 text-xs">
          ユースケース <span className="text-gray-400">(生成系AI)</span>
        </div>
        <div className="scrollbar-thin scrollbar-thumb-white ml-2 mr-1 h-full overflow-y-auto">
          {usecases.map((item, idx) => (
            <Item
              key={idx}
              label={item.label}
              icon={item.icon}
              to={item.to}
              display={item.display}
            />
          ))}
        </div>
        <div className="border-b" />
        {tools.length > 0 && (
          <>
            <ExpandableMenu title="ツール" subTitle="(AIサービス)">
              <div className="mb-2 ml-2 mr-1">
                {tools.map((item, idx) => (
                  <Item
                    key={idx}
                    label={item.label}
                    icon={item.icon}
                    to={item.to}
                    display={item.display}
                  />
                ))}
              </div>
            </ExpandableMenu>
            <div className="border-b" />
          </>
        )}
        <ExpandableMenu title="会話履歴">
          <div className="relative mb-2 ml-2 mr-1 w-full pl-1.5 pr-7 pt-1">
            <input
              className="bg-aws-squid-ink h-7 w-full rounded-full border border-white pl-8 text-sm text-white focus:border-white focus:ring-0"
              type="text"
              value={searchQuery}
              placeholder="件名で検索"
              onChange={(event) => {
                setSearchQuery(event.target.value ?? '');
              }}
            />
            <PiMagnifyingGlass className="bg-aws-squid-ink absolute left-1.5 top-1 h-7 w-7 rounded-l-full border border-white p-1.5" />
          </div>
          <div className="scrollbar-thin scrollbar-thumb-white ml-2 mr-1 h-full overflow-y-auto">
            <ChatList className="mr-1" searchWords={searchWords} />
          </div>
        </ExpandableMenu>
        <div className="border-b" />
        <ExpandableMenu title="リンク" defaultOpened={false}>
          <div className="mb-2 ml-2">
            <RefLink
              to="https://aws.amazon.com/jp/bedrock/"
              icon={<BedrockIcon className="w-4 fill-white" />}
              label="Bedrock"
            />
            <RefLink
              to="https://github.com/aws-samples/generative-ai-use-cases-jp"
              icon={<PiGithubLogo className="text-base" />}
              label="GitHub"
            />
            <RefLink
              to="https://docs.anthropic.com/claude/docs"
              icon={<PiBookOpen className="text-base" />}
              label="Claude Prompt Engineering"
            />
          </div>
        </ExpandableMenu>
        <div className="flex justify-between border-t border-gray-400 px-3 py-2">
          <ButtonIcon
            onClick={() => {
              navigate('/setting');
            }}>
            <IconWithDot showDot={hasUpdate} className="mr-2">
              <PiGear className="text-sm" />
            </IconWithDot>
            <span className="text-sm">設定情報</span>
          </ButtonIcon>
          <ButtonIcon onClick={props.signOut}>
            <PiSignOut className="mr-1 text-sm" />
            <span className="text-sm">サインアウト</span>
          </ButtonIcon>
        </div>
      </nav>

      {opened && (
        <div id="smallDrawerFiller" className="visible lg:invisible">
          <ButtonIcon
            className="fixed left-64 top-0 z-50 text-white"
            onClick={switchOpen}>
            <PiX />
          </ButtonIcon>
          <div
            className="fixed z-40 h-screen w-screen bg-gray-900/90"
            onClick={switchOpen}></div>
        </div>
      )}
    </>
  );
};

export default Drawer;
