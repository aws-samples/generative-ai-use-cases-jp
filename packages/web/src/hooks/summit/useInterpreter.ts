import useHttp from '../useHttp';
import useChatApi from '../useChatApi';
import {
  CreateLambdaFunctionRequest,
  InvokeLambdaFunctionRequest,
  UnrecordedMessage,
  UpdateLambdaFunctionRequest,
} from 'generative-ai-use-cases-jp';

const useInterpreter = () => {
  const http = useHttp();
  const { predict } = useChatApi();
  return {
    generateTestData: (messages: UnrecordedMessage[], prompt: string) => {
      return predict({
        messages: [
          ...messages,
          {
            role: 'user',
            content: prompt,
          },
        ],
        id: '',
      });
    },
    existsFunction: async (functionName: string) => {
      const res = await http.api.get<string>(
        `interpreter/lambda/arn/${functionName}`
      );
      return res.data !== '';
    },
    createFunction: (params: CreateLambdaFunctionRequest) => {
      return http.post<object, CreateLambdaFunctionRequest>(
        'interpreter/lambda',
        params
      );
    },
    updateFunction: (params: UpdateLambdaFunctionRequest) => {
      return http.put<object, UpdateLambdaFunctionRequest>(
        'interpreter/lambda',
        params
      );
    },
    invokeFunction: (params: InvokeLambdaFunctionRequest) => {
      return http.post('interpreter/lambda/invoke', params);
    },
  };
};

export default useInterpreter;
