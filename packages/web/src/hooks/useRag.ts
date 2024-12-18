import { useMemo } from 'react';
import useChat from './useChat';
import useChatApi from './useChatApi';
import useRagApi from './useRagApi';
import { ShownMessage } from 'generative-ai-use-cases-jp';
import { findModelByModelId } from './useModel';
import { getPrompter } from '../prompts';
import { RetrieveResultItem, DocumentAttribute } from '@aws-sdk/client-kendra';
import { cleanEncode } from '../utils/URLUtils';

// 同一のドキュメントとみなす Key 値
const uniqueKeyOfItem = (item: RetrieveResultItem): string => {
  const pageNumber =
    item.DocumentAttributes?.find(
      (a: DocumentAttribute) => a.Key === '_excerpt_page_number'
    )?.Value?.LongValue ?? '';
  const uri = item.DocumentURI;
  return `${uri}_${pageNumber}`;
};

export const arrangeItems = (
  items: RetrieveResultItem[]
): RetrieveResultItem[] => {
  const res: Record<string, RetrieveResultItem> = {};

  for (const item of items) {
    const key = uniqueKeyOfItem(item);

    if (res[key]) {
      // 同じソースの Content は ... で接続する
      res[key].Content += ' ... ' + item.Content;
    } else {
      res[key] = item;
    }
  }

  return Object.values(res);
};

const useRag = (id: string) => {
  const {
    getModelId,
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

  const modelId = getModelId();
  const { retrieve } = useRagApi();
  const { predict } = useChatApi();
  const prompter = useMemo(() => {
    return getPrompter(modelId);
  }, [modelId]);

  return {
    isEmpty,
    clear,
    loading,
    messages,
    postMessage: async (content: string) => {
      const model = findModelByModelId(modelId);

      if (!model) {
        console.error(`model not found for ${modelId}`);
        return;
      }
      const prevQueries = messages
        .filter((m) => m.role === 'user')
        .map((m) => m.content);

      // Kendra から Retrieve する際に、ローディング表示する
      setLoading(true);
      pushMessage('user', content);
      pushMessage('assistant', 'Kendra から参照ドキュメントを取得中...');

      const query = await predict({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompter.ragPrompt({
              promptType: 'RETRIEVE',
              retrieveQueries: [...prevQueries, content],
            }),
          },
        ],
        id: id,
      });

      // Kendra から 参考ドキュメントを Retrieve してシステムプロンプトとして設定する
      let items: RetrieveResultItem[] = [];
      try {
        const retrievedItems = await retrieve(query);
        items = arrangeItems(retrievedItems.data.ResultItems ?? []);
      } catch (error) {
        popMessage();
        pushMessage(
          'assistant',
          `Kendra から参照ドキュメントを取得できませんでした。次の対応を検討してください。
- Amazon Kendraインデックス作成としてスケジュールした時刻と、その時刻からインデックス作成に必要な時間が経ったかを確認する
- Amazon Kendraインデックス削除としてスケジュールした時刻を過ぎていないか確認する`
        );
        setLoading(false);
        return;
      }

      if (items.length == 0) {
        popMessage();
        pushMessage(
          'assistant',
          `参考ドキュメントが見つかりませんでした。次の対応を検討してください。
- Amazon Kendra の data source に対象のドキュメントが追加されているか確認する
- Amazon Kendra の data source が sync されているか確認する
- 入力の表現を変更する`
        );
        setLoading(false);
        return;
      }

      updateSystemContext(
        prompter.ragPrompt({
          promptType: 'SYSTEM_CONTEXT',
          referenceItems: items,
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
            content: message.content
              .replace(/\[\^0\]:[\s\S]*/s, '') // 文末の脚注を削除
              .replace(/\[\^(\d+)\]/g, '') // 文中の脚注アンカーを削除
              .trim(), // 前後の空白を削除
          }));
        },
        (message: string) => {
          // 後処理：Footnote の付与
          const footnote = items
            .map((item, idx) => {
              // 参考にしたページ番号がある場合は、アンカーリンクとして設定する
              const _excerpt_page_number = item.DocumentAttributes?.find(
                (attr) => attr.Key === '_excerpt_page_number'
              )?.Value?.LongValue;
              return message.includes(`[^${idx}]`)
                ? `[^${idx}]: [${item.DocumentTitle}${
                    _excerpt_page_number
                      ? `(${_excerpt_page_number} ページ)`
                      : ''
                  }](
                  ${item.DocumentURI ? cleanEncode(item.DocumentURI) : ''}${
                    _excerpt_page_number ? `#page=${_excerpt_page_number}` : ''
                  })`
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
