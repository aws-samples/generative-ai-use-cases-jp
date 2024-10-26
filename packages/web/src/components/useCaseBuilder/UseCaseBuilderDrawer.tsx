import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiMagnifyingGlass, PiArrowsClockwise } from 'react-icons/pi';
import { BaseProps } from '../../@types/common';
import DrawerItem, { DrawerItemProps } from '../DrawerItem';
import DrawerBase from '../DrawerBase';
import ExpandableMenu from '../ExpandableMenu';
import ChatList from '../ChatList';
import Button from '../Button';
import useMyUseCases from '../../hooks/useCaseBuilder/useMyUseCases';
import CustomUseCaseDrawerItems from './CustomUseCaseDrawerItems';

type Props = BaseProps & {
  items: DrawerItemProps[];
};

const UseCaseBuilderDrawer: React.FC<Props> = (props) => {
  const navigate = useNavigate();

  const { myUseCases, favoriteUseCases } = useMyUseCases();

  const items = useMemo(() => {
    return props.items;
  }, [props.items]);

  const [searchQuery, setSearchQuery] = useState('');
  const searchWords = useMemo(() => {
    return searchQuery
      .split(' ')
      .flatMap((q) => q.split('　'))
      .filter((q) => q !== '');
  }, [searchQuery]);

  return (
    <DrawerBase>
      <div className="flex h-full flex-col">
        <div className="flex-none">
          <div className="text-aws-smile mx-3 my-2 text-xs">
            ユースケース管理
          </div>
          {items.map((item, idx) => (
            <DrawerItem
              key={idx}
              className="mx-2"
              label={item.label}
              icon={item.icon}
              to={item.to}
              sub={item.sub}
            />
          ))}
          <div className="mt-2 border-b" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-col">
            <ExpandableMenu
              title="マイユースケース"
              className="mx-3 my-2 text-xs">
              <div className="scrollbar-thin scrollbar-thumb-white ml-2 mr-1 max-h-[calc((100vh-300px)/3)] min-h-0 flex-1 overflow-y-auto">
                <CustomUseCaseDrawerItems useCases={myUseCases} />
              </div>
            </ExpandableMenu>
            <div className="border-b" />
          </div>

          <div className="flex min-h-0 flex-col">
            <ExpandableMenu title="お気に入り" className="mx-3 my-2 text-xs">
              <div className="scrollbar-thin scrollbar-thumb-white ml-2 mr-1 max-h-[calc((100vh-300px)/3)] min-h-0 flex-1 overflow-y-auto">
                <CustomUseCaseDrawerItems useCases={favoriteUseCases} />
              </div>
            </ExpandableMenu>
            <div className="border-b" />
          </div>

          <div className="flex min-h-0 flex-col">
            <ExpandableMenu title="会話履歴" className="mx-3 my-2 text-xs">
              <div className="min-h-0 flex-1">
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
                <div className="scrollbar-thin scrollbar-thumb-white ml-2 mr-1 max-h-[calc((100vh-300px)/3)] overflow-y-auto">
                  <ChatList
                    className="mr-1"
                    searchWords={searchWords}
                    isUseCaseBuilder
                  />
                </div>
              </div>
            </ExpandableMenu>
          </div>
        </div>

        {/* フッター - 固定高さ */}
        <div className="flex flex-none items-center justify-center border-t border-gray-400 px-3 py-2">
          <Button
            onClick={() => {
              navigate('/');
            }}>
            <PiArrowsClockwise className="mr-2" />
            標準ユースケースへ
          </Button>
        </div>
      </div>
    </DrawerBase>
  );
};

export default UseCaseBuilderDrawer;
