/**
 * Assistant CRUD operations handler
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  CreateAssistantRequest,
  UpdateAssistantRequest,
  ListAssistantsQueryParams,
} from 'generative-ai-use-cases';
import { getTenantId, getUsername } from '../utils/tenantUtils';
import { errorResponse, successResponse } from '../utils/apiResponse';
import * as assistantRepo from '../repository/assistant';
import * as searchRepo from '../repository/assistantSearch';
import * as messageRepo from '../repository/assistantMessage';

/**
 * Create assistant
 */
async function createAssistant(
  tenantId: string,
  username: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const request: CreateAssistantRequest = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!request.name || !request.instruction || !request.modelId) {
      return errorResponse(400, 'Missing required fields');
    }

    const assistant = await assistantRepo.createAssistant(
      username,
      request,
      event
    );

    // If RAG enabled, trigger indexing asynchronously
    if (
      assistant.ragEnabled &&
      (assistant.knowledgeSources.length > 0 || assistant.s3Urls.length > 0)
    ) {
      // Update sync status to RUNNING before indexing
      assistantRepo
        .updateAssistantSyncStatus(
          username,
          assistant.assistantId,
          'RUNNING',
          'Indexing knowledge sources',
          event
        )
        .catch((err: Error) =>
          console.error('Failed to update sync status to RUNNING:', err)
        );

      // Trigger indexing and update status based on result
      searchRepo
        .indexKnowledgeSources(
          assistant.assistantId,
          tenantId,
          assistant.knowledgeSources,
          assistant.s3Urls
        )
        .then(() => {
          return assistantRepo.updateAssistantSyncStatus(
            username,
            assistant.assistantId,
            'SYNCED',
            'Knowledge sources indexed successfully',
            event
          );
        })
        .catch((err: Error) => {
          console.error('Indexing error:', err);
          return assistantRepo
            .updateAssistantSyncStatus(
              username,
              assistant.assistantId,
              'FAILED',
              err.message,
              event
            )
            .catch((statusErr: Error) =>
              console.error('Failed to update sync status to FAILED:', statusErr)
            );
        });
    }

    return successResponse(201, assistant);
  } catch (error) {
    console.error('Error creating assistant:', error);
    return errorResponse(500, 'Failed to create assistant');
  }
}

/**
 * List assistants
 */
async function listAssistants(
  username: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const params: ListAssistantsQueryParams = {
      limit: event.queryStringParameters?.limit
        ? parseInt(event.queryStringParameters.limit, 10)
        : undefined,
      nextToken: event.queryStringParameters?.nextToken,
    };

    const response = await assistantRepo.listAssistants(
      username,
      event,
      params.limit,
      params.nextToken
    );

    return successResponse(200, response);
  } catch (error) {
    console.error('Error listing assistants:', error);
    return errorResponse(500, 'Failed to list assistants');
  }
}

/**
 * Get assistant
 */
async function getAssistant(
  username: string,
  assistantId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const assistant = await assistantRepo.findAssistantById(
      username,
      assistantId,
      event
    );

    if (!assistant) {
      return errorResponse(404, 'Assistant not found');
    }

    return successResponse(200, assistant);
  } catch (error) {
    console.error('Error getting assistant:', error);
    return errorResponse(500, 'Failed to get assistant');
  }
}

/**
 * Update assistant
 */
async function updateAssistant(
  tenantId: string,
  username: string,
  assistantId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Check if assistant exists
    const existing = await assistantRepo.findAssistantById(
      username,
      assistantId,
      event
    );

    if (!existing) {
      return errorResponse(404, 'Assistant not found');
    }

    const request: UpdateAssistantRequest = JSON.parse(event.body || '{}');

    const updated = await assistantRepo.updateAssistant(
      username,
      assistantId,
      request,
      event
    );

    // If knowledge sources or S3 URLs changed, trigger re-indexing
    if (
      updated.ragEnabled &&
      (request.knowledgeSources !== undefined || request.s3Urls !== undefined)
    ) {
      // Update sync status to RUNNING before re-indexing
      assistantRepo
        .updateAssistantSyncStatus(
          username,
          updated.assistantId,
          'RUNNING',
          'Re-indexing knowledge sources',
          event
        )
        .catch((err: Error) =>
          console.error('Failed to update sync status to RUNNING:', err)
        );

      // Trigger re-indexing and update status based on result
      searchRepo
        .indexKnowledgeSources(
          updated.assistantId,
          tenantId,
          updated.knowledgeSources,
          updated.s3Urls
        )
        .then(() => {
          return assistantRepo.updateAssistantSyncStatus(
            username,
            updated.assistantId,
            'SYNCED',
            'Knowledge sources re-indexed successfully',
            event
          );
        })
        .catch((err: Error) => {
          console.error('Re-indexing error:', err);
          return assistantRepo
            .updateAssistantSyncStatus(
              username,
              updated.assistantId,
              'FAILED',
              err.message,
              event
            )
            .catch((statusErr: Error) =>
              console.error('Failed to update sync status to FAILED:', statusErr)
            );
        });
    }

    return successResponse(200, updated);
  } catch (error) {
    console.error('Error updating assistant:', error);
    return errorResponse(500, 'Failed to update assistant');
  }
}

/**
 * Delete assistant
 */
async function deleteAssistant(
  tenantId: string,
  username: string,
  assistantId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Check if assistant exists
    const existing = await assistantRepo.findAssistantById(
      username,
      assistantId,
      event
    );

    if (!existing) {
      return errorResponse(404, 'Assistant not found');
    }

    // Delete assistant
    await assistantRepo.deleteAssistant(username, assistantId, event);

    // Delete associated messages
    await messageRepo
      .deleteMessagesForAssistant(username, assistantId, event)
      .catch((err: Error) => console.error('Error deleting messages:', err));

    // Delete knowledge base index if RAG was enabled
    if (existing.ragEnabled) {
      await searchRepo
        .deleteVectorStore(assistantId, tenantId)
        .catch((err: Error) => console.error('Error deleting index:', err));
    }

    return successResponse(200, { message: 'Assistant deleted successfully' });
  } catch (error) {
    console.error('Error deleting assistant:', error);
    return errorResponse(500, 'Failed to delete assistant');
  }
}

/**
 * Main handler
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Assistant handler invoked', {
    method: event.httpMethod,
    path: event.path,
    pathParameters: event.pathParameters,
  });

  try {
    // Extract tenant context
    const tenantId = getTenantId(event);
    const username = getUsername(event);

    // Route based on HTTP method and path
    const method = event.httpMethod;
    const assistantId = event.pathParameters?.assistantId;

    if (method === 'POST' && !assistantId) {
      return await createAssistant(tenantId, username, event);
    } else if (method === 'GET' && !assistantId) {
      return await listAssistants(username, event);
    } else if (method === 'GET' && assistantId) {
      return await getAssistant(username, assistantId, event);
    } else if (method === 'PUT' && assistantId) {
      return await updateAssistant(tenantId, username, assistantId, event);
    } else if (method === 'DELETE' && assistantId) {
      return await deleteAssistant(tenantId, username, assistantId, event);
    }

    return errorResponse(404, 'Not found');
  } catch (error) {
    console.error('Error in assistant handler:', error);
    return errorResponse(500, 'Internal server error');
  }
};
