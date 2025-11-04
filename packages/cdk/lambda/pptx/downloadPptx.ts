import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { findGenerationById } from './pptxRepository';
import { getPptxDownloadUrl } from './pptxService';
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

    // Check permission - only owner can download
    if (generation.userId !== userId) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Not authorized to download this generation' }),
      };
    }

    // Check if generation is completed and has output
    if (generation.status !== 'completed' || !generation.s3OutputKey) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          message: 'Generation not completed or no output available' 
        }),
      };
    }

    // Generate download URL
    const downloadUrl = await getPptxDownloadUrl(event, tenantId, generation.s3OutputKey);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ download_url: downloadUrl }),
    };

  } catch (error) {
    console.error('Error getting download URL:', error);
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