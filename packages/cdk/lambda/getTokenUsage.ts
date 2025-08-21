import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { aggregateTokenUsage } from './repository';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Getting token usage statistics', { event });

    // Get user ID from Cognito
    const userId = event.requestContext.authorizer!.claims['cognito:username'];
    const { startDate, endDate } = event.queryStringParameters || {};

    if (!startDate || !endDate) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'startDate and endDate parameters are required',
        }),
      };
    }

    // Get aggregated data for the specified period
    const stats = await aggregateTokenUsage(startDate, endDate, event, [
      userId,
    ]);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(stats),
    };
  } catch (error) {
    console.error('Error getting token usage statistics:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
