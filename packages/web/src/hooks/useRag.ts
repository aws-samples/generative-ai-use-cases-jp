import { create } from 'zustand';
import useRagApi from './useRagApi';
import { QueryResultItem } from '@aws-sdk/client-kendra';
import { produce } from 'immer';

const useRagState = create<{
  loading: boolean;
  query: string;
  setQuery: (query: string) => void;
  resultItems: QueryResultItem[];
  search: () => Promise<void>;
}>((set, get) => {
  const api = useRagApi();

  const search = async () => {
    if (get().query === '') {
      return;
    }

    set(() => ({
      loading: true,
      resultItems: [],
    }));

    const res = await api.query(get().query).finally(() => {
      set(() => ({
        loading: false,
      }));
    });
    set((state) => ({
      resultItems: produce(state.resultItems, (draft) => {
        draft.push(...(res.data.ResultItems ?? []));
      }),
    }));
  };

  return {
    loading: false,
    query: '',
    setQuery: (query: string) => {
      set(() => ({
        query,
      }));
    },
    resultItems: [],
    search,
  };
});

const useRag = () => {
  const { loading, query, setQuery, resultItems, search } = useRagState();
  return {
    loading,
    query,
    setQuery,
    resultItems,
    search: async () => {
      search();
    },
  };
};
export default useRag;
