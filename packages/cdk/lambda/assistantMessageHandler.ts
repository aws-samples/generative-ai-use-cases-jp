import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getAssistant } from './repository/assistant';
import { createMessage, listMessages } from './repository/assistantMessage';
import {
  CreateAssistantMessageRequest,
  AssistantMessage,
  AssistantMessageSource,
  ListAssistantMessagesResponse,
} from 'generative-ai-use-cases';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { similaritySearch } from './repository/assistantSearch';
import { canAccessAssistant } from './utils/assistantAccessControl';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.MODEL_REGION || process.env.AWS_REGION,
});

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

/**
 * Helper function to strip the "assistant#" prefix from assistantId in messages
 * Internal storage uses "assistant#<uuid>" format, but API returns clean UUID
 */
function stripAssistantPrefixFromMessage(
  message: AssistantMessage
): AssistantMessage {
  return {
    ...message,
    assistantId: message.assistantId.replace('assistant#', ''),
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
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Missing assistantId' }),
      };
    }

    // Route based on HTTP method
    switch (method) {
      case 'POST':
        return await handleCreateMessage(userId, assistantId, event);

      case 'GET':
        return await handleListMessages(userId, assistantId, event);

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ message: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('Error in assistant message handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
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
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Missing content' }),
    };
  }

  // Get assistant configuration
  const assistant = await getAssistant(assistantId, event);

  if (!assistant) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Assistant not found' }),
    };
  }

  // Check access: owner OR (public AND same tenant)
  if (!canAccessAssistant(assistant, userId, event)) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        message: 'Access denied to this assistant',
        code: 'ASSISTANT_ACCESS_DENIED'
      }),
    };
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

    return {
      statusCode: 409, // Conflict - resource not ready
      headers,
      body: JSON.stringify({
        message: `${statusMessage}. Please wait until indexing completes before chatting.`,
        syncStatus: assistant.syncStatus,
      }),
    };
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
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        message: 'Assistant has no system prompt configured',
      }),
    };
  }

  console.log(
    `Using assistant ${assistantId} with system prompt (${assistant.instruction.length} chars)`
  );

  // Store user message
  await createMessage(
    assistantId,
    userId,
    'user',
    body.content,
    undefined,
    undefined,
    event
  );

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

  // Call Bedrock with assistant configuration
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

  const assistantResponse =
    response.output?.message?.content?.[0]?.text || 'No response';

  const usage = {
    inputTokens: response.usage?.inputTokens || 0,
    outputTokens: response.usage?.outputTokens || 0,
    totalTokens: response.usage?.totalTokens || 0,
  };

  // Store assistant response with sources
  const assistantMessage = await createMessage(
    assistantId,
    userId,
    'assistant',
    assistantResponse,
    sources,
    { usage },
    event
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(stripAssistantPrefixFromMessage(assistantMessage)),
  };
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
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Assistant not found' }),
    };
  }

  // Check access: owner OR (public AND same tenant)
  if (!canAccessAssistant(assistant, userId, event)) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        message: 'Access denied to this assistant',
        code: 'ASSISTANT_ACCESS_DENIED'
      }),
    };
  }

  const exclusiveStartKey = event.queryStringParameters?.exclusiveStartKey;
  const limit = event.queryStringParameters?.limit
    ? parseInt(event.queryStringParameters.limit)
    : undefined;

  const result = await listMessages(assistantId, userId, event, exclusiveStartKey, limit);

  // Strip prefix from all messages
  const sanitizedResult: ListAssistantMessagesResponse = {
    ...result,
    messages: result.messages.map(stripAssistantPrefixFromMessage),
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(sanitizedResult),
  };
}
