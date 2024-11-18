import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BaseProps } from '../../@types/common';
import DrawerItem, { DrawerItemProps } from '../DrawerItem';
import DrawerBase from '../DrawerBase';
import ExpandableMenu from '../ExpandableMenu';
import useMyUseCases from '../../hooks/useCaseBuilder/useMyUseCases';
import CustomUseCaseDrawerItems from './CustomUseCaseDrawerItems';
import Switch from '../Switch';

type Props = BaseProps & {
  items: DrawerItemProps[];
};

const UseCaseBuilderDrawer: React.FC<Props> = (props) => {
  const navigate = useNavigate();

  const { favoriteUseCases, recentlyUsedUseCases } = useMyUseCases();

  const items = useMemo(() => {
    return props.items;
  }, [props.items]);

  return (
    <DrawerBase builderMode>
      <div className="flex-none">
        <Switch
          className="mx-3 mb-1 mt-3"
          label="ビルダーモード"
          checked
          onSwitch={() => {
            navigate('/');
          }}
        />
        <div className="border-b" />
        <div className="text-aws-smile mx-3 my-1 text-xs">メインメニュー</div>
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

      <ExpandableMenu title="お気に入り" className="mx-3 my-2 text-xs">
        <div className="scrollbar-thin scrollbar-thumb-white ml-2 mr-1 flex h-full flex-col gap-0.5 overflow-y-auto">
          <CustomUseCaseDrawerItems useCases={favoriteUseCases} />
        </div>
      </ExpandableMenu>
      <div className="border-b" />

      <ExpandableMenu title="利用履歴" className="mx-3 my-2 text-xs">
        <div className="scrollbar-thin scrollbar-thumb-white ml-2 mr-1 flex h-full flex-col overflow-y-auto">
          <CustomUseCaseDrawerItems useCases={recentlyUsedUseCases} />
        </div>
      </ExpandableMenu>
      <div className="border-b" />

      <div className="flex-1"></div>
    </DrawerBase>
  );
};

export default UseCaseBuilderDrawer;
