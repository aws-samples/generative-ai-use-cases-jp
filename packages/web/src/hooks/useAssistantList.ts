import { produce } from 'immer';
import useAssistantApi from './useAssistantApi';
import { Assistant } from 'generative-ai-use-cases';

const useAssistantList = (limit: number = 100) => {
  const { listAssistantsSWR, deleteAssistant: deleteAssistantApi } =
    useAssistantApi();
  const { data, mutate, size, setSize, error, isValidating } =
    listAssistantsSWR(limit);

  // フラット化: assistants プロパティを使用
  const assistants: Assistant[] = data
    ? data.flatMap((page) => page.assistants ?? [])
    : [];

  const isLoading = !data && !error;
  const isEmpty = data?.[0]?.assistants?.length === 0;
  const isReachingEnd = isEmpty || (data && !data[data.length - 1]?.nextToken);
  const canLoadMore = !isReachingEnd;

  const deleteAssistant = async (assistantId: string) => {
    // 楽観的更新
    mutate(
      produce(data, (draft) => {
        if (draft) {
          for (const page of draft) {
            const idx = page.assistants.findIndex(
              (a) => a.assistantId === assistantId
            );
            if (idx > -1) {
              page.assistants.splice(idx, 1);
              break;
            }
          }
        }
      }),
      { revalidate: false }
    );

    return deleteAssistantApi(assistantId).finally(() => {
      mutate();
    });
  };

  return {
    loading: isLoading,
    assistants,
    mutate,
    deleteAssistant,
    canLoadMore,
    loadMore: () => setSize(size + 1),
    isValidating,
  };
};

export default useAssistantList;
