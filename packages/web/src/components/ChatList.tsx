import React, { useCallback, useMemo } from 'react';
import { BaseProps } from '../@types/common';
import useConversation from '../hooks/useConversation';
import { useNavigate, useParams } from 'react-router-dom';
import ChatListItem from './ChatListItem';
import { decomposeId } from '../utils/ChatUtils';

type Props = BaseProps & {
  searchWords: string[];
};

const ChatList: React.FC<Props> = (props) => {
  const {
    conversations,
    loading,
    deleteConversation,
    updateConversationTitle,
  } = useConversation();
  const { chatId } = useParams();
  const navigate = useNavigate();

  const onDelete = useCallback(
    (_chatId: string) => {
      navigate('/chat');
      return deleteConversation(_chatId).catch(() => {
        navigate(`/chat/${_chatId}`);
      });
    },
    [deleteConversation, navigate]
  );

  const onUpdateTitle = useCallback(
    (_chatId: string, title: string) => {
      return updateConversationTitle(_chatId, title);
    },
    [updateConversationTitle]
  );

  const searchedConversations = useMemo(() => {
    if (props.searchWords.length === 0) {
      return conversations;
    }

    // OR 検索にしています
    return conversations.filter((c) => {
      return props.searchWords.some((w) =>
        c.title.toLowerCase().includes(w.toLowerCase())
      );
    });
  }, [props.searchWords, conversations]);

  return (
    <>
      <div
        className={`${
          props.className ?? ''
        } flex flex-col items-start gap-0.5 overflow-x-hidden`}>
        {loading &&
          new Array(10)
            .fill('')
            .map((_, idx) => (
              <div
                key={idx}
                className="bg-aws-sky/20 h-8 w-full animate-pulse rounded"></div>
            ))}
        {searchedConversations.map((chat) => {
          const _chatId = decomposeId(chat.chatId);
          return (
            <ChatListItem
              key={_chatId}
              className={`${props.className && ''}`}
              active={chatId === _chatId}
              chat={chat}
              onDelete={onDelete}
              onUpdateTitle={onUpdateTitle}
              highlightWords={props.searchWords}
            />
          );
        })}
      </div>
    </>
  );
};

export default ChatList;
