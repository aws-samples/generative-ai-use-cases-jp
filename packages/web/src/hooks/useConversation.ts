import useChatApi from './useChatApi';

const useConversation = () => {
  const { listChats, deleteChat, updateTitle } = useChatApi();
  const { data, isLoading, mutate } = listChats();
  const deleteConversation = (chatId: string) => {
    return deleteChat(chatId).then(() => {
      mutate();
    });
  };
  const updateConversationTitle = (chatId: string, title: string) => {
    return updateTitle(chatId, title).then(() => {
      mutate();
    });
  };

  return {
    loading: isLoading,
    conversations: data ? data.chats : [],
    mutate,
    updateConversationTitle,
    deleteConversation,
  };
};

export default useConversation;
