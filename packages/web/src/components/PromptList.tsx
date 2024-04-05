import React, { useState, useCallback, useMemo } from 'react';
import { BaseProps } from '../@types/common';
import ExpandableMenu from './ExpandableMenu';
import { PiBookOpenText, PiFlask, PiTrash } from 'react-icons/pi';
import { ChatPageQueryParams } from '../@types/navigate';
import useChat from '../hooks/useChat';
import { getPrompter, PromptListItem } from '../prompts';
import type { PromptList } from '../prompts';
import ButtonIcon from './ButtonIcon';
import { SystemContext } from 'generative-ai-use-cases-jp';

type Props = BaseProps & {
  onClick: (params: ChatPageQueryParams) => void;
  systemContextList: SystemContext[];
  onClickDeleteSystemContext: (systemContextId: string) => void;
};

const PromptList: React.FC<Props> = (props) => {
  const { onClick, onClickDeleteSystemContext } = props;
  const [expanded, setExpanded] = useState(false);
  // PromptList はチャットのページでの利用に固定
  const { getModelId } = useChat('/chat');
  const modelId = getModelId();
  const [selectSystemContextId, setSelectSystemContextId] = useState<
    string | undefined
  >();

  const prompter = useMemo(() => {
    return getPrompter(modelId);
  }, [modelId]);

  // 上位の setExpanded にアクセスするためにコンポーネントをネストする
  const Item: React.FC<PromptListItem> = (props) => {
    const onClickPrompt = useCallback(() => {
      onClick({
        systemContext: props.systemContext,
        content: props.prompt,
      });

      setExpanded(false);
    }, [props]);

    return (
      <li
        className="my-2 cursor-pointer hover:underline"
        onClick={onClickPrompt}>
        {props.title}
      </li>
    );
  };
  const SystemContextItem: React.FC<
    Omit<SystemContext, 'id' | 'createdDate'> & { selected: boolean }
  > = (props) => {
    const onClickPrompt = useCallback(() => {
      setSelectSystemContextId(props.systemContextId);
      onClick({
        systemContext: props.systemContext,
      });
    }, [props]);

    return (
      <li className="flex">
        <div
          className="my-1 cursor-pointer truncate hover:underline"
          onClick={onClickPrompt}>
          {props.systemContextTitle}
        </div>
        {props.selected && (
          <ButtonIcon
            onClick={() => {
              onClickDeleteSystemContext(props.systemContextId);
            }}
            className="ml-auto">
            <PiTrash />
          </ButtonIcon>
        )}
      </li>
    );
  };

  return (
    <>
      {expanded && (
        <div
          className={`${props.className} fixed left-0 top-0 z-20 h-screen w-screen bg-gray-900/90`}
          onClick={() => {
            setExpanded(false);
          }}
        />
      )}

      <div
        className={`fixed top-0 transition-all ${
          expanded ? 'right-0 z-50' : '-right-64 z-30'
        } pointer-events-none flex h-full justify-center`}>
        <div
          className="bg-aws-smile pointer-events-auto mt-16 flex size-12 cursor-pointer items-center justify-center rounded-l-full"
          onClick={() => {
            setExpanded(!expanded);
          }}>
          <PiBookOpenText className="text-aws-squid-ink size-6" />
        </div>

        <div className="bg-aws-squid-ink scrollbar-thin scrollbar-thumb-white pointer-events-auto h-full w-64 overflow-y-scroll break-words p-3 text-sm text-white">
          <div className="my-2 flex items-center text-sm font-semibold">
            <PiBookOpenText className="mr-1.5 text-lg" />
            保存したシステムコンテキスト
          </div>
          <ul className="pl-6">
            {props.systemContextList.length == 0 && (
              <li className="text-gray-400">ありません</li>
            )}
            {props.systemContextList.length > 0 &&
              props.systemContextList.map((item, i) => {
                return (
                  <SystemContextItem
                    systemContextTitle={item.systemContextTitle}
                    systemContext={item.systemContext}
                    systemContextId={item.systemContextId}
                    selected={item.systemContextId === selectSystemContextId}
                    key={i}
                  />
                );
              })}
          </ul>

          <div className="mb-2 mt-4 flex items-center text-sm font-semibold">
            <PiBookOpenText className="mr-1.5 text-lg" />
            プロンプト例
          </div>

          {prompter.promptList().map((category, i) => {
            return (
              <ExpandableMenu
                title={category.title}
                className="my-2 ml-2"
                defaultOpened={false}
                icon={category.experimental && <PiFlask />}
                key={`${i}`}>
                <ul className="pl-4">
                  {category.items.map((item, j) => {
                    return (
                      <Item
                        title={item.title}
                        systemContext={item.systemContext}
                        prompt={item.prompt}
                        key={`${i}-${j}`}
                      />
                    );
                  })}
                </ul>
              </ExpandableMenu>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default PromptList;
