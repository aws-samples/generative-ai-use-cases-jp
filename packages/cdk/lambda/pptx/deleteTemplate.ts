import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { findTemplateById, deleteTemplateById } from './pptxRepository';
import { getUsername, getTenantId } from '../utils/tenantUtils';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get user info from Cognito
    const userId = getUsername(event);
    const tenantId = getTenantId(event);
    // Check admin status from flat context (Lambda Request Authorizer)
    const isAdmin = event.requestContext.authorizer?.['custom:is_admin'] === 'true';
    
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

    // Get template ID from path parameters
    const templateId = event.pathParameters?.templateId;
    
    if (!templateId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Template ID is required' }),
      };
    }

    // Find the template to check permissions
    const template = await findTemplateById(event, templateId);

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

    // Check permission - only owner or admin can delete
    if (template.userId !== userId && !isAdmin) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Not authorized to delete this template' }),
      };
    }

    // Delete the template
    await deleteTemplateById(event, templateId);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Template deleted successfully' }),
    };

  } catch (error) {
    console.error('Error deleting template:', error);
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