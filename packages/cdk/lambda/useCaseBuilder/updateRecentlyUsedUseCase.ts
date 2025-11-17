import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { updateRecentlyUsedUseCase } from './useCaseBuilderRepository';
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

    await updateRecentlyUsedUseCase(userId, useCaseId, event);

    return ok200Response();
  } catch (error) {
    console.log(error);
    return internalServerError500Response({ message: 'Internal Server Error' });
  }
};
