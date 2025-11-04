import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { IsFavorite } from 'generative-ai-use-cases';
import { toggleFavorite } from './useCaseBuilderRepository';
import { getUsername } from '../utils/tenantUtils';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUsername(event);
    const useCaseId = event.pathParameters!.useCaseId!;

    const isFavorite: IsFavorite = await toggleFavorite(
      userId,
      useCaseId,
      event
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(isFavorite),
    };
  } catch (error) {
    console.log(error);
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
