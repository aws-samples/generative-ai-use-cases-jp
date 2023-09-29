import ragPrompt from '../prompts/rag-prompt';
import useChat from './useChat';
import useChatApi from './useChatApi';
import useRagApi from './useRagApi';

const useRag = (id: string) => {
  const { messages, postChat, clearChats, loading, updateSystemContext } =
    useChat(id);

  const { retrieve } = useRagApi();
  const { predict } = useChatApi();

  return {
    init: () => {
      clearChats('');
    },
    loading,
    messages,
    postMessage: async (content: string) => {
      const query = await predict({
        messages: [
          {
            role: 'user',
            content: ragPrompt.retrieveQueryPrompt([content]),
          },
        ],
      });

      const items = await retrieve(query);
      updateSystemContext(
        ragPrompt.systemContext(items.data.ResultItems ?? [])
      );
      postChat(content);
    },
  };
};

export default useRag;
