import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuid4 } from 'uuid';
import { createGeneration, findTemplateById } from './pptxRepository';
import { startPptxGeneration, validateSlideCount, validateInstructions } from './pptxService';
import { getUsername, getTenantId } from '../utils/tenantUtils';

interface GenerateRequest {
  template_id?: string;
  chat_id?: string;
  instructions: string;
  slide_count?: number;
  include_title_slide?: boolean;
  include_summary_slide?: boolean;
  model_id?: string;
}

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

    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Request body is required' }),
      };
    }

    const generationInput: GenerateRequest = JSON.parse(event.body);

    // Validate input
    if (!generationInput.instructions) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Instructions are required' }),
      };
    }

    if (!validateInstructions(generationInput.instructions)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'Instructions must be between 1 and 5000 characters'
        }),
      };
    }

    if (!validateSlideCount(generationInput.slide_count)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'Slide count must be between 1 and 50'
        }),
      };
    }

    // Validate template exists if provided
    let template = null;
    if (generationInput.template_id) {
      template = await findTemplateById(event, generationInput.template_id);
      if (!template) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ message: 'Template not found' }),
        };
      }

      // Check if user has access to template
      if (template.isPublic !== 'true' &&
        template.userId !== userId &&
        template.tenantId !== tenantId) {
        return {
          statusCode: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ message: 'Not authorized to use this template' }),
        };
      }
    }

    // Generate generation ID and create generation record
    const generationId = uuid4();

    const generation = await createGeneration(
      event,
      generationId,
      userId,
      generationInput.chat_id,
      generationInput.template_id,
      generationInput.instructions,
      generationInput.slide_count,
      generationInput.include_title_slide ?? true,
      generationInput.include_summary_slide ?? false,
      generationInput.model_id
    );

    // Start async generation process
    await startPptxGeneration(
      generationId,
      userId,
      tenantId,
      generationInput.instructions,
      generationInput.chat_id,
      generationInput.template_id,
      template?.s3Key,
      generationInput.slide_count,
      generationInput.include_title_slide ?? true,
      generationInput.include_summary_slide ?? false,
      generationInput.model_id
    );

    // Convert to response format
    const response = {
      generation_id: generation.generationId,
      user_id: generation.userId,
      chat_id: generation.chatId,
      template_id: generation.templateId,
      status: generation.status,
      s3_output_key: generation.s3OutputKey,
      download_url: generation.s3OutputKey ? undefined : null, // Will be provided when completed
      error_message: generation.errorMessage,
      slides: generation.slides,
      created_at: generation.createdAt,
      updated_at: generation.updatedAt,
      expires_at: generation.ttl ? new Date(generation.ttl * 1000).toISOString() : undefined,
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
    console.error('Error generating PPTX:', error);
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
