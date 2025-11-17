import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUseCase } from './useCaseBuilderRepository';
import { getUsername } from '../utils/tenantUtils';
import {
  internalServerError500Response,
  notFound404Response,
  ok200Response,
} from '../utils/apiResponse';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUsername(event);
    const useCaseId = event.pathParameters!.useCaseId!;

    const useCase = await getUseCase(userId, useCaseId, event);

    if (!useCase) {
      return notFound404Response({ message: 'Use case not found' });
    }

    return ok200Response(useCase);
  } catch (error) {
    console.log(error);
    return internalServerError500Response({ message: 'Internal Server Error' });
  }
};
