import React, { useCallback } from 'react';
import { BaseProps } from '../@types/common';
import useConversation from '../hooks/useConversation';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ChatListItem from './ChatListItem';
import { decomposeChatId } from '../utils/ChatUtils';
import useChat from '../hooks/useChat';

type Props = BaseProps;

const ChatList: React.FC<Props> = (props) => {
  const { conversations, loading, deleteConversation } = useConversation();
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { updateChatTitle } = useChat(pathname);

  const onDelete = useCallback(
    (_chatId: string) => {
      return deleteConversation(_chatId).then(() => {
        navigate('/chat');
      });
    },
    [deleteConversation, navigate]
  );

  const onUpdateTitle = useCallback(
    (title: string) => {
      return updateChatTitle(title);
    },
    [updateChatTitle]
  );

  return (
    <>
      <div
        className={`${
          props.className ?? ''
        } flex flex-col items-start gap-1 overflow-x-hidden`}>
        {loading &&
          new Array(10)
            .fill('')
            .map((_, idx) => (
              <div
                key={idx}
                className="bg-aws-sky/20 h-8 w-full animate-pulse rounded"></div>
            ))}
        {conversations.map((chat) => {
          const _chatId = decomposeChatId(chat.chatId);
          return (
            <ChatListItem
              key={_chatId}
              className={`${props.className && ''}`}
              active={chatId === _chatId}
              chat={chat}
              onDelete={onDelete}
              onUpdateTitle={onUpdateTitle}
            />
          );
        })}
      </div>
    </>
  );
};

export default ChatList;
