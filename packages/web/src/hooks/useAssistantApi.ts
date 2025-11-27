import { useMemo } from 'react';
import {
  Assistant,
  AssistantMessage,
  CreateAssistantRequest,
  CreateAssistantMessageRequest,
  ListAssistantsQueryParams,
  ListAssistantsResponse,
  ListAssistantMessagesQueryParams,
  ListAssistantMessagesResponse,
  RequestUploadUrlRequest,
  RequestUploadUrlResponse,
  UpdateAssistantRequest,
} from 'generative-ai-use-cases';
import useHttp from './useHttp';
import {
  LambdaClient,
  InvokeWithResponseStreamCommand,
} from '@aws-sdk/client-lambda';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Build query string from parameters
 */
function buildQueryString(params?: {
  limit?: number;
  nextToken?: string;
  chatId?: string;
}): string {
  if (!params) return '';

  const queryParams = new URLSearchParams();
  if (params.limit) {
    queryParams.append('limit', params.limit.toString());
  }
  if (params.nextToken) {
    queryParams.append('nextToken', params.nextToken);
  }
  if (params.chatId) {
    queryParams.append('chatId', params.chatId);
  }
  return queryParams.toString();
}

const useAssistantApi = () => {
  const http = useHttp();

  return {
    /**
     * SWR版 listAssistants - キャッシュ付きでアシスタント一覧を取得
     * サイドバーなど、ページ遷移時にキャッシュを活用したい場合に使用
     */
    listAssistantsSWR: (limit: number = 100) => {
      const getKey = (
        pageIndex: number,
        previousPageData: ListAssistantsResponse
      ) => {
        if (previousPageData && !previousPageData.nextToken) return null;
        if (pageIndex === 0) return `assistant?limit=${limit}`;
        return `assistant?limit=${limit}&nextToken=${previousPageData.nextToken}`;
      };
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return http.getPagination<ListAssistantsResponse>(getKey, {
        revalidateIfStale: false,
      });
    },

    ...useMemo(
      () => ({
        listAssistants: async (
          params?: ListAssistantsQueryParams,
          signal?: AbortSignal
        ): Promise<ListAssistantsResponse> => {
          const queryString = buildQueryString(params);
          const url = queryString ? `assistant?${queryString}` : 'assistant';
          const res = await http.api.get<ListAssistantsResponse>(url, {
            signal,
          });
          return res.data;
        },

        getAssistant: async (assistantId: string): Promise<Assistant> => {
          const res = await http.api.get<Assistant>(`assistant/${assistantId}`);
          return res.data;
        },

        createAssistant: async (
          request: CreateAssistantRequest
        ): Promise<Assistant> => {
          const res = await http.post<Assistant, CreateAssistantRequest>(
            'assistant',
            request
          );
          return res.data;
        },

        updateAssistant: async (
          assistantId: string,
          request: UpdateAssistantRequest
        ): Promise<Assistant> => {
          const res = await http.put<Assistant, UpdateAssistantRequest>(
            `assistant/${assistantId}`,
            request
          );
          return res.data;
        },

        deleteAssistant: async (assistantId: string): Promise<void> => {
          await http.delete<void>(`assistant/${assistantId}`);
        },

        updateAssistantVisibility: async (
          assistantId: string,
          visibility: 'private' | 'public'
        ): Promise<Assistant> => {
          const res = await http.put<
            Assistant,
            { visibility: 'private' | 'public' }
          >(`assistant/${assistantId}`, { visibility });
          return res.data;
        },

        listMessages: async (
          assistantId: string,
          params?: ListAssistantMessagesQueryParams & { chatId?: string }
        ): Promise<ListAssistantMessagesResponse> => {
          const queryString = buildQueryString(params);
          const url = queryString
            ? `assistant/${assistantId}/messages?${queryString}`
            : `assistant/${assistantId}/messages`;
          const res = await http.api.get<ListAssistantMessagesResponse>(url);
          return res.data;
        },

        createMessage: async (
          assistantId: string,
          request: CreateAssistantMessageRequest & { chatId?: string }
        ): Promise<AssistantMessage> => {
          // Extract chatId from request if present and add to query params
          const { chatId, ...messageRequest } = request;
          const url = chatId
            ? `assistant/${assistantId}/messages?chatId=${encodeURIComponent(chatId)}`
            : `assistant/${assistantId}/messages`;
          const res = await http.post<
            AssistantMessage,
            CreateAssistantMessageRequest
          >(url, messageRequest);
          return res.data;
        },

        // Streaming message creation
        streamMessage: async function* (
          assistantId: string,
          request: CreateAssistantMessageRequest & {
            chatId?: string;
            customInstructions?: string;
          }
        ) {
          const token = (await fetchAuthSession()).tokens?.idToken?.toString();
          if (!token) {
            throw new Error('Not authenticated');
          }

          const functionArn = import.meta.env
            .VITE_APP_ASSISTANT_MESSAGE_STREAM_FUNCTION_ARN;

          if (!functionArn) {
            throw new Error(
              'VITE_APP_ASSISTANT_MESSAGE_STREAM_FUNCTION_ARN is not configured'
            );
          }

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
                [providerName]: token,
              },
            }),
          });

          const res = await lambda.send(
            new InvokeWithResponseStreamCommand({
              FunctionName: functionArn,
              Payload: JSON.stringify({
                assistantId,
                content: request.content,
                chatId: request.chatId,
                idToken: token,
                customInstructions: request.customInstructions,
              }),
            })
          );

          const events = res.EventStream!;

          for await (const event of events) {
            if (event.PayloadChunk) {
              const chunk = new TextDecoder('utf-8').decode(
                event.PayloadChunk.Payload
              );
              yield chunk;
            }

            if (event.InvokeComplete) {
              break;
            }
          }
        },

        requestUploadUrl: async (
          request: RequestUploadUrlRequest
        ): Promise<RequestUploadUrlResponse> => {
          const res = await http.post<
            RequestUploadUrlResponse,
            RequestUploadUrlRequest
          >('assistant/upload-url', request);
          return res.data;
        },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [] // http.api is stable - created once at module level in useHttp.ts
    ),
  };
};

export default useAssistantApi;
