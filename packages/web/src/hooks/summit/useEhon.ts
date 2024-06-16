import useHttp from '../useHttp';

const useEhon = () => {
  const http = useHttp();
  return {
    ehonRequest: async (path: string, params: {input: string, stateMachineArn: string}) => {
      const res = await http.api.post(path, params)
      return res
    },
    isExistRequest: async (path: string) => {
      const res = await http.api.get(path)
      return res
    },

  };
};

export default useEhon;
