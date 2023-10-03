import ragPrompt from '../prompts/rag-prompt';
import useChat from './useChat';
import useChatApi from './useChatApi';
import useRagApi from './useRagApi';

const useRag = (id: string) => {
  const {
    messages,
    postChat,
    clearChats,
    loading,
    setLoading,
    updateSystemContext,
    popMessage,
    pushMessage,
    isEmpty,
  } = useChat(id);

  const { retrieve } = useRagApi();
  const { predict } = useChatApi();

  return {
    isEmpty,
    init: () => {
      clearChats('');
    },
    loading,
    messages,
    postMessage: async (content: string) => {
      // Kendra から Retrieve する際に、ローディング表示する
      setLoading(true);
      pushMessage(id, 'user', content);
      pushMessage(id, 'assistant', '[Kendra から参照ドキュメントを取得中...]');

      const query = await predict({
        messages: [
          {
            role: 'user',
            content: ragPrompt.retrieveQueryPrompt([content]),
          },
        ],
      });

      // Kendra から 参考ドキュメントを Retrieve してシステムコンテキストとして設定する
      const items = await retrieve(query);
      updateSystemContext(
        ragPrompt.systemContext(items.data.ResultItems ?? [])
      );

      // ローディング表示を消してから通常のチャットの POST 処理を実行する
      popMessage(id);
      popMessage(id);
      postChat(content);
    },
  };
};

export default useRag;
