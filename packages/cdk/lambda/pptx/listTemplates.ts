import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { findTemplatesByTenant } from './pptxRepository';
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
    const includePublic =
      event.queryStringParameters?.include_public !== 'false';
    const userOnly = event.queryStringParameters?.user_only === 'true';
    const limit = Math.min(
      parseInt(event.queryStringParameters?.limit || '20'),
      100
    );
    const offset = Math.max(
      parseInt(event.queryStringParameters?.offset || '0'),
      0
    );

    // Query templates
    const templates = await findTemplatesByTenant(
      event,
      userOnly ? userId : undefined,
      includePublic,
      limit + 1, // Get one extra to check if there are more
      offset
    );

    const hasMore = templates.length > limit;
    if (hasMore) {
      templates.pop(); // Remove the extra item
    }

    // Convert to response format
    const responseTemplates = templates.map((template) => ({
      template_id: template.templateId,
      tenant_id: template.tenantId,
      user_id: template.userId,
      template_name: template.templateName,
      template_description: template.templateDescription,
      s3_key: template.s3Key,
      thumbnail_s3_key: template.thumbnailS3Key,
      is_public: template.isPublic === 'true',
      tags: template.tags,
      created_at: template.createdAt,
      updated_at: template.updatedAt,
    }));

    const response = {
      templates: responseTemplates,
      total_count: responseTemplates.length,
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
    console.error('Error listing templates:', error);
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
