import useHttp from './useHttp';

type PrefixesResponse = {
  prefixes: string[];
};

export const useKnowledgeBasePrefixes = () => {
  const http = useHttp();
  const { data, error } = http.get<PrefixesResponse>(
    '/rag-knowledge-base/prefixes'
  );

  return {
    prefixes: data?.prefixes ?? [], // データがない場合は空配列を返す
    loading: !error && !data, // データ取得中の状態
    error: error, // エラーがあれば返す
  };
};
