import React, { useCallback, useState } from 'react';
import { BaseProps } from '../@types/common';
import useConversation from '../hooks/useConversation';
import { PiChat, PiTrash } from 'react-icons/pi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ButtonIcon from './ButtonIcon';
import DialogConfirmDeleteChat from './DialogConfirmDeleteChat';
import { Chat } from 'generative-ai-use-cases-jp';

type Props = BaseProps;

const ChatList: React.FC<Props> = (props) => {
  const { conversations, loading, deleteConversation } = useConversation();
  const { chatId } = useParams();
  const [openDialog, setOpenDialog] = useState(false);
  const [targetDelete, setTargetDelete] = useState<Chat>();
  const navigate = useNavigate();

  const onDelete = useCallback(
    (_chatId: string) => {
      deleteConversation(_chatId).then(() => {
        setOpenDialog(false);
        navigate('/chat');
      });
    },
    [deleteConversation, navigate]
  );

  return (
    <>
      <DialogConfirmDeleteChat
        isOpen={openDialog}
        target={targetDelete}
        onDelete={onDelete}
        onClose={() => {
          setOpenDialog(false);
        }}
      />
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
          const _chatId = chat.chatId.split('#')[1];
          return (
            <div
              key={_chatId}
              className={`hover:bg-aws-sky group flex w-full items-center rounded  ${
                chatId === _chatId && 'bg-aws-sky'
              }
          ${props.className}`}>
              <Link
                className={`flex h-8 w-full items-center justify-start p-2`}
                to={`/chat/${_chatId}`}>
                <div className="mr-2 ">
                  <PiChat />
                </div>
                <div className="relative max-h-5 flex-1 overflow-hidden text-ellipsis break-all">
                  {chat.title}
                  <div
                    className={`group-hover:from-aws-sky group-hover:to-aws-sky/40 absolute inset-y-0 right-0 w-8 bg-gradient-to-l
              ${chatId === _chatId ? 'from-aws-sky' : 'from-aws-squid-ink'}
              `}></div>
                </div>
              </Link>
              {chatId === _chatId && (
                <div className="-ml-2 flex pr-2">
                  <ButtonIcon
                    onClick={() => {
                      setOpenDialog(true);
                      setTargetDelete(chat);
                    }}>
                    <PiTrash />
                  </ButtonIcon>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default ChatList;
