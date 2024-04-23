import { useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  chatMessages,
  clearMessages,
  overwriteLatestMessage,
  pushMessages,
  replaceMessages,
} from './chatSlice';
import usePredict from './usePredict';
import { Message } from '../../../@types/chat';
import Browser from 'webextension-polyfill';
import { PromptSetting } from '../../../@types/settings';

const useChat = () => {
  // 複数のタブで起動する場合があるので、タブごとに状態を管理する
  const [tabId, setTabId] = useState<number>(-1);
  Browser.tabs?.getCurrent().then((tab) => {
    if (tab) {
      if (tab.id !== tabId) {
        setTabId(tab.id ?? -1);
      }
    }
  });

  const messages = useAppSelector((state) => chatMessages(state, tabId));
  const dispatch = useAppDispatch();
  const { predictStream } = usePredict();

  const [isLoading, setIsLoading] = useState(false);

  const isEmptyMessages = useMemo(() => {
    return messages.length === 0;
  }, [messages]);

  return {
    messages,
    isEmptyMessages,
    sendMessage: async (promptSetting: PromptSetting, content: string, isReplace?: boolean) => {
      if (tabId === -1) {
        throw new Error('Tab IDが取得できませんでした');
      }

      setIsLoading(true);
      try {
        const sendingMessage: Message[] = [
          {
            role: 'user',
            content: content,
          },
        ];
        // ignoreHistoryの場合は一問一答形式とする
        if (isEmptyMessages || promptSetting.ignoreHistory) {
          sendingMessage.unshift({
            role: 'system',
            title: promptSetting.systemContextTitle,
            content: promptSetting.systemContext,
          });
        }

        const stream = predictStream({
          model: {
            modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
            type: 'bedrock',
          },
          messages:
            isReplace || promptSetting.ignoreHistory
              ? sendingMessage
              : [...messages, ...sendingMessage],
        });
        dispatch(
          isReplace
            ? replaceMessages(tabId, [
                ...sendingMessage,
                {
                  role: 'assistant',
                  content: '▍',
                },
              ])
            : pushMessages(tabId, [
                ...sendingMessage,
                {
                  role: 'assistant',
                  content: '▍',
                },
              ]),
        );

        // Assistant の発言を更新
        let tmpChunk = '';

        for await (const chunk of stream) {
          tmpChunk += chunk;

          // chunk は 10 文字以上でまとめて処理する
          // バッファリングしないと以下のエラーが出る
          // Maximum update depth exceeded
          if (tmpChunk.length >= 10) {
            dispatch(overwriteLatestMessage(tabId, tmpChunk + '▍'));
          }
        }
        dispatch(overwriteLatestMessage(tabId, tmpChunk));
      } finally {
        setIsLoading(false);
      }
    },
    clearMessages: () => {
      if (tabId === -1) {
        throw new Error('Tab IDが取得できませんでした');
      }

      dispatch(clearMessages({ tabId }));
    },
    isLoading,
  };
};

export default useChat;
