import useSystemContextApi from './useSystemContextApi';

const useSystemContext = () => {
  const { listSystemContexts } = useSystemContextApi();
  const { data } = listSystemContexts();

  return {
    systemContexts: data ?? [],
  };
};

export default useSystemContext;
