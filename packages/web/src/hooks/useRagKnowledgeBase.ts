import { useMemo } from 'react';
import useChat from './useChat';
import useRagKnowledgeBaseApi from './useRagKnowledgeBaseApi';
import { getPrompter } from '../prompts';
import { RetrieveResultItem } from '@aws-sdk/client-kendra';
import { ShownMessage } from 'generative-ai-use-cases-jp';

// s3://<BUCKET>/<PREFIX> から https://s3.<REGION>.amazonaws.com/<BUCKET>/<PREFIX> に変換する
const convertS3UriToUrl = (s3Uri: string, region: string): string => {
  const result = /^s3:\/\/(?<bucketName>.+?)\/(?<prefix>.+)/.exec(s3Uri);

  if (!result) {
    return '';
  }

  const groups = result?.groups as {
    bucketName: string;
    prefix: string;
  };

  return `https://s3.${region}.amazonaws.com/${groups.bucketName}/${groups.prefix}`;
};

const useRagKnowledgeBase = (id: string) => {
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
  const { retrieve } = useRagKnowledgeBaseApi();
  const prompter = useMemo(() => {
    return getPrompter(modelId);
  }, [modelId]);

  return {
    isEmpty,
    loading,
    setLoading,
    messages,
    postChat,
    clear,
    postMessage: async (content: string) => {
      setLoading(true);

      const modelRegion = import.meta.env.VITE_APP_MODEL_REGION!;

      pushMessage('user', content);
      pushMessage(
        'assistant',
        'Knowledge base から参考ドキュメントを取得中...'
      );

      let retrievedItems = null;

      try {
        retrievedItems = await retrieve(content);
      } catch (e) {
        console.error(e);
        popMessage();
        pushMessage(
          'assistant',
          `Retrieve 時にエラーになりました。次の対応を検討してください。
- cdk.json で指定した embeddingModelId のモデルが Amazon Bedrock (${modelRegion}) で有効になっているか確認`
        );
        setLoading(false);
        return;
      }

      if (
        !retrievedItems ||
        !retrievedItems.data.retrievalResults ||
        retrievedItems.data.retrievalResults.length === 0
      ) {
        popMessage();
        pushMessage(
          'assistant',
          `参考ドキュメントが見つかりませんでした。次の対応を検討してください。
- Bedrock Knowledge bases の data source に対象のドキュメントが追加されているか確認する
- Bedrock Knowledge bases の data source が sync されているか確認する
- 入力の表現を変更する`
        );
        setLoading(false);
        return;
      }

      // Prompt を使いまわすために Amazon Kendra の retrieve item と同じ形式にする
      // Knowledge Base のみを利用する場合は本来不要な処理
      const retrievedItemsKendraFormat: RetrieveResultItem[] =
        retrievedItems.data.retrievalResults!.map((r, idx) => {
          const docFile = (r.location?.s3Location?.uri ?? '').split('/').pop();

          return {
            Content: r.content?.text ?? '',
            DocumentId: `${idx}`,
            DocumentTitle: docFile,
            DocumentURI: convertS3UriToUrl(
              r.location?.s3Location?.uri ?? '',
              modelRegion
            ),
          };
        });

      updateSystemContext(
        prompter.ragPrompt({
          promptType: 'SYSTEM_CONTEXT',
          referenceItems: retrievedItemsKendraFormat,
        })
      );

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
          const footnote = retrievedItemsKendraFormat
            .map((item, idx) => {
              const encodedURI = encodeURI(item.DocumentURI!)
                .replace(/\(/g, '\\(')
                .replace(/\)/g, '\\)');
              return message.includes(`[^${idx}]`)
                ? `[^${idx}]: [${item.DocumentTitle}](${encodedURI})`
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

export default useRagKnowledgeBase;
