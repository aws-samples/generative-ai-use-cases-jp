import useHttp from '../useHttp';
import { useState } from 'react';

type ResponseType = {
  summary?: string[],
  scenes?: { S: string }[],
  s3_presigned_urls?: string[],
}

const useEhon = () => {
  const http = useHttp();
  const [response, setResponse] = useState<ResponseType>()
  return {
    ehonRequest: async (path: string, params: {input: string, stateMachineArn: string}) => {
      const res = await http.api.post(path, params)
      return res
    },
    usePolling: async (path: string | null, interval: number) => {
      return http.get(
        path,
        {
          refreshInterval: interval,
          onSuccess: (data) => {
            setResponse(data);
          },
        })
    },
    response
  };
};

export default useEhon;
