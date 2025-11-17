import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { aggregateTokenUsage } from './repository';
import { getUsername } from './utils/tenantUtils';
import {
  badRequest400Response,
  internalServerError500Response,
  ok200Response,
} from './utils/apiResponse';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Getting token usage statistics', { event });

    // Get user ID from Cognito
    const userId = getUsername(event);
    const { startDate, endDate } = event.queryStringParameters || {};

    if (!startDate || !endDate) {
      return badRequest400Response({
        message: 'startDate and endDate parameters are required',
      });
    }

    // Get aggregated data for the specified period
    const stats = await aggregateTokenUsage(startDate, endDate, event, [
      userId,
    ]);

    return ok200Response(stats);
  } catch (error) {
    console.error('Error getting token usage statistics:', error);
    return internalServerError500Response({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
