import {
  PredictRequest,
  PredictResponse,
  CreateChatResponse,
  CreateMessagesRequest,
  CreateMessagesResponse,
} from 'generative-ai-use-cases-jp';
import {
  LambdaClient,
  InvokeWithResponseStreamCommand,
} from '@aws-sdk/client-lambda';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { Auth } from 'aws-amplify';
import useHttp from '../hooks/useHttp';

const usePredictor = () => {
  const http = useHttp();

  return {
    createChat: async (): Promise<CreateChatResponse> => {
      const res = await http.post('chats', {});
      return res.data;
    },
    createMessages: async (
      _chatId: string,
      req: CreateMessagesRequest
    ): Promise<CreateMessagesResponse> => {
      const chatId = _chatId.split('#')[1];
      const res = await http.post(`chats/${chatId}/messages`, req);
      return res.data;
    },
    listChats: () => {
      return http.get('chats');
    },
    listMessages: (chatId: string) => {
      return http.get(`chats/${chatId}/messages`);
    },
    // Buffered Response (useTextToJson で利用)
    predict: async (req: PredictRequest): Promise<PredictResponse> => {
      const res = await http.post('predict', req, { responseType: 'blob' });
      return await res.data.text();
    },
    // Streaming Response
    predictStream: async function* (req: PredictRequest) {
      const region = import.meta.env.VITE_APP_REGION;
      const userPoolId = import.meta.env.VITE_APP_USER_POOL_ID;
      const idPoolId = import.meta.env.VITE_APP_IDENTITY_POOL_ID;
      const cognito = new CognitoIdentityClient({ region });
      const providerName = `cognito-idp.${region}.amazonaws.com/${userPoolId}`;
      const lambda = new LambdaClient({
        region,
        credentials: fromCognitoIdentityPool({
          client: cognito,
          identityPoolId: idPoolId,
          logins: {
            [providerName]: (await Auth.currentSession())
              .getIdToken()
              .getJwtToken(),
          },
        }),
      });

      const res = await lambda.send(
        new InvokeWithResponseStreamCommand({
          FunctionName: import.meta.env.VITE_APP_PREDICT_STREAM_FUNCTION_ARN,
          Payload: JSON.stringify(req),
        })
      );
      const events = res.EventStream!;

      for await (const event of events) {
        if (event.PayloadChunk) {
          yield new TextDecoder('utf-8').decode(event.PayloadChunk.Payload);
        }

        if (event.InvokeComplete) {
          break;
        }
      }
    },
  };
};

export default usePredictor;
