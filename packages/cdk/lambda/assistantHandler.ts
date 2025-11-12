import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  createAssistant,
  listAssistants,
  getAssistant,
  updateAssistant,
  deleteAssistant,
  updateKnowledgeSourceStatus,
  updateAssistantSyncStatus,
} from './repository/assistant';
import { deleteMessagesForAssistant } from './repository/assistantMessage';
import {
  loadDocuments,
  chunkDocuments,
  addMetadata,
} from './utils/documentLoader';
import {
  indexDocuments,
  deleteAssistantDocuments,
} from './repository/assistantSearch';
import {
  Assistant,
  CreateAssistantRequest,
  UpdateAssistantRequest,
  ListAssistantsResponse,
} from 'generative-ai-use-cases';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

/**
 * Helper function to strip the "assistant#" prefix from assistantId
 * Internal storage uses "assistant#<uuid>" format, but API returns clean UUID
 * Handles multiple prefixes defensively (e.g., "assistant#assistant#uuid" -> "uuid")
 */
function stripAssistantPrefix(assistant: Assistant): Assistant {
  return {
    ...assistant,
    assistantId: assistant.assistantId.replace(/^(assistant#)+/, ''),
  };
}

/**
 * Consolidated handler for all assistant CRUD operations
 * Routes based on HTTP method and path:
 * - POST / → create assistant
 * - GET / → list assistants
 * - GET /{assistantId} → get assistant
 * - PUT /{assistantId} → update assistant
 * - DELETE /{assistantId} → delete assistant
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId: string =
      event.requestContext.authorizer!.claims['cognito:username'];
    const method = event.httpMethod;
    const assistantId = event.pathParameters?.assistantId;

    // Route based on HTTP method and path
    switch (method) {
      case 'POST':
        return await handleCreate(userId, event);

      case 'GET':
        if (assistantId) {
          return await handleGet(userId, assistantId, event);
        } else {
          return await handleList(userId, event);
        }

      case 'PUT':
        if (!assistantId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Missing assistantId' }),
          };
        }
        return await handleUpdate(userId, assistantId, event);

      case 'DELETE':
        if (!assistantId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Missing assistantId' }),
          };
        }
        return await handleDelete(userId, assistantId, event);

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ message: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('Error in assistant handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};

/**
 * Handle POST / - Create assistant
 */
async function handleCreate(
  userId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body: CreateAssistantRequest = JSON.parse(event.body || '{}');

  console.log(
    `Creating assistant: ragEnabled=${body.ragEnabled}, knowledgeSources=${body.knowledgeSources?.length || 0}`
  );

  // Basic validation
  if (!body.name || !body.instruction || !body.modelId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        message: 'Missing required fields: name, instruction, modelId',
      }),
    };
  }

  const assistant = await createAssistant(userId, body, event);

  // If RAG is enabled, process knowledge sources and update status
  if (body.ragEnabled) {
    console.log(`RAG is enabled, checking knowledge sources...`);
    // If knowledge sources are provided, ingest documents
    if (body.knowledgeSources && body.knowledgeSources.length > 0) {
      const cleanAssistantId = assistant.assistantId.replace('assistant#', '');

      // Process each knowledge source individually to track status per-source
      for (const source of body.knowledgeSources) {
      try {
        console.log(
          `Processing knowledge source ${source.id} (type=${source.type}, storageKey=${source.storageKey}) for assistant ${cleanAssistantId}`
        );

        // Update status to SYNCING
        await updateKnowledgeSourceStatus(
          assistant,
          source.id,
          'SYNCING',
          undefined,
          event
        );

        // Load document for this source
        const documents = await loadDocuments([source], userId, event);

        // Chunk documents
        const chunks = await chunkDocuments(documents, 1000, 200);

        // Add metadata
        const docsWithMetadata = addMetadata(chunks, cleanAssistantId, userId);

        // Index to OpenSearch
        await indexDocuments(cleanAssistantId, docsWithMetadata, event);

        // Update status to SUCCEEDED
        await updateKnowledgeSourceStatus(
          assistant,
          source.id,
          'SUCCEEDED',
          undefined,
          event
        );

        console.log(
          `Successfully ingested knowledge source ${source.id} for assistant ${cleanAssistantId}`
        );
      } catch (error) {
        console.error(
          `Error ingesting knowledge source ${source.id}:`,
          error
        );

        // Update status to FAILED with detailed error message
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
          errorMessage = error.message;

          // Extract additional details from OpenSearch ResponseError
          if ('meta' in error && error.meta) {
            const meta = error.meta as any;
            if (meta.statusCode) {
              errorMessage = `${error.message} (HTTP ${meta.statusCode})`;
            }
            if (meta.body && meta.body.Message) {
              // AWS IAM error message format
              errorMessage += `: ${meta.body.Message}`;
            } else if (meta.body && meta.body.error) {
              // OpenSearch error format
              if (typeof meta.body.error === 'string') {
                errorMessage += `: ${meta.body.error}`;
              } else if (meta.body.error.reason) {
                errorMessage += `: ${meta.body.error.reason}`;
              }
            }
          }
        }

        await updateKnowledgeSourceStatus(
          assistant,
          source.id,
          'FAILED',
          errorMessage,
          event
        ).catch((statusError) => {
          // Don't fail if status update fails
          console.error('Failed to update source status:', statusError);
        });

        // Don't fail the assistant creation if one source fails
        // Continue processing other sources
      }
      }
    } else {
      console.log(
        `No knowledge sources provided (knowledgeSources=${body.knowledgeSources?.length || 0})`
      );
    }

    // After all sources are processed (or if no sources), update overall assistant status
    await updateAssistantSyncStatus(assistant, event);
  } else {
    console.log(`RAG is not enabled`);
  }

  // Note: updateAssistantSyncStatus updates assistant.syncStatus in memory
  return {
    statusCode: 201,
    headers,
    body: JSON.stringify(stripAssistantPrefix(assistant)),
  };
}

