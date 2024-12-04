import React, { useCallback, useMemo, useState } from 'react';
import { BaseProps } from '../@types/common';
import { Link, useNavigate } from 'react-router-dom';
import useDrawer from '../hooks/useDrawer';
import { PiGithubLogo, PiBookOpen, PiMagnifyingGlass } from 'react-icons/pi';
import BedrockIcon from '../assets/bedrock.svg?react';
import ExpandableMenu from './ExpandableMenu';
import ChatList from './ChatList';
import DrawerItem, { DrawerItemProps } from './DrawerItem';
import DrawerBase from './DrawerBase';
import Switch from './Switch';
import { ROUTE_INDEX_USE_CASE_BUILDER } from '../main';

export type ItemProps = DrawerItemProps & {
  display: 'usecase' | 'tool' | 'none';
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
      <div className="mr-1 flex size-6 items-center justify-center">
        {props.icon}
      </div>
      <div>{props.label}</div>
    </Link>
  );
};

type Props = BaseProps & {
  items: ItemProps[];
};

const Drawer: React.FC<Props> = (props) => {
  const navigate = useNavigate();

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

  const useCaseBuilderEnabled: boolean =
    import.meta.env.VITE_APP_USE_CASE_BUILDER_ENABLED === 'true';

  return (
    <>
      <DrawerBase>
        {useCaseBuilderEnabled && (
          <>
            <Switch
              className="mx-3 mb-1 mt-3"
              label="ビルダーモード"
              checked={false}
              onSwitch={() => {
                navigate(ROUTE_INDEX_USE_CASE_BUILDER);
              }}
            />
            <div className="border-b" />
          </>
        )}
        <div className="text-aws-smile mx-3 my-1 text-xs">
          ユースケース <span className="text-gray-400">(生成 AI)</span>
        </div>
        <div className="scrollbar-thin scrollbar-thumb-white ml-2 mr-1 h-full overflow-y-auto">
          {usecases.map((item, idx) => (
            <DrawerItem
              key={idx}
              label={item.label}
              icon={item.icon}
              to={item.to}
              sub={item.sub}
            />
          ))}
        </div>
        <div className="border-b" />
        {tools.length > 0 && (
          <>
            <ExpandableMenu
              title="ツール"
              subTitle="(AI サービス)"
              className="mx-3 my-2 text-xs">
              <div className="mb-2 ml-2 mr-1">
                {tools.map((item, idx) => (
                  <DrawerItem
                    key={idx}
                    label={item.label}
                    icon={item.icon}
                    to={item.to}
                    sub={item.sub}
                  />
                ))}
              </div>
            </ExpandableMenu>
            <div className="border-b" />
          </>
        )}
        <ExpandableMenu title="会話履歴" className="mx-3 my-2 text-xs">
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
            <PiMagnifyingGlass className="bg-aws-squid-ink absolute left-1.5 top-1 size-7 rounded-l-full border border-white p-1.5" />
          </div>
          <div className="scrollbar-thin scrollbar-thumb-white ml-2 mr-1 h-full overflow-y-auto">
            <ChatList className="mr-1" searchWords={searchWords} />
          </div>
        </ExpandableMenu>
        <div className="border-b" />
        <ExpandableMenu
          title="リンク"
          defaultOpened={false}
          className="mx-3 my-2 text-xs">
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
      </DrawerBase>
    </>
  );
};

export default Drawer;
