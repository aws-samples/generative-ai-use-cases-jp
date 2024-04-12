import useSystemContextApi from './useSystemContextApi';

const useSystemContext = () => {
  const { listSystemContexts } = useSystemContextApi();
  const { data, isLoading } = listSystemContexts();

  return {
    systemContexts: data ?? [],
    isLoading,
  };
};

export default useSystemContext;
