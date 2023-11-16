import useChat from './useChat';
import useChatApi from './useChatApi';
import useRagApi from './useRagApi';
import { ragPrompt } from '../prompts';
import { I18n } from "aws-amplify";

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
      // Show loading when retrieving from Kendra
      setLoading(true);
      pushMessage('user', content);
      pushMessage('assistant', `[${I18n.get("kendra_fetch")}...]`);

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
      // Retrieve reference documentation from Kendra and set it as system context
      const items = await retrieve(query);
      updateSystemContext(
        ragPrompt({
          promptType: 'SYSTEM_CONTEXT',
          referenceItems: items.data.ResultItems ?? [],
        })
      );

      // ローディング表示を消してから通常のチャットの POST 処理を実行する
      //Turn off the loading display and then execute the normal chat POST process
      popMessage();
      popMessage();
      postChat(content);
    },
  };
};

export default useRag;