/**
 * Handle GET / - List assistants
 */
async function handleList(
  userId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const exclusiveStartKey = event.queryStringParameters?.exclusiveStartKey;

  const result = await listAssistants(userId, event, exclusiveStartKey);

  // Strip prefix from all assistants
  const sanitizedResult: ListAssistantsResponse = {
    ...result,
    assistants: result.assistants.map(stripAssistantPrefix),
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(sanitizedResult),
  };
}

/**
 * Handle GET /{assistantId} - Get assistant
 */
async function handleGet(
  userId: string,
  assistantId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const assistant = await getAssistant(assistantId, event);

  if (!assistant) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Assistant not found' }),
    };
  }

  // Verify ownership (userId is stored with 'user#' prefix)
  if (assistant.userId !== `user#${userId}`) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ message: 'Forbidden' }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(stripAssistantPrefix(assistant)),
  };
}

/**
 * Handle PUT /{assistantId} - Update assistant
 */
async function handleUpdate(
  userId: string,
  assistantId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body: UpdateAssistantRequest = JSON.parse(event.body || '{}');

  try {
    const assistant = await updateAssistant(assistantId, userId, body, event);

    // If knowledge sources were updated and RAG is enabled, re-index documents
    if (body.knowledgeSources !== undefined && assistant.ragEnabled) {
      console.log(`Re-indexing documents for assistant ${assistantId}`);

      // KNOWN LIMITATION: We delete old documents before indexing new ones.
      // If ALL sources fail to index, the assistant will have no documents.
      // Proper solutions would require:
      // 1. Adding sync timestamps to documents and deleting only older versions
      // 2. Implementing async job queue with rollback capability
      // 3. Using temporary index with atomic swap
      await deleteAssistantDocuments(assistantId, event);

      // If new knowledge sources are provided, index them
      if (body.knowledgeSources && body.knowledgeSources.length > 0) {
        let hasAnySuccess = false;
        let lastError: Error | undefined;

        // Process each knowledge source individually to track status per-source
        for (const source of body.knowledgeSources) {
          try {
            console.log(
              `Processing knowledge source ${source.id} for assistant ${assistantId}`
            );

            // Update status to SYNCING
            await updateKnowledgeSourceStatus(
              assistant,
              source.id,
              'SYNCING',
              undefined,
              event
            );

            // Load document for this source
            const documents = await loadDocuments([source], userId, event);

            // Chunk documents
            const chunks = await chunkDocuments(documents, 1000, 200);

            // Add metadata
            const docsWithMetadata = addMetadata(chunks, assistantId, userId);

            // Index to OpenSearch
            await indexDocuments(assistantId, docsWithMetadata, event);

            // Update status to SUCCEEDED
            await updateKnowledgeSourceStatus(
              assistant,
              source.id,
              'SUCCEEDED',
              undefined,
              event
            );

            hasAnySuccess = true;
            console.log(
              `Successfully re-indexed knowledge source ${source.id} for assistant ${assistantId}`
            );
          } catch (error) {
            console.error(
              `Error re-indexing knowledge source ${source.id}:`,
              error
            );

            // Update status to FAILED with error message
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            await updateKnowledgeSourceStatus(
              assistant,
              source.id,
              'FAILED',
              errorMessage,
              event
            ).catch((statusError) => {
              // Don't fail if status update fails
              console.error('Failed to update source status:', statusError);
            });

            lastError = error instanceof Error ? error : new Error('Unknown error');
          }
        }

        // After all sources are processed, update overall assistant status
        await updateAssistantSyncStatus(assistant, event);

        // If all sources failed, throw error to surface to user
        if (!hasAnySuccess && lastError) {
          throw new Error(
            `Failed to re-index all knowledge sources. Last error: ${lastError.message}`
          );
        }
      } else {
        console.log(
          `Cleared all documents for assistant ${assistantId} (no new sources)`
        );

        // Update status even when clearing all documents
        await updateAssistantSyncStatus(assistant, event);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(stripAssistantPrefix(assistant)),
    };
  } catch (error: any) {
    if (error.message === 'Assistant not found') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Assistant not found' }),
      };
    }
    if (error.message === 'Unauthorized') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ message: 'Forbidden' }),
      };
    }
    throw error;
  }
}

/**
 * Handle DELETE /{assistantId} - Delete assistant
 */
async function handleDelete(
  userId: string,
  assistantId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Delete assistant first (verifies ownership)
    await deleteAssistant(assistantId, userId, event);

    // Delete all messages after ownership verification
    await deleteMessagesForAssistant(assistantId, event);

    // Delete all indexed documents from OpenSearch
    try {
      await deleteAssistantDocuments(assistantId, event);
      console.log(
        `Deleted OpenSearch documents for assistant ${assistantId}`
      );
    } catch (error) {
      console.error('Error deleting OpenSearch documents:', error);
      // Don't fail the deletion if OpenSearch cleanup fails
    }

    return {
      statusCode: 204,
      headers,
      body: '',
    };
  } catch (error: any) {
    if (error.message === 'Assistant not found') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Assistant not found' }),
      };
    }
    if (error.message === 'Unauthorized') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ message: 'Forbidden' }),
      };
    }
    throw error;
  }
}
