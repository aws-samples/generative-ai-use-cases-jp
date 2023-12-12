import useChat from './useChat';
import useChatApi from './useChatApi';
import useRagApi from './useRagApi';
import { ragPrompt } from '../prompts';
import { ShownMessage } from 'generative-ai-use-cases-jp';

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
      pushMessage('user', content);
      pushMessage('assistant', '[Kendra から参照ドキュメントを取得中...]');

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
      popMessage();
      popMessage();
      postChat(
        content,
        false,
        (messages: ShownMessage[]) => {
          // 前処理：Few-shot で参考にされてしまうため、過去ログから footnote を削除
          return messages.map((message) => ({
            ...message,
            content: message.content.replace(/\[\^(\d+)\]:.*/g, ''),
          }));
        },
        (message: string) => {
          // 後処理：Footnote の付与
          const footnote = items.data.ResultItems?.map((item, idx) =>
            message.includes(`[^${idx}]`)
              ? `[^${idx}]: [${item.DocumentTitle}](${item.DocumentURI})`
              : ''
          )
            .filter((x) => x)
            .join('\n');
          return message + '\n' + footnote;
        }
      );
    },
  };
};

export default useRag;
