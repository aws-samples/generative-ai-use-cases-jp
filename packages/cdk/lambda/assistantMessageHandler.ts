import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as crypto from 'crypto';
import { getAssistant } from './repository/assistant';
import {
  createAssistantChat,
  createAssistantMessage,
  findChatById,
  listAssistantMessages,
  updateChatUpdatedDate,
} from './repository/chat';
import {
  CreateAssistantMessageRequest,
  AssistantMessage,
  AssistantMessageSource,
  ListAssistantMessagesResponse,
  Model,
} from 'generative-ai-use-cases';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { similaritySearch } from './repository/assistantSearch';
import { canAccessAssistant } from './utils/assistantAccessControl';
import {
  badRequest400Response,
  conflict409Response,
  forbidden403Response,
  internalServerError500Response,
  methodNotAllowed405Response,
  notFound404Response,
  ok200Response,
} from './utils/apiResponse';
import api from './utils/api';
import { modelMetadata } from '@generative-ai-use-cases/common';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.MODEL_REGION || process.env.AWS_REGION,
});

/**
 * Helper function to add assistantId to messages for API response
 * Messages are stored without assistantId, but API expects it
 */
function addAssistantIdToMessage(
  message: AssistantMessage,
  assistantId: string
): AssistantMessage {
  return {
    ...message,
    assistantId,
  };
}

/**
 * Consolidated handler for assistant message operations
 * Routes based on HTTP method:
 * - POST /{assistantId}/messages → create message (with RAG)
 * - GET /{assistantId}/messages → list messages
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId: string =
      event.requestContext.authorizer!.claims['cognito:username'];
    const assistantId = event.pathParameters?.assistantId;
    const method = event.httpMethod;

    if (!assistantId) {
      return badRequest400Response({ message: 'Missing assistantId' });
    }

    // Route based on HTTP method
    switch (method) {
      case 'POST':
        return await handleCreateMessage(userId, assistantId, event);

      case 'GET':
        return await handleListMessages(userId, assistantId, event);

      default:
        return methodNotAllowed405Response({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in assistant message handler:', error);
    return internalServerError500Response({ message: 'Internal Server Error' });
  }
};

/**
 * Handle POST /{assistantId}/messages - Create message with RAG
 */
