import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { toggleShared } from './useCaseBuilderRepository';
import { IsShared } from 'generative-ai-use-cases';
import { getUsername } from '../utils/tenantUtils';
import {
  internalServerError500Response,
  ok200Response,
} from '../utils/apiResponse';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUsername(event);
    const useCaseId = event.pathParameters!.useCaseId!;

    const isShared: IsShared = await toggleShared(userId, useCaseId, event);

    return ok200Response(isShared);
  } catch (error) {
    console.log(error);
    return internalServerError500Response({ message: 'Internal Server Error' });
  }
};
