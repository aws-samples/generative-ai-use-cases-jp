import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { findGenerationById } from './pptxRepository';
import { getPptxDownloadUrl } from './pptxService';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get user info from Cognito
    const userId = event.requestContext.authorizer?.claims['cognito:username'];
    const tenantId = event.requestContext.authorizer?.claims['custom:tenant_id'];
    
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

    // Get generation ID from path parameters
    const generationId = event.pathParameters?.generationId;
    
    if (!generationId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Generation ID is required' }),
      };
    }

    // Find the generation
    const generation = await findGenerationById(event, generationId);
    
    if (!generation) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Generation not found' }),
      };
    }

    // Check permission - only owner can view
    if (generation.userId !== userId) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Not authorized to view this generation' }),
      };
    }

    // Generate download URL if generation is completed
    let downloadUrl = null;
    if (generation.status === 'completed' && generation.s3OutputKey) {
      try {
        downloadUrl = await getPptxDownloadUrl(event, tenantId, generation.s3OutputKey);
      } catch (error) {
        console.error('Error generating download URL:', error);
        // Continue without download URL - don't fail the request
      }
    }

    // Convert to response format
    const response = {
      generation_id: generation.generationId,
      status: generation.status,
      progress: undefined, // Could be added later for real-time progress tracking
      message: generation.status === 'failed' ? generation.errorMessage : undefined,
      download_url: downloadUrl,
      error_message: generation.errorMessage,
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
    console.error('Error getting generation status:', error);
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