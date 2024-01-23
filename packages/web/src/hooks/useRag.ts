import useChat from './useChat';
import useChatApi from './useChatApi';
import useRagApi from './useRagApi';
import { ragPrompt } from '../prompts';
import { ShownMessage } from 'generative-ai-use-cases-jp';
import { Model } from 'generative-ai-use-cases-jp';

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
    postMessage: async (content: string, model: Model) => {
      // Kendra から Retrieve する際に、ローディング表示する
      setLoading(true);
      pushMessage('user', content);
      pushMessage('assistant', '[Kendra から参照ドキュメントを取得中...]');

      const query = await predict({
        model: model,
        messages: [
          {
            role: 'user',
            content: ragPrompt.generatePrompt({
              promptType: 'RETRIEVE',
              retrieveQueries: [content],
            }),
          },
        ],
      });

      // Kendra から 参考ドキュメントを Retrieve してシステムコンテキストとして設定する
      const items = await retrieve(query);
      updateSystemContext(
        ragPrompt.generatePrompt({
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
        model,
        (messages: ShownMessage[]) => {
          // 前処理：Few-shot で参考にされてしまうため、過去ログから footnote を削除
          return messages.map((message) => ({
            ...message,
            content: message.content.replace(/\[\^(\d+)\]:.*/g, ''),
          }));
        },
        (message: string) => {
          // 後処理：Footnote の付与
          const footnote = items.data.ResultItems?.map((item, idx) => {
            // 参考にしたページ番号がある場合は、アンカーリンクとして設定する
            const _excerpt_page_number = item.DocumentAttributes?.find(
              (attr) => attr.Key === '_excerpt_page_number'
            )?.Value?.LongValue;
            return message.includes(`[^${idx}]`)
              ? `[^${idx}]: [${item.DocumentTitle}${_excerpt_page_number ? `(${_excerpt_page_number} ページ)` : ''}](${item.DocumentURI}${_excerpt_page_number ? `#page=${_excerpt_page_number}` : ''})`
              : '';
          })
            .filter((x) => x)
            .join('\n');
          return message + '\n' + footnote;
        }
      );
    },
  };
};

export default useRag;
