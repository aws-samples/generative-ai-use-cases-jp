/**
 * Assistant message operations handler
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ContentBlock,
  Message,
} from '@aws-sdk/client-bedrock-runtime';
import {
  CreateAssistantMessageRequest,
  ListAssistantMessagesQueryParams,
  Assistant,
  AssistantMessage,
  AssistantMessageSource,
} from 'generative-ai-use-cases';
import { getTenantId, getUsername } from '../utils/tenantUtils';
import { errorResponse, successResponse } from '../utils/apiResponse';
import * as assistantRepo from '../repository/assistant';
import * as messageRepo from '../repository/assistantMessage';
import * as searchRepo from '../repository/assistantSearch';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Generate AI response using Bedrock
 */
async function generateResponse(
  assistant: Assistant,
  conversationHistory: AssistantMessage[],
  ragContext?: AssistantMessageSource[]
): Promise<{
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}> {
  // Build conversation messages for Bedrock
  // Note: conversationHistory already includes the latest user message
  const messages: Message[] = conversationHistory.map((msg) => ({
    role: msg.role,
    content: [{ text: msg.content } as ContentBlock],
  }));

  // Build system prompt with RAG context
  let systemPrompt = assistant.instruction;

  if (ragContext && ragContext.length > 0) {
    const contextText = ragContext
      .map((source, idx) => {
        return `[${idx + 1}] ${source.name}${source.url ? ` (${source.url})` : ''}\n${source.excerpt}`;
      })
      .join('\n\n');

    systemPrompt += `\n\nRelevant context from knowledge base:\n\n${contextText}\n\nPlease use this context to answer the user's question when relevant. Cite sources by their number [1], [2], etc.`;
  }

  // Invoke Bedrock Converse API
  const command = new ConverseCommand({
    modelId: assistant.modelId,
    messages: messages,
    system: [{ text: systemPrompt }],
    inferenceConfig: {
      maxTokens: 2048,
      temperature: 0.7,
    },
  });

  const response = await bedrockClient.send(command);

  // Extract response text
  const outputContent = response.output?.message?.content?.[0];
  const content =
    outputContent && 'text' in outputContent ? outputContent.text || '' : '';

  // Extract usage metrics
  const usage = {
    inputTokens: response.usage?.inputTokens || 0,
    outputTokens: response.usage?.outputTokens || 0,
    totalTokens: response.usage?.totalTokens || 0,
  };

  return { content, usage };
}

/**
 * Create message
 */
async function createMessage(
  tenantId: string,
  username: string,
  assistantId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const request: CreateAssistantMessageRequest = JSON.parse(
      event.body || '{}'
    );

    if (!request.content) {
      return errorResponse(400, 'Missing message content');
    }

    // Verify assistant exists and user has access
    const assistant = await assistantRepo.findAssistantById(
      username,
      assistantId,
      event
    );

    if (!assistant) {
      return errorResponse(404, 'Assistant not found');
    }

    // Create user message
    const userMessage = await messageRepo.createAssistantMessage(
      username,
      assistantId,
      'user',
      request.content,
      event
    );

    // Get conversation history
    const history = await messageRepo.getConversationHistory(
      username,
      assistantId,
      event,
      10
    );

    // Search knowledge base if RAG enabled
    let ragContext: AssistantMessageSource[] | undefined;
    if (assistant.ragEnabled) {
      try {
        ragContext = await searchRepo.searchKnowledgeBase(
          assistantId,
          tenantId,
          request.content,
          5
        );
      } catch (error) {
        console.error('Error searching knowledge base:', error);
        // Continue without RAG if search fails
      }
    }

    // Generate AI response
    const { content, usage } = await generateResponse(
      assistant,
      history,
      ragContext
    );

    // Create assistant message
    const assistantMessage = await messageRepo.createAssistantMessage(
      username,
      assistantId,
      'assistant',
      content,
      event,
      ragContext,
      { usage }
    );

    return successResponse(201, assistantMessage);
  } catch (error) {
    console.error('Error creating message:', error);
    return errorResponse(500, 'Failed to create message');
  }
}

/**
 * List messages
 */
async function listMessages(
  username: string,
  assistantId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Verify assistant exists and user has access
    const assistant = await assistantRepo.findAssistantById(
      username,
      assistantId,
      event
    );

    if (!assistant) {
      return errorResponse(404, 'Assistant not found');
    }

    const params: ListAssistantMessagesQueryParams = {
      limit: event.queryStringParameters?.limit
        ? parseInt(event.queryStringParameters.limit, 10)
        : undefined,
      nextToken: event.queryStringParameters?.nextToken,
    };

    const response = await messageRepo.listAssistantMessages(
      username,
      assistantId,
      event,
      params.limit,
      params.nextToken
    );

    return successResponse(200, response);
  } catch (error) {
    console.error('Error listing messages:', error);
    return errorResponse(500, 'Failed to list messages');
  }
}

/**
 * Main handler
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Assistant message handler invoked', {
    method: event.httpMethod,
    path: event.path,
    pathParameters: event.pathParameters,
  });

  try {
    // Extract tenant context
    const tenantId = getTenantId(event);
    const username = getUsername(event);

    // Extract assistant ID
    const assistantId = event.pathParameters?.assistantId;
    if (!assistantId) {
      return errorResponse(400, 'Missing assistantId parameter');
    }

    // Route based on HTTP method
    const method = event.httpMethod;

    if (method === 'POST') {
      return await createMessage(tenantId, username, assistantId, event);
    } else if (method === 'GET') {
      return await listMessages(username, assistantId, event);
    }

    return errorResponse(404, 'Not found');
  } catch (error) {
    console.error('Error in assistant message handler:', error);
    return errorResponse(500, 'Internal server error');
  }
};
