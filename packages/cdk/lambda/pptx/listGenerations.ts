import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { findGenerationsByUser } from './pptxRepository';
import { getUsername, getTenantId } from '../utils/tenantUtils';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get user info from Cognito
    const userId = getUsername(event);
    const tenantId = getTenantId(event);
    
    if (!userId || !tenantId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Unauthorized' }),
      };
    }

    // Parse query parameters
    const limit = Math.min(parseInt(event.queryStringParameters?.limit || '20'), 100);
    const offset = Math.max(parseInt(event.queryStringParameters?.offset || '0'), 0);

    // Query generations
    const generations = await findGenerationsByUser(
      event,
      userId,
      limit + 1, // Get one extra to check if there are more
      offset
    );

    const hasMore = generations.length > limit;
    if (hasMore) {
      generations.pop(); // Remove the extra item
    }

    // Convert to response format
    const responseGenerations = generations.map(generation => ({
      generation_id: generation.generationId,
      user_id: generation.userId,
      chat_id: generation.chatId,
      template_id: generation.templateId,
      status: generation.status,
      s3_output_key: generation.s3OutputKey,
      download_url: generation.s3OutputKey ? undefined : null, // Would need to generate on demand
      error_message: generation.errorMessage,
      slides: generation.slides,
      created_at: generation.createdAt,
      updated_at: generation.updatedAt,
      expires_at: generation.ttl ? new Date(generation.ttl * 1000).toISOString() : undefined,
    }));

    const response = {
      generations: responseGenerations,
      total_count: responseGenerations.length,
      has_more: hasMore,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('Error listing generations:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};