import { PredictContent } from '../@types/predict';
import useHttp from '../hooks/useHttp';

const usePredictor = () => {
  const http = useHttp();

  return {
    predict: async (contents: PredictContent[]): Promise<PredictContent> => {
      const res = await http.post(`predict`, {
        messages: contents,
      });

      return {
        role: 'assistant',
        content: res.data['response'],
      };
    },
  };
};

export default usePredictor;
