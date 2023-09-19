import useChatApi from './useChatApi';

const useConversation = () => {
  const { listChats, deleteChat } = useChatApi();
  const { data, isLoading, mutate } = listChats();
  const deleteConversation = (chatId: string) => {
    return deleteChat(chatId).then(() => {
      mutate();
    });
  };

  return {
    loading: isLoading,
    conversations: data ? data.chats : [],
    mutate,
    deleteConversation,
  };
};

export default useConversation;
