import { Handler, Context, APIGatewayProxyEvent } from 'aws-lambda';
import * as crypto from 'crypto';
import { getAssistant } from './repository/assistant';
import {
  createAssistantChat,
  createAssistantMessage,
  findChatById,
  updateChatUpdatedDate,
} from './repository/chat';
import {
  AssistantMessageSource,
  Model,
  UnrecordedMessage,
} from 'generative-ai-use-cases';
import { similaritySearch } from './repository/assistantSearch';
import { streamingChunk } from './utils/streamingChunk';
import { canAccessAssistant } from './utils/assistantAccessControl';
import api from './utils/api';
import { modelMetadata } from '@generative-ai-use-cases/common';

// Request type for streaming assistant messages
interface AssistantMessageStreamRequest {
  assistantId: string;
  content: string;
  chatId?: string;
  idToken: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace awslambda {
    function streamifyResponse(
      f: (
        event: AssistantMessageStreamRequest,
        responseStream: NodeJS.WritableStream,
        context: Context
      ) => Promise<void>
    ): Handler;
  }
}

export const handler = awslambda.streamifyResponse(
  async (
    event: AssistantMessageStreamRequest,
    responseStream: NodeJS.WritableStream,
    context: Context
  ) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const { assistantId, content, chatId: inputChatId, idToken } = event;

    // Extract userId from idToken
    const tokenPayload = JSON.parse(
      Buffer.from(idToken.split('.')[1], 'base64').toString()
    );
    const userId = tokenPayload['cognito:username'];

    try {
      // Get or create chatId
      let chatId = inputChatId;
      const isNewConversation = !chatId;
      if (!chatId) {
        chatId = crypto.randomUUID();
      }
      const cleanChatId = chatId.replace('chat#', '');

      // Note: custom:tenant_id (with underscore) is the correct claim name
      const tenantId =
        tokenPayload['custom:tenant_id'] ||
        tokenPayload['custom:tenantId'] ||
        '';

      // Create request context for repository functions
      // Repository functions expect APIGatewayProxyEvent format for auth context extraction
      const requestContext = {
        body: null,
        headers: {
          Authorization: idToken,
        },
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        resource: '',
        requestContext: {
          accountId: '',
          apiId: '',
          authorizer: {
            claims: {
              'cognito:username': userId,
              'custom:tenant_id': tenantId,
            },
          },
          protocol: 'HTTP/1.1',
          httpMethod: 'POST',
          identity: {
            accessKey: null,
            accountId: null,
            apiKey: null,
            apiKeyId: null,
            caller: null,
            clientCert: null,
            cognitoAuthenticationProvider: null,
            cognitoAuthenticationType: null,
            cognitoIdentityId: null,
            cognitoIdentityPoolId: null,
            principalOrgId: null,
            sourceIp: '',
            user: null,
            userAgent: null,
            userArn: null,
          },
          path: '',
          stage: '',
          requestId: '',
          requestTimeEpoch: 0,
          resourceId: '',
          resourcePath: '',
        },
      } satisfies APIGatewayProxyEvent;

      const assistant = await getAssistant(assistantId, requestContext);

      if (!assistant) {
        responseStream.write(
          streamingChunk({
            text: 'Assistant not found',
            stopReason: 'error',
          })
        );
        responseStream.end();
        return;
      }

      // Check access: owner OR (public AND same tenant)
      if (!canAccessAssistant(assistant, userId, requestContext)) {
        responseStream.write(
          streamingChunk({
            text: 'Access denied to this assistant',
            stopReason: 'error',
          })
        );
        responseStream.end();
        return;
      }

      if (!assistant.modelId) {
        responseStream.write(
          streamingChunk({
            text: 'Assistant has no model configured',
            stopReason: 'error',
          })
        );
        responseStream.end();
        return;
      }

      // Check sync status for RAG-enabled assistants
      if (
        assistant.ragEnabled &&
        (assistant.syncStatus === 'QUEUED' || assistant.syncStatus === 'SYNCING')
      ) {
        responseStream.write(
          streamingChunk({
            text: 'Assistant is currently indexing documents. Please wait until indexing completes.',
            stopReason: 'error',
          })
        );
        responseStream.end();
        return;
      }

      if (!assistant.instruction) {
        responseStream.write(
          streamingChunk({
            text: 'Assistant has no system prompt configured',
            stopReason: 'error',
          })
        );
        responseStream.end();
        return;
      }

      // Store user message before streaming
      await createAssistantMessage(
        cleanChatId,
        userId,
        'user',
        content,
        undefined,
        undefined,
        requestContext
      );

      // Create chat history entry for new conversations
      if (isNewConversation) {
        await createAssistantChat(
          userId,
          assistantId,
          cleanChatId,
          assistant.name,
          requestContext
        );
      }

      // Send chatId to frontend early
      responseStream.write(
        streamingChunk({
          text: '',
          sessionId: cleanChatId,
        })
      );

      // RAG context retrieval
      let ragContext = '';
      let sources: AssistantMessageSource[] = [];

      const hasKnowledgeSources =
        assistant.knowledgeSources && assistant.knowledgeSources.length > 0;
      const hasLegacyS3Urls = assistant.s3Urls && assistant.s3Urls.length > 0;

      if (assistant.ragEnabled && (hasKnowledgeSources || hasLegacyS3Urls)) {
        try {
          const relevantDocs = await similaritySearch(
            assistantId.replace('assistant#', ''),
            content,
            requestContext,
            5
          );

          ragContext = relevantDocs
            .map((doc, idx) => `[Source ${idx + 1}]\n${doc.pageContent}`)
            .join('\n\n');

          sources = relevantDocs.map((doc) => {
            const sourceId = doc.metadata.sourceId || '';
            const sourceType = doc.metadata.sourceType || 'file';

            const source: AssistantMessageSource = {
              sourceId,
              sourceType,
              content: doc.pageContent,
              contentType: doc.metadata.contentType || 'text/plain',
              excerpt: doc.pageContent.substring(0, 200),
            };

            if (sourceType === 'web' && doc.metadata.sourceUrl) {
              source.sourceUrl = doc.metadata.sourceUrl;
            } else if (sourceType === 'file' && doc.metadata.storageKey) {
              source.storageKey = doc.metadata.storageKey;
            }

            if (doc.metadata.s3Url) {
              source.s3Url = doc.metadata.s3Url;
            }

            return source;
          });
        } catch {
          // RAG retrieval failed, continue without context
        }
      }

      const systemMessage = ragContext
        ? `${assistant.instruction}\n\nRelevant context from documents:\n${ragContext}`
        : assistant.instruction;

      // Determine model type:
      // - If modelId exists in modelMetadata → bedrock
      // - If modelId starts with 'openai:' → liteLlm (strip prefix, use LiteLLM proxy which has API keys)
      // - Otherwise → liteLlm
      const isOpenAiPrefixed = assistant.modelId.startsWith('openai:');
      const modelType: 'bedrock' | 'liteLlm' = modelMetadata[assistant.modelId]
        ? 'bedrock'
        : 'liteLlm';

      // For openai: prefixed models, strip the prefix since LiteLLM config uses bare model names
      const effectiveModelId = isOpenAiPrefixed
        ? assistant.modelId.replace('openai:', '')
        : assistant.modelId;

      const model: Model = {
        modelId: effectiveModelId,
        type: modelType,
        ...(modelType === 'bedrock' && {
          region: process.env.MODEL_REGION || 'us-east-1',
        }),
      };

      // Prepare messages for LLM
      const messages: UnrecordedMessage[] = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: content },
      ];

      // Accumulate response for storage
      let fullResponse = '';

      // Stream response using appropriate API based on model type
      const streamApi = modelType === 'bedrock' ? api.bedrock : api.liteLlm;
      for await (const token of streamApi.invokeStream?.(
        model,
        messages,
        `/assistant/${assistantId}`
      ) ?? []) {
        responseStream.write(token);

        // Parse token to accumulate text
        try {
          const parsed = JSON.parse(token.trim());
          if (parsed.text) {
            fullResponse += parsed.text;
          }
        } catch {
          // Ignore parse errors for partial chunks
        }
      }

      // Store assistant message after streaming completes
      await createAssistantMessage(
        cleanChatId,
        userId,
        'assistant',
        fullResponse,
        sources,
        undefined,
        requestContext
      );

      // Update chat updatedDate
      const chatRecord = await findChatById(userId, cleanChatId, requestContext);
      if (chatRecord) {
        await updateChatUpdatedDate(
          chatRecord.id,
          chatRecord.createdDate,
          requestContext
        );
      }

      responseStream.end();
    } catch {
      responseStream.write(
        streamingChunk({
          text: 'An error occurred during streaming',
          stopReason: 'error',
        })
      );
      responseStream.end();
    }
  }
);
