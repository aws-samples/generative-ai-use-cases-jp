import useChat from './useChat';
import useChatApi from './useChatApi';
import useRagApi from './useRagApi';
import { ragPrompt } from '../prompts';

const useRag = (id: string) => {
  const {
    messages,
    postChat,
    clear,
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
    clear,
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
            content: ragPrompt({
              promptType: 'RETRIEVE',
              retrieveQueries: [content],
            }),
          },
        ],
      });

      // Kendra から 参考ドキュメントを Retrieve してシステムコンテキストとして設定する
      const items = await retrieve(query);
      updateSystemContext(
        ragPrompt({
          promptType: 'SYSTEM_CONTEXT',
          referenceItems: items.data.ResultItems ?? [],
        })
      );

      // ローディング表示を消してから通常のチャットの POST 処理を実行する
      popMessage(id);
      popMessage(id);
      postChat(content);
    },
  };
};

export default useRag;
