import React, { useEffect, useState } from 'react';
import usePredictor from '../hooks/usePredictor';
import useHttp from '../hooks/useHttp';
import { Chat } from 'generative-ai-use-cases-jp';

const NotFound: React.FC = () => {
  const { listChats, listMessages } = usePredictor();
  const [chats, setChats] = useState<Chat[]>([]);

  const test = async () => {
    const res = await listChats();
    setChats(res.chats);
  };

  const messages = async (chatId: string) => {
    const res = await listMessages(chatId.split('#')[1]);
    console.log(res);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <h1 className="mb-2 text-5xl">404</h1>
      <h2 className="text-aws-smile text-lg">NotFound</h2>
      <button onClick={test}>chats</button>
      <ul>
        {chats.map((c, idx) => {
          return (
            <li key={idx} onClick={() => {messages(c.chatId)}}>
              {c.title}
            </li>
          )
        })}
      </ul>
    </div>
  );
};

export default NotFound;
