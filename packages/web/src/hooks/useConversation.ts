import useChatApi from './useChatApi';

const useConversation = () => {
  const { listChats } = useChatApi();
  const { data, isLoading } = listChats();

  return {
    loading: isLoading,
    conversations: data ? data.chats : [],
  };
};

export default useConversation;
