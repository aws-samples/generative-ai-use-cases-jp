import React from 'react';
import { BaseProps } from '../@types/common';
import useConversation from '../hooks/useConversation';
import { PiChat } from 'react-icons/pi';
import { Link, useParams } from 'react-router-dom';

type Props = BaseProps;

const ChatList: React.FC<Props> = (props) => {
  const { conversations, loading } = useConversation();
  const { chatId } = useParams();

  return (
    <div className={`${props.className ?? ''} flex flex-col gap-1`}>
      {loading &&
        new Array(10)
          .fill('')
          .map((_, idx) => (
            <div
              key={idx}
              className="bg-aws-sky/20 h-8 w-full animate-pulse rounded"></div>
          ))}
      {conversations.map((chat) => (
        <Link
          key={chat.chatId}
          className={`hover:bg-aws-sky flex h-8 items-center rounded p-2 
          ${chatId === chat.chatId.split('#')[1] && 'bg-aws-sky'}
           ${props.className}`}
          to={`/chat/${chat.chatId.split('#')[1]}`}>
          <PiChat className="mr-2 " />
          {chat.title}
        </Link>
      ))}
    </div>
  );
};

export default ChatList;
