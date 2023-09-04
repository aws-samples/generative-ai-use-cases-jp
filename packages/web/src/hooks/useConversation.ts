import useChatApi from './useChatApi';

const useConversation = () => {
  const { listChats } = useChatApi();
  const { data, isLoading, mutate } = listChats();

  return {
    loading: isLoading,
    conversations: data ? data.chats : [],
    mutate,
  };
};

export default useConversation;