async function handleCreateMessage(
  userId: string,
  assistantId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body: CreateAssistantMessageRequest = JSON.parse(event.body || '{}');

  if (!body.content) {
    return badRequest400Response({ message: 'Missing content' });
  }

  // Get or create chatId for this conversation
  // Can come from query params or body, if not provided, create a new conversation
  const bodyChatId = (
    body as CreateAssistantMessageRequest & { chatId?: string }
  ).chatId;
  let chatId = event.queryStringParameters?.chatId || bodyChatId;
  const isNewConversation = !chatId;

  if (!chatId) {
    chatId = crypto.randomUUID();
  }

  // Remove chat# prefix if present to ensure consistent format
  const cleanChatId = chatId.replace('chat#', '');

  // Get assistant configuration
  const assistant = await getAssistant(assistantId, event);

  if (!assistant) {
    return notFound404Response({ message: 'Assistant not found' });
  }

  // Check access: owner OR (public AND same tenant)
  if (!canAccessAssistant(assistant, userId, event)) {
    return forbidden403Response({
      message: 'Access denied to this assistant',
      code: 'ASSISTANT_ACCESS_DENIED',
    });
  }

  // Block chat if RAG is enabled and documents are still being indexed
  // Allow chat with PARTIAL status (some documents indexed successfully)
  if (
    assistant.ragEnabled &&
    (assistant.syncStatus === 'QUEUED' || assistant.syncStatus === 'SYNCING')
  ) {
    const statusMessage =
      assistant.syncStatus === 'QUEUED'
        ? 'Assistant is queued for document indexing'
        : 'Assistant is currently indexing documents';

    console.log(
      `Chat blocked for assistant ${assistantId}: status is ${assistant.syncStatus}`
    );

    return conflict409Response({
      message: `${statusMessage}. Please wait until indexing completes before chatting.`,
      syncStatus: assistant.syncStatus,
    });
  }

  // Warn if RAG failed but allow chat (assistant can still work without RAG)
  if (assistant.ragEnabled && assistant.syncStatus === 'FAILED') {
    console.warn(
      `Assistant ${assistantId} has FAILED sync status but allowing chat without RAG`
    );
  }

  // Validate system prompt exists
  if (!assistant.instruction) {
    console.error(
      `Assistant ${assistantId} has no instruction/system prompt configured`
    );
    return badRequest400Response({
      message: 'Assistant has no system prompt configured',
    });
  }

  console.log(
    `Using assistant ${assistantId} with system prompt (${assistant.instruction.length} chars)`
  );

  // Store user message
  await createAssistantMessage(
    cleanChatId,
    userId,
    'user',
    body.content,
    undefined,
    undefined,
    event
  );

  // Create chat history entry only for new conversations
  // This ensures the assistant conversation appears in the unified chat history
  if (isNewConversation) {
    await createAssistantChat(
      userId,
      assistantId,
      cleanChatId,
      assistant.name,
      event
    );
  }

  // RAG context retrieval from OpenSearch when ragEnabled is true
  let ragContext = '';
  let sources: AssistantMessageSource[] = [];

  // Check if RAG is enabled and sources exist (new knowledgeSources or legacy s3Urls)
  const hasKnowledgeSources =
    assistant.knowledgeSources && assistant.knowledgeSources.length > 0;
  const hasLegacyS3Urls = assistant.s3Urls && assistant.s3Urls.length > 0;

  if (assistant.ragEnabled && (hasKnowledgeSources || hasLegacyS3Urls)) {
    try {
      // Query vector store for relevant context
      const relevantDocs = await similaritySearch(
        assistantId.replace('assistant#', ''),
        body.content,
        event,
        5 // top 5 most relevant documents
      );

      // Format context and extract sources
      ragContext = relevantDocs
        .map((doc, idx) => `[Source ${idx + 1}]\n${doc.pageContent}`)
        .join('\n\n');

      sources = relevantDocs.map((doc) => {
        const sourceId = doc.metadata.sourceId || '';
        const sourceType = doc.metadata.sourceType || 'file';

        // Build the source object based on available metadata
        const source: AssistantMessageSource = {
          sourceId,
          sourceType,
          content: doc.pageContent,
          contentType: doc.metadata.contentType || 'text/plain',
          excerpt: doc.pageContent.substring(0, 200),
        };

        // Add type-specific fields
        if (sourceType === 'web' && doc.metadata.sourceUrl) {
          source.sourceUrl = doc.metadata.sourceUrl;
        } else if (sourceType === 'file' && doc.metadata.storageKey) {
          source.storageKey = doc.metadata.storageKey;
        }

        // Keep legacy s3Url for backward compatibility
        if (doc.metadata.s3Url) {
          source.s3Url = doc.metadata.s3Url;
        }

        return source;
      });
    } catch (error) {
      console.error('RAG retrieval error:', error);
      // Continue without RAG if it fails
    }
  }

  // Include RAG context in system message if available
  if (ragContext) {
    console.log(
      `Enhancing system prompt with RAG context from ${sources.length} document chunks`
    );
  } else {
    console.log('Using system prompt without RAG context');
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

  console.log(
    `Using ${modelType} model: ${effectiveModelId} (original: ${assistant.modelId}) for assistant chat`
  );

  // Call LLM with assistant configuration
  let assistantResponse = '';
  let usage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };

  if (modelType === 'bedrock') {
    // Use Bedrock API
    const response = await bedrockClient.send(
      new ConverseCommand({
        modelId: assistant.modelId,
        messages: [
          {
            role: 'user',
            content: [
              {
                text: body.content,
              },
            ],
          },
        ],
        system: [
          {
            text: systemMessage,
          },
        ],
      })
    );

    assistantResponse =
      response.output?.message?.content?.[0]?.text || 'No response';

    usage = {
      inputTokens: response.usage?.inputTokens || 0,
      outputTokens: response.usage?.outputTokens || 0,
      totalTokens: response.usage?.totalTokens || 0,
    };
  } else {
    // Use LiteLLM or LangChain API
    const messages = [
      {
        role: 'system' as const,
        content: systemMessage,
      },
      {
        role: 'user' as const,
        content: body.content,
      },
    ];

    // Route to LiteLLM API (handles both native LiteLLM models and openai: prefixed models)
    assistantResponse = await api.liteLlm.invoke(model, messages, cleanChatId);

    // LiteLLM/LangChain don't provide detailed usage stats in non-streaming mode
    // Set basic usage info
    usage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };
  }

  // Store assistant response with sources
  const assistantMessage = await createAssistantMessage(
    cleanChatId,
    userId,
    'assistant',
    assistantResponse,
    sources,
    { usage },
    event
  );

  // Update the chat's updatedDate to reflect the latest activity
  const chatRecord = await findChatById(userId, cleanChatId, event);
  if (chatRecord) {
    await updateChatUpdatedDate(chatRecord.id, chatRecord.createdDate, event);
  }

  return ok200Response({
    ...addAssistantIdToMessage(assistantMessage, assistantId),
    chatId: cleanChatId, // Return chatId to frontend for routing
  });
}

/**
 * Handle GET /{assistantId}/messages - List messages
 */
async function handleListMessages(
  userId: string,
  assistantId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  // Get assistant and verify access
  const assistant = await getAssistant(assistantId, event);

  if (!assistant) {
    return notFound404Response({ message: 'Assistant not found' });
  }

  // Check access: owner OR (public AND same tenant)
  if (!canAccessAssistant(assistant, userId, event)) {
    return forbidden403Response({
      message: 'Access denied to this assistant',
      code: 'ASSISTANT_ACCESS_DENIED',
    });
  }

  const chatId = event.queryStringParameters?.chatId;

  // TODO: 将来的には統合チャット履歴のメッセージ取得に置き換える予定
  if (!chatId) {
    return badRequest400Response({ message: 'Missing chatId parameter' });
  }

  const exclusiveStartKey = event.queryStringParameters?.exclusiveStartKey;
  const limit = event.queryStringParameters?.limit
    ? parseInt(event.queryStringParameters.limit)
    : undefined;

  const result = await listAssistantMessages(
    userId,
    chatId,
    event,
    exclusiveStartKey,
    limit
  );

  // Add assistantId to all messages for API response
  const sanitizedResult: ListAssistantMessagesResponse = {
    ...result,
    messages: result.messages.map((msg) =>
      addAssistantIdToMessage(msg, assistantId)
    ),
  };

  return ok200Response(sanitizedResult);
}
